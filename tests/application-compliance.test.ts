import { describe, expect, it } from "vitest";
import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import {
  checkApplicationReadyForVerify,
  ensureApplicationComplianceJson,
  resolveApplicationForVerify,
} from "@/lib/application-compliance";

describe("application compliance", () => {
  it("injects canonical government warning when blank", () => {
    const raw = JSON.stringify(
      {
        productClass: "distilled_spirits",
        isImport: false,
        brandName: "Example Brand",
        classType: "Vodka",
        alcoholContent: "40%",
        netContents: "750 mL",
        governmentWarning: "",
        nameAddress: "Example Distillery, KY",
        countryOfOrigin: "",
      },
      null,
      2,
    );

    const next = ensureApplicationComplianceJson(raw);
    const parsed = JSON.parse(next) as { governmentWarning: string };
    expect(parsed.governmentWarning).toBe(CANONICAL_GOVERNMENT_WARNING);
  });

  it("resolveApplicationForVerify injects warning then checks required fields", () => {
    const resolved = resolveApplicationForVerify({
      productClass: "distilled_spirits",
      isImport: false,
      brandName: "Example Brand",
      classType: "Vodka",
      alcoholContent: "40%",
      netContents: "750 mL",
      governmentWarning: "",
      nameAddress: "Example Distillery, KY",
      countryOfOrigin: "",
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.application.governmentWarning).toBe(CANONICAL_GOVERNMENT_WARNING);
    }
  });

  it("blocks verify when required fields are missing", () => {
    const raw = JSON.stringify(
      {
        productClass: "distilled_spirits",
        isImport: true,
        brandName: "Silver Coast",
        classType: "Vodka",
        alcoholContent: "40%",
        netContents: "1 L",
        governmentWarning: CANONICAL_GOVERNMENT_WARNING,
        nameAddress: "",
        countryOfOrigin: "",
      },
      null,
      2,
    );

    const state = checkApplicationReadyForVerify(raw);
    expect(state.ok).toBe(false);
    if (!state.ok) {
      expect(state.reason).toContain("Name & address");
      expect(state.reason).toContain("Country of origin");
    }
  });
});
