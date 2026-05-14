import { extractWithFailover } from "@/lib/extraction/provider";
import {
  type ExtractionMode,
  shouldUseLlmFallback,
} from "@/lib/extraction/hybrid-routing";
import { createOpenAIProvider } from "@/lib/extraction/openai-provider";
import { createTesseractProvider } from "@/lib/extraction/tesseract-provider";
import { createUnavailableFallbackProvider } from "@/lib/extraction/unavailable-fallback-provider";
import type { ExtractionResult } from "@/lib/extraction/types";
import { assessImageQuality } from "@/lib/image-quality";
import {
  type ApplicationJson,
  type FieldId,
  VerifySuccessResponseSchema,
  type VerifySuccessResponse,
} from "@/lib/schemas";
import { validateLabelFields } from "@/lib/validator";

const MAX_EXTRACT_TIMEOUT_MS = 120_000;
const DEFAULT_EXTRACTION_MODE: ExtractionMode = "hybrid";
const DEFAULT_OCR_MIN_CRITICAL_FIELDS_PRESENT = 3;
const DEFAULT_OCR_MIN_MEAN_CONFIDENCE = 0.58;
const DEFAULT_OCR_MIN_REQUIRED_FIELD_CONFIDENCE = 0.52;
const OCR_CRITICAL_FIELDS: FieldId[] = [
  "brandName",
  "classType",
  "alcoholContent",
  "netContents",
  "governmentWarning",
];
const OCR_REQUIRED_FIELDS_FOR_NO_ESCALATION: FieldId[] = [
  "classType",
  "alcoholContent",
  "netContents",
];

function readExtractTimeoutMs(envKey: string): number | undefined {
  const raw = process.env[envKey]?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.min(Math.floor(n), MAX_EXTRACT_TIMEOUT_MS);
}

/** Env overrides for extraction budgets (`VERIFY_EXTRACT_*`). Unset means "no forced timeout". */
function resolveExtractFailoverTimeouts(): { softTimeoutMs?: number; hardTimeoutMs?: number } {
  const soft = readExtractTimeoutMs("VERIFY_EXTRACT_SOFT_TIMEOUT_MS");
  let hard = readExtractTimeoutMs("VERIFY_EXTRACT_HARD_TIMEOUT_MS");

  if (soft !== undefined && hard !== undefined && hard <= soft) {
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
      softTimeoutMs: soft ?? null,
      hardTimeoutMs: hard ?? null,
    });
  }

  return { softTimeoutMs: soft, hardTimeoutMs: hard };
}

function resolveExtractionMode(): ExtractionMode {
  const raw = process.env.VERIFY_EXTRACTION_MODE?.trim().toLowerCase();
  if (raw === "hybrid" || raw === "llm_only" || raw === "ocr_only") return raw;
  return DEFAULT_EXTRACTION_MODE;
}

function resolveMinCriticalFieldsPresent(): number {
  const raw = Number(process.env.VERIFY_OCR_MIN_CRITICAL_FIELDS_PRESENT);
  if (Number.isInteger(raw) && raw >= 1 && raw <= OCR_CRITICAL_FIELDS.length) return raw;
  return DEFAULT_OCR_MIN_CRITICAL_FIELDS_PRESENT;
}

function resolveMinMeanCriticalConfidence(): number {
  const raw = Number(process.env.VERIFY_OCR_MIN_MEAN_CONFIDENCE);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 1) return raw;
  return DEFAULT_OCR_MIN_MEAN_CONFIDENCE;
}

function resolveMinRequiredFieldConfidence(): number {
  const raw = Number(process.env.VERIFY_OCR_MIN_REQUIRED_FIELD_CONFIDENCE);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 1) return raw;
  return DEFAULT_OCR_MIN_REQUIRED_FIELD_CONFIDENCE;
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

type VerifyExtractionTimings = {
  imageQualityMs: number;
  ocrMs: number;
  llmMs: number;
  extractionMs: number;
};

export type VerifyExtractionStageResult = {
  imageQuality: { ok: true };
  extraction: ExtractionResult;
  timings: VerifyExtractionTimings;
};

export function resolveVerifyExtractionMode(): ExtractionMode {
  return resolveExtractionMode();
}

