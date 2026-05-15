/**
 * Golden path: `fixtures/default-application.json` + synthetic extraction that
 * matches the submitted strings (as if vision read the label perfectly).
 * No images, no OpenAI — locks the verify *rules* to the committed fixture contract.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ExtractionResult, ExtractedField } from "@/lib/extraction/types";
import { emptyExtractionFields } from "@/lib/extraction/types";
import { ApplicationJsonSchema, type ApplicationJson } from "@/lib/schemas";
import { validateLabelFields } from "@/lib/validator";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

function confident(value: string): ExtractedField {
  return { value, confidence: 0.95 };
}

function goldenExtractionFromApplication(app: ApplicationJson): ExtractionResult {
  return {
    provider: "golden_fixture",
    durationMs: 1,
    fields: {
      ...emptyExtractionFields(),
      brandName: confident(app.brandName ?? ""),
      classType: confident(app.classType ?? ""),
      alcoholContent: confident(app.alcoholContent ?? ""),
      netContents: confident(app.netContents ?? ""),
      governmentWarning: confident(app.governmentWarning ?? ""),
      nameAddress: { value: null, confidence: 0 },
      countryOfOrigin: { value: null, confidence: 0 },
    },
  };
}

describe("golden path vs fixtures/default-application.json", () => {
  it("MVP fields pass when extraction matches application text; P1 edges per rules", async () => {
    const raw = await readFile(path.join(root, "fixtures", "default-application.json"), "utf8");
    const parsed = ApplicationJsonSchema.safeParse(JSON.parse(raw));
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.flatten())).toBe(true);
    const app = parsed.data;

    const extraction = goldenExtractionFromApplication(app);
    const rows = validateLabelFields(extraction, app);
    const byId = Object.fromEntries(rows.map((r) => [r.fieldId, r]));

    expect(byId.brandName?.status).toBe("pass");
    expect(byId.classType?.status).toBe("pass");
    expect(byId.alcoholContent?.status).toBe("pass");
    expect(byId.netContents?.status).toBe("pass");
    expect(byId.governmentWarning?.status).toBe("pass");

    expect(byId.nameAddress?.status).toBe("manual_review");
    expect(byId.countryOfOrigin?.status).toBe("not_applicable");
  });

  it("routes warning near-matches to manual review", async () => {
    const raw = await readFile(path.join(root, "fixtures", "default-application.json"), "utf8");
    const app = ApplicationJsonSchema.parse(JSON.parse(raw));

    const extraction = goldenExtractionFromApplication(app);
    extraction.fields.governmentWarning = confident(
      `${app.governmentWarning ?? ""} EXTRA`,
    );

    const rows = validateLabelFields(extraction, app);
    const warn = rows.find((r) => r.fieldId === "governmentWarning");
    expect(warn?.status).toBe("manual_review");
  });
});
