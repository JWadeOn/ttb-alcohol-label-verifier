import type { VerifySuccessResponse } from "@/lib/schemas";

/** 1×1 valid PNG for browser image decode / upload prep. */
export function tinyPngBuffer(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

export const VALID_APPLICATION_JSON = JSON.stringify(
  {
    productClass: "Distilled spirits",
    isImport: false,
    brandName: "Example Distillery",
    classType: "Bourbon",
    alcoholContent: "40% alc./vol.",
    netContents: "750 mL",
    governmentWarning:
      "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
    nameAddress: "Example Distillery, Louisville, KY",
    countryOfOrigin: "",
  },
  null,
  2,
);

export function mockVerifySuccessResponse(
  overrides?: Partial<VerifySuccessResponse>,
): VerifySuccessResponse {
  const fieldIds = [
    "brandName",
    "classType",
    "alcoholContent",
    "netContents",
    "governmentWarning",
    "nameAddress",
    "countryOfOrigin",
  ] as const;

  return {
    requestId: "00000000-0000-4000-8000-000000000001",
    imageQuality: { ok: true },
    extraction: {
      provider: "e2e-mock",
      durationMs: 12,
      fields: {},
    },
    validation: {
      fields: fieldIds.map((fieldId) => ({
        fieldId,
        status:
          fieldId === "countryOfOrigin"
            ? ("not_applicable" as const)
            : fieldId === "brandName" && overrides?.validation?.fields?.[0]?.status === "manual_review"
              ? ("manual_review" as const)
              : ("pass" as const),
        message: "E2E mock",
        extractedValue: "mock",
        applicationValue: "mock",
        evidence: null,
      })),
    },
    timings: {
      imageQualityMs: 1,
      ocrMs: 0,
      llmMs: 10,
      extractionMs: 10,
      validationMs: 1,
      totalMs: 20,
      cacheHit: false,
    },
    ...overrides,
  };
}

export function mockManualReviewVerifyResponse(): VerifySuccessResponse {
  const base = mockVerifySuccessResponse();
  return {
    ...base,
    validation: {
      fields: base.validation.fields.map((row) =>
        row.fieldId === "brandName"
          ? {
              ...row,
              status: "manual_review" as const,
              message:
                "Extraction confidence is below the automatic comparison threshold; human review recommended.",
              extractedValue: null,
            }
          : row.status === "pass"
            ? row
            : row,
      ),
    },
  };
}
