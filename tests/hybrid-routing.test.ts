import { describe, expect, it } from "vitest";
import { shouldUseLlmFallback } from "@/lib/extraction/hybrid-routing";
import { emptyExtractionFields, type ExtractionResult } from "@/lib/extraction/types";

function ocrExtractionWithOverrides(
  overrides: Partial<ExtractionResult["fields"]>,
): ExtractionResult {
  return {
    provider: "tesseract",
    durationMs: 10,
    fields: {
      ...emptyExtractionFields(),
      ...overrides,
    },
  };
}

describe("shouldUseLlmFallback", () => {
  it("accepts OCR result with strong critical coverage", () => {
    const extraction = ocrExtractionWithOverrides({
      brandName: { value: "Acme Distilling", confidence: 0.8 },
      classType: { value: "Straight Bourbon Whiskey", confidence: 0.9 },
      alcoholContent: { value: "45% ALC/VOL", confidence: 0.9 },
      netContents: { value: "750 mL", confidence: 0.92 },
      governmentWarning: { value: "GOVERNMENT WARNING: ...", confidence: 0.75 },
    });

    const decision = shouldUseLlmFallback(extraction, {
      minCriticalFieldsPresent: 4,
      minMeanCriticalConfidence: 0.7,
      requiredFieldsForNoEscalation: ["classType", "alcoholContent", "netContents"],
      minRequiredFieldConfidence: 0.6,
    });

    expect(decision.useLlmFallback).toBe(false);
    expect(decision.reason).toBe("ocr_result_accepted");
  });

  it("escalates when critical field coverage is too low", () => {
    const extraction = ocrExtractionWithOverrides({
      brandName: { value: "Acme Distilling", confidence: 0.8 },
      classType: { value: "Straight Bourbon Whiskey", confidence: 0.82 },
      alcoholContent: { value: null, confidence: 0, reason: "missing" },
      netContents: { value: null, confidence: 0, reason: "missing" },
      governmentWarning: { value: null, confidence: 0, reason: "missing" },
    });

    const decision = shouldUseLlmFallback(extraction, {
      minCriticalFieldsPresent: 4,
      minMeanCriticalConfidence: 0.6,
      requiredFieldsForNoEscalation: ["classType", "alcoholContent", "netContents"],
      minRequiredFieldConfidence: 0.6,
    });

    expect(decision.useLlmFallback).toBe(true);
    expect(decision.reason).toBe("missing_required_fields");
    expect(decision.missingCriticalFields).toContain("alcoholContent");
    expect(decision.missingRequiredFields).toContain("alcoholContent");
  });

  it("escalates when mean confidence is below threshold", () => {
    const extraction = ocrExtractionWithOverrides({
      brandName: { value: "Acme Distilling", confidence: 0.5 },
      classType: { value: "Straight Bourbon Whiskey", confidence: 0.56 },
      alcoholContent: { value: "45% ALC/VOL", confidence: 0.52 },
      netContents: { value: "750 mL", confidence: 0.55 },
      governmentWarning: { value: "GOVERNMENT WARNING: ...", confidence: 0.5 },
    });

    const decision = shouldUseLlmFallback(extraction, {
      minCriticalFieldsPresent: 4,
      minMeanCriticalConfidence: 0.7,
      requiredFieldsForNoEscalation: ["classType", "alcoholContent", "netContents"],
      minRequiredFieldConfidence: 0.6,
    });

    expect(decision.useLlmFallback).toBe(true);
    expect(decision.reason).toBe("low_confidence_required_fields");
  });

  it("accepts OCR when required fields are present/confident even if warning confidence is low", () => {
    const extraction = ocrExtractionWithOverrides({
      brandName: { value: "Acme Distilling", confidence: 0.54 },
      classType: { value: "Straight Bourbon Whiskey", confidence: 0.66 },
      alcoholContent: { value: "45% ALC/VOL", confidence: 0.71 },
      netContents: { value: "750 mL", confidence: 0.73 },
      governmentWarning: { value: null, confidence: 0.2, reason: "missing warning block" },
    });

    const decision = shouldUseLlmFallback(extraction, {
      minCriticalFieldsPresent: 3,
      minMeanCriticalConfidence: 0.5,
      requiredFieldsForNoEscalation: ["classType", "alcoholContent", "netContents"],
      minRequiredFieldConfidence: 0.6,
    });

    expect(decision.useLlmFallback).toBe(false);
    expect(decision.reason).toBe("ocr_result_accepted");
  });
});
