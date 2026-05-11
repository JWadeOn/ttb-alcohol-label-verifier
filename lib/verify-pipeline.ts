import { extractWithFailover } from "@/lib/extraction/provider";
import { createOpenAIProvider } from "@/lib/extraction/openai-provider";
import { createUnavailableFallbackProvider } from "@/lib/extraction/unavailable-fallback-provider";
import { assessImageQuality } from "@/lib/image-quality";
import {
  type ApplicationJson,
  VerifySuccessResponseSchema,
  type VerifySuccessResponse,
} from "@/lib/schemas";
import { validateLabelFields } from "@/lib/validator";

const DEFAULT_EXTRACT_SOFT_MS = 3000;
const DEFAULT_EXTRACT_HARD_MS = 3500;
const MAX_EXTRACT_TIMEOUT_MS = 120_000;

function readExtractTimeoutMs(envKey: string, fallback: number): number {
  const raw = process.env[envKey]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), MAX_EXTRACT_TIMEOUT_MS);
}

/** Env overrides for local perf experiments (`VERIFY_EXTRACT_*`); defaults match PRD failover budgets. */
function resolveExtractFailoverTimeouts(): { softTimeoutMs: number; hardTimeoutMs: number } {
  const soft = readExtractTimeoutMs(
    "VERIFY_EXTRACT_SOFT_TIMEOUT_MS",
    DEFAULT_EXTRACT_SOFT_MS,
  );
  let hard = readExtractTimeoutMs(
    "VERIFY_EXTRACT_HARD_TIMEOUT_MS",
    DEFAULT_EXTRACT_HARD_MS,
  );

  if (hard <= soft) {
    const adjusted = soft + 500;
    console.warn("[verify-pipeline] VERIFY_EXTRACT_HARD_TIMEOUT_MS must exceed soft; bumping hard", {
      softTimeoutMs: soft,
      hardTimeoutMsWas: hard,
      hardTimeoutMs: adjusted,
    });
    hard = adjusted;
  }

  const softRaw = process.env.VERIFY_EXTRACT_SOFT_TIMEOUT_MS?.trim() ?? "";
  const hardRaw = process.env.VERIFY_EXTRACT_HARD_TIMEOUT_MS?.trim() ?? "";
  if (softRaw !== "" || hardRaw !== "") {
    console.info("[verify-pipeline] VERIFY_EXTRACT_* timeout overrides active", {
      softTimeoutMs: soft,
      hardTimeoutMs: hard,
    });
  }

  return { softTimeoutMs: soft, hardTimeoutMs: hard };
}

export class VerifyFailedError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VerifyFailedError";
  }
}

export async function runVerifyPipeline(params: {
  requestId: string;
  imageBytes: Buffer;
  application: ApplicationJson;
  openAiApiKey: string;
}): Promise<VerifySuccessResponse> {
  const { requestId, imageBytes, application, openAiApiKey } = params;
  const pipelineStarted = Date.now();
  const { softTimeoutMs, hardTimeoutMs } = resolveExtractFailoverTimeouts();

  const iq = await assessImageQuality(imageBytes);
  if (!iq.ok) {
    throw new VerifyFailedError(422, "IMAGE_QUALITY_REJECTED", iq.reason);
  }

  const primary = createOpenAIProvider(openAiApiKey);
  const fallback = createUnavailableFallbackProvider();

  let extraction;
  try {
    extraction = await extractWithFailover(
      iq.processedBuffer,
      primary,
      fallback,
      { softTimeoutMs, hardTimeoutMs, requestId },
    );
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Extraction failed";
    console.error("[verify-pipeline] extraction stage threw (no usable result)", {
      requestId,
      message: msg,
    });
    throw new VerifyFailedError(502, "EXTRACTION_FAILED", msg);
  }

  if (extraction.provider === "unavailable") {
    console.warn("[verify-pipeline] using placeholder extraction provider", {
      requestId,
      provider: extraction.provider,
      durationMs: extraction.durationMs,
      hint: "See preceding [extractWithFailover] log for primary OpenAI error or timeout.",
    });
  } else {
    console.info("[verify-pipeline] extraction ok", {
      requestId,
      provider: extraction.provider,
      durationMs: extraction.durationMs,
      processedImageBytes: iq.processedBuffer.length,
    });
  }

  const validationFields = validateLabelFields(extraction, application);

  const extractionFields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(extraction.fields)) {
    extractionFields[key] = {
      value: val.value,
      confidence: val.confidence,
      reason: val.reason ?? null,
    };
  }

  const body: VerifySuccessResponse = {
    requestId,
    imageQuality: { ok: true },
    extraction: {
      provider: extraction.provider,
      durationMs: extraction.durationMs,
      fields: extractionFields,
    },
    validation: { fields: validationFields },
  };

  const checked = VerifySuccessResponseSchema.safeParse(body);
  if (!checked.success) {
    console.error("Verify response schema mismatch", checked.error.flatten());
    throw new VerifyFailedError(
      500,
      "INTERNAL_ERROR",
      "Response validation failed during assembly.",
    );
  }

  console.info("[verify-pipeline] pipeline completed", {
    requestId,
    pipelineMs: Date.now() - pipelineStarted,
    extractionProvider: checked.data.extraction.provider,
    extractionDurationMs: checked.data.extraction.durationMs,
    softTimeoutMs,
    hardTimeoutMs,
  });

  return checked.data;
}
