import { describe, expect, it } from "vitest";
import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import { applyExtractionPostProcessing } from "@/lib/extraction/post-process";
import type { ExtractionResult } from "@/lib/extraction/types";

function extractionWithWarning(value: string): ExtractionResult {
  return {
    provider: "openai",
    durationMs: 1,
    fields: {
      brandName: { value: null, confidence: 0 },
      classType: { value: null, confidence: 0 },
      alcoholContent: { value: null, confidence: 0 },
      netContents: { value: null, confidence: 0 },
      governmentWarning: { value, confidence: 0.9 },
      nameAddress: { value: null, confidence: 0 },
      countryOfOrigin: { value: null, confidence: 0 },
    },
  };
}

describe("applyExtractionPostProcessing", () => {
  it("fixes Surgeon General casing on cached-style LLM output", () => {
    const raw = CANONICAL_GOVERNMENT_WARNING.replace("Surgeon General", "surgeon general");
    const out = applyExtractionPostProcessing(extractionWithWarning(raw));
    expect(out.fields.governmentWarning.value).toBe(CANONICAL_GOVERNMENT_WARNING);
  });

  it("caps confidence for visibly incomplete warning text", () => {
    const partial =
      "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy";
    const out = applyExtractionPostProcessing(extractionWithWarning(partial));
    expect(out.fields.governmentWarning.confidence).toBeLessThan(0.65);
  });
});
