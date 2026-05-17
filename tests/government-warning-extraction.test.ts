import { describe, expect, it } from "vitest";
import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import {
  finalizeGovernmentWarningExtraction,
  normalizeStandardGovernmentWarningCasing,
  reconcileGovernmentWarningAfterLlm,
  restoreGovernmentWarningMarkers,
  scoreGovernmentWarningCompleteness,
} from "@/lib/extraction/government-warning";

describe("restoreGovernmentWarningMarkers", () => {
  it("restores (1) and (2) when LLM/OCR omits markers on standard warning body", () => {
    const withoutMarkers =
      "GOVERNMENT WARNING: According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

    expect(restoreGovernmentWarningMarkers(withoutMarkers)).toBe(
      CANONICAL_GOVERNMENT_WARNING,
    );
  });

  it("leaves text unchanged when markers are already present", () => {
    expect(restoreGovernmentWarningMarkers(CANONICAL_GOVERNMENT_WARNING)).toBe(
      CANONICAL_GOVERNMENT_WARNING,
    );
  });

  it("does not modify non-standard warning text", () => {
    const custom = "GOVERNMENT WARNING: Drink responsibly.";
    expect(restoreGovernmentWarningMarkers(custom)).toBe(custom);
  });
});

describe("normalizeStandardGovernmentWarningCasing", () => {
  it("fixes Surgeon General casing on standard warning body", () => {
    const lowerSurgeon = CANONICAL_GOVERNMENT_WARNING.replace(
      "Surgeon General",
      "surgeon general",
    );
    expect(normalizeStandardGovernmentWarningCasing(lowerSurgeon)).toBe(
      CANONICAL_GOVERNMENT_WARNING,
    );
  });
});

describe("finalizeGovernmentWarningExtraction", () => {
  it("restores markers and Surgeon General casing together", () => {
    const raw =
      "GOVERNMENT WARNING: According to the surgeon general, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

    expect(finalizeGovernmentWarningExtraction(raw)).toBe(
      CANONICAL_GOVERNMENT_WARNING,
    );
  });
});

describe("scoreGovernmentWarningCompleteness", () => {
  it("scores cropped warning fragments lower than full canonical text", () => {
    const partial =
      "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy";
    const partialScore = scoreGovernmentWarningCompleteness(partial).score;
    const fullScore = scoreGovernmentWarningCompleteness(CANONICAL_GOVERNMENT_WARNING).score;
    expect(partialScore).toBeLessThan(0.55);
    expect(fullScore).toBeGreaterThanOrEqual(0.75);
  });
});

describe("reconcileGovernmentWarningAfterLlm", () => {
  it("replaces hallucinated full LLM warning with partial OCR when OCR aligns at prefix", () => {
    const partial =
      "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy";
    const reconciled = reconcileGovernmentWarningAfterLlm(
      { value: CANONICAL_GOVERNMENT_WARNING, confidence: 0.92 },
      { value: partial, confidence: 0.48, reason: "OCR partial" },
    );

    expect(reconciled.value).toContain("GOVERNMENT WARNING");
    expect(reconciled.value).not.toContain("health problems");
    expect(reconciled.confidence).toBeLessThan(0.65);
    expect(reconciled.reason).toContain("partial OCR");
  });

  it("keeps LLM warning when OCR did not capture a warning fragment", () => {
    const reconciled = reconcileGovernmentWarningAfterLlm(
      { value: CANONICAL_GOVERNMENT_WARNING, confidence: 0.92 },
      { value: null, confidence: 0 },
    );

    expect(reconciled.value).toBe(CANONICAL_GOVERNMENT_WARNING);
  });
});
