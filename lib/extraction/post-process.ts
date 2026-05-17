import {
  confidenceFromGovernmentWarningCompleteness,
  finalizeGovernmentWarningExtraction,
  scoreGovernmentWarningCompleteness,
} from "@/lib/extraction/government-warning";
import type { ExtractionResult } from "@/lib/extraction/types";

/** Normalize extraction fields after any provider (OpenAI, OCR, cache replay). */
export function applyExtractionPostProcessing(extraction: ExtractionResult): ExtractionResult {
  const warning = extraction.fields.governmentWarning;
  const raw = warning.value?.trim();
  if (!raw) return extraction;

  const finalized = finalizeGovernmentWarningExtraction(raw);
  const completeness = scoreGovernmentWarningCompleteness(finalized);
  const completenessCap = confidenceFromGovernmentWarningCompleteness(completeness.score);
  const cappedConfidence = Math.min(warning.confidence, completenessCap);

  const valueChanged = finalized !== warning.value;
  const confidenceChanged = cappedConfidence !== warning.confidence;
  if (!valueChanged && !confidenceChanged) return extraction;

  return {
    ...extraction,
    fields: {
      ...extraction.fields,
      governmentWarning: {
        ...warning,
        value: finalized,
        confidence: cappedConfidence,
        ...(confidenceChanged && !warning.reason
          ? {
              reason: `Government warning completeness score ${completeness.score.toFixed(2)} (${completeness.matchedSignals}/${completeness.signalCount} signals).`,
            }
          : {}),
      },
    },
  };
}
