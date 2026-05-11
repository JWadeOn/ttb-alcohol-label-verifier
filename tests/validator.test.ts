import { describe, expect, it } from "vitest";
import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import {
  emptyExtractionFields,
  type ExtractionResult,
  type ExtractedField,
} from "@/lib/extraction/types";
import type { ApplicationJson, FieldId } from "@/lib/schemas";
import { parseApproxAbvPct, validateLabelFields } from "@/lib/validator";

function baseExtraction(
  overrides: Partial<Record<FieldId, ExtractedField>>,
): ExtractionResult {
  return {
    provider: "openai",
    durationMs: 42,
    fields: {
      ...emptyExtractionFields(),
      ...overrides,
    },
  };
}

function confident(value: string): ExtractedField {
  return { value, confidence: 0.95 };
}

describe("validateLabelFields", () => {
  const baseApp: ApplicationJson = {
    productClass: "distilled_spirits",
    isImport: false,
    brandName: "Stone's Throw Distilling Co",
    classType: "Straight Bourbon Whiskey",
    alcoholContent: "45% ALC/VOL",
    netContents: "750 mL",
    governmentWarning: CANONICAL_GOVERNMENT_WARNING,
    nameAddress: "",
    countryOfOrigin: "",
  };

  it('Dave: STONE\'S THROW casing vs Stone\'s Throw passes fuzzy brand match', () => {
    const extraction = baseExtraction({
      brandName: confident("STONE'S THROW DISTILLING CO"),
      classType: confident(baseApp.classType ?? ""),
      alcoholContent: confident(baseApp.alcoholContent ?? ""),
      netContents: confident(baseApp.netContents ?? ""),
      governmentWarning: confident(CANONICAL_GOVERNMENT_WARNING),
      nameAddress: { value: null, confidence: 0 },
      countryOfOrigin: { value: null, confidence: 0 },
    });

    const rows = validateLabelFields(extraction, baseApp);
    const brand = rows.find((r) => r.fieldId === "brandName");
    expect(brand?.status).toBe("pass");
  });

  it("Jenny: Government Warning title case heading fails strict comparison", () => {
    const wrongHeading =
      "Government Warning: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

    const extraction = baseExtraction({
      brandName: confident(baseApp.brandName ?? ""),
      classType: confident(baseApp.classType ?? ""),
      alcoholContent: confident(baseApp.alcoholContent ?? ""),
      netContents: confident(baseApp.netContents ?? ""),
      governmentWarning: confident(wrongHeading),
      nameAddress: { value: null, confidence: 0 },
      countryOfOrigin: { value: null, confidence: 0 },
    });

    const rows = validateLabelFields(extraction, baseApp);
    const warn = rows.find((r) => r.fieldId === "governmentWarning");
    expect(warn?.status).toBe("fail");
  });

  it("countryOfOrigin is not_applicable when application marks non-import", () => {
    const extraction = baseExtraction({
      brandName: confident(baseApp.brandName ?? ""),
      classType: confident(baseApp.classType ?? ""),
      alcoholContent: confident(baseApp.alcoholContent ?? ""),
      netContents: confident(baseApp.netContents ?? ""),
      governmentWarning: confident(CANONICAL_GOVERNMENT_WARNING),
      nameAddress: { value: null, confidence: 0 },
      countryOfOrigin: confident("France"),
    });

    const rows = validateLabelFields(extraction, baseApp);
    const origin = rows.find((r) => r.fieldId === "countryOfOrigin");
    expect(origin?.status).toBe("not_applicable");
  });

  it("low extraction confidence routes field to manual_review", () => {
    const extraction = baseExtraction({
      brandName: { value: "x", confidence: 0.2 },
      classType: confident(baseApp.classType ?? ""),
      alcoholContent: confident(baseApp.alcoholContent ?? ""),
      netContents: confident(baseApp.netContents ?? ""),
      governmentWarning: confident(CANONICAL_GOVERNMENT_WARNING),
      nameAddress: { value: null, confidence: 0 },
      countryOfOrigin: { value: null, confidence: 0 },
    });

    const rows = validateLabelFields(extraction, baseApp);
    const brand = rows.find((r) => r.fieldId === "brandName");
    expect(brand?.status).toBe("manual_review");
  });
});

describe("parseApproxAbvPct", () => {
  it("parses percent and proof representations", () => {
    expect(parseApproxAbvPct("45%")).toBe(45);
    expect(parseApproxAbvPct("45% ALC/VOL")).toBe(45);
    expect(parseApproxAbvPct("90 PROOF")).toBe(45);
  });
});
