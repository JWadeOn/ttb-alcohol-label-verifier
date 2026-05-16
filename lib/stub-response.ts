import { ensureApplicationCompliance } from "@/lib/application-compliance";
import { emptyExtractionFields } from "@/lib/extraction/types";
import type { ApplicationJson, VerifySuccessResponse } from "@/lib/schemas";
import { validateLabelFields } from "@/lib/validator";

/** Phase 0 deterministic stub — shape matches §3 contracts; validation uses real mandatory-field rules. */
export function buildStubVerifyResponse(
  requestId: string,
  application: ApplicationJson,
): VerifySuccessResponse {
  const normalized = ensureApplicationCompliance(application);
  const extraction = {
    provider: "stub" as const,
    durationMs: 0,
    fields: emptyExtractionFields(
      "Fallback OCR not configured yet — Phase 2 wires Tesseract here.",
    ),
  };

  return {
    requestId,
    imageQuality: { ok: true },
    extraction,
    validation: { fields: validateLabelFields(extraction, normalized) },
    timings: {
      imageQualityMs: 0,
      ocrMs: 0,
      llmMs: 0,
      extractionMs: 0,
      validationMs: 0,
      totalMs: 0,
      cacheHit: false,
    },
  };
}
