import type { ApplicationJson, FieldId, VerifySuccessResponse } from "@/lib/schemas";

const FIELD_IDS: FieldId[] = [
  "brandName",
  "classType",
  "alcoholContent",
  "netContents",
  "governmentWarning",
  "nameAddress",
  "countryOfOrigin",
];

function applicationValueForField(
  fieldId: FieldId,
  application: ApplicationJson,
): string | null {
  switch (fieldId) {
    case "brandName":
      return application.brandName ?? null;
    case "classType":
      return application.classType ?? null;
    case "alcoholContent":
      return application.alcoholContent ?? null;
    case "netContents":
      return application.netContents ?? null;
    case "governmentWarning":
      return application.governmentWarning ?? null;
    case "nameAddress":
      return application.nameAddress ?? null;
    case "countryOfOrigin":
      return application.countryOfOrigin ?? null;
  }
}

/** Phase 0 deterministic stub — shape matches §3 contracts; logic wired in Phase 1+ */
export function buildStubVerifyResponse(
  requestId: string,
  application: ApplicationJson,
): VerifySuccessResponse {
  const isImport = application.isImport === true;

  const fields = FIELD_IDS.map((fieldId) => {
    if (fieldId === "countryOfOrigin" && !isImport) {
      return {
        fieldId,
        status: "not_applicable" as const,
        message:
          "Application marks non-import; country of origin is not applicable.",
        extractedValue: null,
        applicationValue: applicationValueForField(fieldId, application),
        evidence: null,
      };
    }

    return {
      fieldId,
      status: "manual_review" as const,
      message:
        "Phase 0 stub — extraction and comparison are not implemented yet.",
      extractedValue: null,
      applicationValue: applicationValueForField(fieldId, application),
      evidence: null,
    };
  });

  return {
    requestId,
    imageQuality: { ok: true },
    extraction: {
      provider: "stub",
      durationMs: 0,
      fields: {},
    },
    validation: { fields },
  };
}
