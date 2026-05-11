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
      { softTimeoutMs: 3000, hardTimeoutMs: 3500 },
    );
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Extraction failed";
    throw new VerifyFailedError(502, "EXTRACTION_FAILED", msg);
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

  return checked.data;
}
