import { describe, expect, it } from "vitest";
import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import type { ApplicationJson } from "@/lib/schemas";
import { VerifySuccessResponseSchema } from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";

function completeApplication(
  overrides: Partial<ApplicationJson> = {},
): ApplicationJson {
  return {
    productClass: "distilled_spirits",
    isImport: false,
    brandName: "Example Distillery",
    classType: "Straight Bourbon Whiskey",
    alcoholContent: "45% ALC/VOL",
    netContents: "750 mL",
    governmentWarning: CANONICAL_GOVERNMENT_WARNING,
    nameAddress: "Example Distillery, Louisville, KY",
    countryOfOrigin: "",
    ...overrides,
  };
}

describe("buildStubVerifyResponse", () => {
  it("returns schema-valid stub with origin not_applicable when not import", () => {
    const body = buildStubVerifyResponse(
      "00000000-0000-4000-8000-000000000002",
      completeApplication(),
    );

    expect(VerifySuccessResponseSchema.safeParse(body).success).toBe(true);

    const origin = body.validation.fields.find((f) => f.fieldId === "countryOfOrigin");
    expect(origin?.status).toBe("not_applicable");

    const brand = body.validation.fields.find((f) => f.fieldId === "brandName");
    expect(brand?.status).toBe("manual_review");
  });

  it("uses manual_review for countryOfOrigin when import", () => {
    const body = buildStubVerifyResponse(
      "00000000-0000-4000-8000-000000000003",
      completeApplication({
        isImport: true,
        countryOfOrigin: "Scotland",
      }),
    );

    const origin = body.validation.fields.find((f) => f.fieldId === "countryOfOrigin");
    expect(origin?.status).toBe("manual_review");
    expect(origin?.applicationValue).toBe("Scotland");
  });

  it("fails mandatory fields when application values are blank", () => {
    const body = buildStubVerifyResponse(
      "00000000-0000-4000-8000-000000000004",
      completeApplication({ nameAddress: "" }),
    );

    const nameAddress = body.validation.fields.find((f) => f.fieldId === "nameAddress");
    expect(nameAddress?.status).toBe("fail");
    expect(nameAddress?.message).toContain("Required application value missing");
  });
});