export async function runExtractionStage(params: {
  requestId: string;
  imageBytes: Buffer;
  openAiApiKey: string;
}): Promise<VerifyExtractionStageResult> {
  const { requestId, imageBytes, openAiApiKey } = params;
  const { softTimeoutMs, hardTimeoutMs } = resolveExtractFailoverTimeouts();
  const extractionMode = resolveExtractionMode();
  const minCriticalFieldsPresent = resolveMinCriticalFieldsPresent();
  const minMeanCriticalConfidence = resolveMinMeanCriticalConfidence();
  const minRequiredFieldConfidence = resolveMinRequiredFieldConfidence();

  const imageQualityStarted = Date.now();
  const iq = await assessImageQuality(imageBytes);
  const imageQualityMs = Date.now() - imageQualityStarted;
  if (!iq.ok) {
    throw new VerifyFailedError(422, "IMAGE_QUALITY_REJECTED", iq.reason);
  }

  const extractionStarted = Date.now();
  let ocrMs = 0;
  let llmMs = 0;

  const openAiProvider = createOpenAIProvider(openAiApiKey);
  const unavailableFallback = createUnavailableFallbackProvider();
  const ocrProvider = createTesseractProvider();

  const extractViaLlm = async () => {
    const llmStarted = Date.now();
    try {
      return await extractWithFailover(
        iq.processedBuffer,
        openAiProvider,
        unavailableFallback,
        { softTimeoutMs, hardTimeoutMs, requestId },
      );
    } finally {
      llmMs += Date.now() - llmStarted;
    }
  };

  let extraction;
  try {
    if (extractionMode === "llm_only") {
      extraction = await extractViaLlm();
    } else {
      let ocrExtraction;
      const ocrStarted = Date.now();
      try {
        ocrExtraction = await ocrProvider.extract(iq.processedBuffer);
      } catch (ocrErr) {
        const message =
          ocrErr instanceof Error ? ocrErr.message : typeof ocrErr === "string" ? ocrErr : String(ocrErr);
        console.warn("[verify-pipeline] OCR extraction failed", { requestId, message });
      } finally {
        ocrMs += Date.now() - ocrStarted;
      }

      if (!ocrExtraction) {
        if (extractionMode === "ocr_only") {
          extraction = await unavailableFallback.extract(iq.processedBuffer);
        } else {
          extraction = await extractViaLlm();
        }
      } else if (extractionMode === "ocr_only") {
        extraction = ocrExtraction;
      } else {
        const decision = shouldUseLlmFallback(ocrExtraction, {
          criticalFields: OCR_CRITICAL_FIELDS,
          minCriticalFieldsPresent,
          minMeanCriticalConfidence,
          requiredFieldsForNoEscalation: OCR_REQUIRED_FIELDS_FOR_NO_ESCALATION,
          minRequiredFieldConfidence,
        });
        if (decision.useLlmFallback) {
          console.info("[verify-pipeline] escalating from OCR to LLM", {
            requestId,
            reason: decision.reason,
            missingCriticalFields: decision.missingCriticalFields,
            missingRequiredFields: decision.missingRequiredFields,
            lowConfidenceRequiredFields: decision.lowConfidenceRequiredFields,
            presentCriticalCount: decision.presentCriticalCount,
            meanCriticalConfidence: decision.meanCriticalConfidence,
            minCriticalFieldsPresent,
            minMeanCriticalConfidence,
            minRequiredFieldConfidence,
          });
          extraction = await extractViaLlm();
        } else {
          extraction = ocrExtraction;
          console.info("[verify-pipeline] accepted OCR extraction", {
            requestId,
            requiredFieldsForNoEscalation: OCR_REQUIRED_FIELDS_FOR_NO_ESCALATION,
            presentCriticalCount: decision.presentCriticalCount,
            meanCriticalConfidence: decision.meanCriticalConfidence,
          });
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Extraction failed";
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

  return {
    imageQuality: { ok: true },
    extraction,
    timings: {
      imageQualityMs,
      ocrMs,
      llmMs,
      extractionMs: Date.now() - extractionStarted,
    },
  };
}

export function buildVerifySuccessResponse(params: {
  requestId: string;
  application: ApplicationJson;
  extraction: ExtractionResult;
  imageQuality: { ok: true };
  extractionTimings: VerifyExtractionTimings;
  cacheHit: boolean;
  startedAtMs?: number;
}): VerifySuccessResponse {
  const {
    requestId,
    application,
    extraction,
    imageQuality,
    extractionTimings,
    cacheHit,
    startedAtMs = Date.now(),
  } = params;
  const validationStarted = Date.now();
  const validationFields = validateLabelFields(extraction, application);
  const validationMs = Date.now() - validationStarted;

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
    imageQuality,
    extraction: {
      provider: extraction.provider,
      durationMs: extraction.durationMs,
      fields: extractionFields,
    },
    validation: { fields: validationFields },
    timings: {
      imageQualityMs: extractionTimings.imageQualityMs,
      ocrMs: extractionTimings.ocrMs,
      llmMs: extractionTimings.llmMs,
      extractionMs: extractionTimings.extractionMs,
      validationMs,
      totalMs: Math.max(0, Date.now() - startedAtMs),
      cacheHit,
    },
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

export async function runVerifyPipeline(params: {
  requestId: string;
  imageBytes: Buffer;
  application: ApplicationJson;
  openAiApiKey: string;
}): Promise<VerifySuccessResponse> {
  const { requestId, imageBytes, application, openAiApiKey } = params;
  const pipelineStarted = Date.now();
  const extractionMode = resolveExtractionMode();
  const minCriticalFieldsPresent = resolveMinCriticalFieldsPresent();
  const minMeanCriticalConfidence = resolveMinMeanCriticalConfidence();
  const minRequiredFieldConfidence = resolveMinRequiredFieldConfidence();
  const { softTimeoutMs, hardTimeoutMs } = resolveExtractFailoverTimeouts();

  const extractionStage = await runExtractionStage({
    requestId,
    imageBytes,
    openAiApiKey,
  });

  const response = buildVerifySuccessResponse({
    requestId,
    application,
    extraction: extractionStage.extraction,
    imageQuality: extractionStage.imageQuality,
    extractionTimings: extractionStage.timings,
    cacheHit: false,
    startedAtMs: pipelineStarted,
  });

  console.info("[verify-pipeline] pipeline completed", {
    requestId,
    pipelineMs: Date.now() - pipelineStarted,
    extractionProvider: response.extraction.provider,
    extractionDurationMs: response.extraction.durationMs,
    extractionMode,
    minCriticalFieldsPresent,
    minMeanCriticalConfidence,
    minRequiredFieldConfidence,
    softTimeoutMs,
    hardTimeoutMs,
    cacheHit: response.timings.cacheHit,
    imageQualityMs: response.timings.imageQualityMs,
    ocrMs: response.timings.ocrMs,
    llmMs: response.timings.llmMs,
    validationMs: response.timings.validationMs,
  });

  return response;
}
