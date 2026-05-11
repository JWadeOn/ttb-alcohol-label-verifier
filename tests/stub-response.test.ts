import { describe, expect, it } from "vitest";
import { VerifySuccessResponseSchema } from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";

describe("buildStubVerifyResponse", () => {
  it("returns schema-valid stub with origin not_applicable when not import", () => {
    const body = buildStubVerifyResponse(
      "00000000-0000-4000-8000-000000000002",
      {
        isImport: false,
        brandName: "Example Distillery",
        classType: "Straight Bourbon Whiskey",
        alcoholContent: "45% ALC/VOL",
        netContents: "750 mL",
        governmentWarning: "WARN",
      },
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
      {
        isImport: true,
        countryOfOrigin: "Scotland",
      },
    );

    const origin = body.validation.fields.find((f) => f.fieldId === "countryOfOrigin");
    expect(origin?.status).toBe("manual_review");
    expect(origin?.applicationValue).toBe("Scotland");
  });
});
