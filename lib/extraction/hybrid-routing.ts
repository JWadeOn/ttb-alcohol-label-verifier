import type { ExtractionResult } from "@/lib/extraction/types";
import type { FieldId } from "@/lib/schemas";

export type ExtractionMode = "hybrid" | "llm_only" | "ocr_only";

export const HYBRID_CRITICAL_FIELDS: FieldId[] = [
  "brandName",
  "classType",
  "alcoholContent",
  "netContents",
  "governmentWarning",
];

export type HybridRoutingDecision = {
  useLlmFallback: boolean;
  reason: string;
  missingCriticalFields: FieldId[];
  missingRequiredFields: FieldId[];
  lowConfidenceRequiredFields: FieldId[];
  presentCriticalCount: number;
  meanCriticalConfidence: number;
};

export type HybridRoutingPolicy = {
  minCriticalFieldsPresent: number;
  minMeanCriticalConfidence: number;
  criticalFields?: FieldId[];
  requiredFieldsForNoEscalation: FieldId[];
  minRequiredFieldConfidence: number;
};

function isPresent(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function shouldUseLlmFallback(
  extraction: ExtractionResult,
  policy: HybridRoutingPolicy,
): HybridRoutingDecision {
  const criticalFields = policy.criticalFields ?? HYBRID_CRITICAL_FIELDS;
  const requiredFields = policy.requiredFieldsForNoEscalation;

  const missingCriticalFields = criticalFields.filter((fieldId) => {
    const field = extraction.fields[fieldId];
    return !isPresent(field.value);
  });

  const missingRequiredFields = requiredFields.filter((fieldId) => {
    const field = extraction.fields[fieldId];
    return !isPresent(field.value);
  });

  const lowConfidenceRequiredFields = requiredFields.filter((fieldId) => {
    const field = extraction.fields[fieldId];
    return isPresent(field.value) && field.confidence < policy.minRequiredFieldConfidence;
  });

  const presentConfidences = criticalFields
    .map((fieldId) => extraction.fields[fieldId])
    .filter((field) => isPresent(field.value))
    .map((field) => field.confidence);

  const presentCriticalCount = presentConfidences.length;
  const meanCriticalConfidence = presentCriticalCount
    ? presentConfidences.reduce((sum, v) => sum + v, 0) / presentCriticalCount
    : 0;

  if (missingRequiredFields.length > 0) {
    return {
      useLlmFallback: true,
      reason: "missing_required_fields",
      missingCriticalFields,
      missingRequiredFields,
      lowConfidenceRequiredFields,
      presentCriticalCount,
      meanCriticalConfidence,
    };
  }

  if (lowConfidenceRequiredFields.length > 0) {
    return {
      useLlmFallback: true,
      reason: "low_confidence_required_fields",
      missingCriticalFields,
      missingRequiredFields,
      lowConfidenceRequiredFields,
      presentCriticalCount,
      meanCriticalConfidence,
    };
  }

  if (presentCriticalCount < policy.minCriticalFieldsPresent) {
    return {
      useLlmFallback: true,
      reason: "insufficient_critical_field_coverage",
      missingCriticalFields,
      missingRequiredFields,
      lowConfidenceRequiredFields,
      presentCriticalCount,
      meanCriticalConfidence,
    };
  }

  if (meanCriticalConfidence < policy.minMeanCriticalConfidence) {
    return {
      useLlmFallback: true,
      reason: "low_mean_critical_confidence",
      missingCriticalFields,
      missingRequiredFields,
      lowConfidenceRequiredFields,
      presentCriticalCount,
      meanCriticalConfidence,
    };
  }

  return {
    useLlmFallback: false,
    reason: "ocr_result_accepted",
    missingCriticalFields,
    missingRequiredFields,
    lowConfidenceRequiredFields,
    presentCriticalCount,
    meanCriticalConfidence,
  };
}
