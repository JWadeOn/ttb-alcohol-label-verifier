/**
 * Deterministic label-vs-application comparison for the prototype.
 *
 * **Source of truth:** Match logic and exported thresholds in this file — not TTB/COLA/27 CFR.
 * Evaluator traceability: `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`.
 */
import type { ExtractionResult, ExtractedField } from "@/lib/extraction/types";
import { levenshteinDistance } from "@/lib/levenshtein-distance";
import type { ApplicationJson, FieldId, FieldValidationRow } from "@/lib/schemas";

/** Shared copy for dev stub responses and low-confidence validator rows. */
export const MANUAL_REVIEW_LOW_CONFIDENCE_MESSAGE =
  "Extraction confidence is below the automatic comparison threshold; human review recommended.";

/** Below this extraction confidence → `manual_review` (no automatic pass/fail). */
export const CONFIDENCE_MANUAL_REVIEW = 0.65;
/** Normalized fuzzy similarity for brand name pass. */
export const BRAND_SIMILARITY = 0.88;
/** Normalized fuzzy similarity for class/type pass. */
export const CLASS_SIMILARITY = 0.82;
/** Normalized fuzzy similarity for name/address pass. */
export const NAME_SIMILARITY = 0.78;
/** Normalized fuzzy similarity for country of origin (imports) pass. */
export const ORIGIN_SIMILARITY = 0.82;
/** Alcohol strength: max difference in percentage points (ABV) for pass. */
export const ABV_TOLERANCE = 0.25;
/** Net contents: relative tolerance (fraction of larger volume). */
export const VOLUME_TOLERANCE_RATIO = 0.03;
/** Net contents: absolute floor tolerance in ml (used with ratio). */
export const VOLUME_TOLERANCE_ML = 5;

function normalizeAlphanumericKey(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function fuzzyRatio(a: string, b: string): number {
  const A = normalizeAlphanumericKey(a);
  const B = normalizeAlphanumericKey(b);
  if (A.length === 0 && B.length === 0) return 1;
  if (A.length === 0 || B.length === 0) return 0;
  const d = levenshteinDistance(A, B);
  const maxLen = Math.max(A.length, B.length);
  return 1 - d / maxLen;
}

export function parseApproxAbvPct(text: string): number | null {
  const t = text.trim();
  const proof = t.match(/(\d+(?:\.\d+)?)\s*proof\b/i);
  if (proof) return Number.parseFloat(proof[1]) / 2;

  const pct = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return Number.parseFloat(pct[1]);

  const alcVol = t.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:alc|abv)/i);
  if (alcVol) return Number.parseFloat(alcVol[1]);

  return null;
}

function parseApproxVolumeMl(text: string): number | null {
  const t = text.trim().toLowerCase();

  const ml = t.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/);
  if (ml) return Number.parseFloat(ml[1]);

  const l = t.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|liters)\b/);
  if (l) return Number.parseFloat(l[1]) * 1000;

  const floz = t.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*oz|fluid\s*ounces?)\b/);
  if (floz) return Number.parseFloat(floz[1]) * 29.5735;

  return null;
}

function appString(application: ApplicationJson, field: FieldId): string | null {
  switch (field) {
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
    default:
      return null;
  }
}

function lowConfidenceRow(
  fieldId: FieldId,
  extracted: ExtractedField,
  applicationValue: string | null,
): FieldValidationRow {
  return {
    fieldId,
    status: "manual_review",
    message: MANUAL_REVIEW_LOW_CONFIDENCE_MESSAGE,
    extractedValue: extracted.value,
    applicationValue,
    evidence: extracted.reason ?? null,
  };
}

export function validateLabelFields(
  extraction: ExtractionResult,
  application: ApplicationJson,
): FieldValidationRow[] {
  const isImport = application.isImport === true;

  const rows: FieldValidationRow[] = [];

  const push = (row: FieldValidationRow) => rows.push(row);

  const mvpFields: FieldId[] = [
    "brandName",
    "classType",
    "alcoholContent",
    "netContents",
    "governmentWarning",
  ];

  for (const fieldId of mvpFields) {
    const extracted = extraction.fields[fieldId];
    const applicationValue = appString(application, fieldId);

    if (extracted.confidence < CONFIDENCE_MANUAL_REVIEW) {
      push(lowConfidenceRow(fieldId, extracted, applicationValue));
      continue;
    }

    if (extracted.value === null || extracted.value.trim() === "") {
      push({
        fieldId,
        status: "manual_review",
        message: "Could not read this field from the label image.",
        extractedValue: null,
        applicationValue,
        evidence: extracted.reason ?? null,
      });
      continue;
    }

    const ev = extracted.value.trim();
    const av = applicationValue?.trim() ?? "";

    if (fieldId === "governmentWarning") {
      if (!av) {
        push({
          fieldId,
          status: "manual_review",
          message:
            "Application JSON did not include government warning text to compare.",
          extractedValue: ev,
          applicationValue,
          evidence: null,
        });
        continue;
      }
      if (ev === av) {
        push({
          fieldId,
          status: "pass",
          message: "Government warning matches submitted application text exactly.",
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      } else {
        push({
          fieldId,
          status: "fail",
          message:
            "Government warning differs from submitted application text (comparison is exact and case-sensitive).",
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      }
      continue;
    }

    if (fieldId === "brandName") {
      const ratio = fuzzyRatio(ev, av);
      if (!av) {
        push({
          fieldId,
          status: "manual_review",
          message:
            "Application JSON omitted brand name; cannot compare automatically.",
          extractedValue: ev,
          applicationValue: av || null,
          evidence: null,
        });
        continue;
      }
      if (ratio >= BRAND_SIMILARITY) {
        push({
          fieldId,
          status: "pass",
          message: `Normalized fuzzy similarity ${ratio.toFixed(2)} meets brand threshold.`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      } else {
        push({
          fieldId,
          status: "fail",
          message: `Brand mismatch after normalization (similarity ${ratio.toFixed(2)}).`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      }
      continue;
    }

    if (fieldId === "classType") {
      const ratio = fuzzyRatio(ev, av);
      if (!av) {
        push({
          fieldId,
          status: "manual_review",
          message:
            "Application JSON omitted class/type; cannot compare automatically.",
          extractedValue: ev,
          applicationValue: av || null,
          evidence: null,
        });
        continue;
      }
      if (ratio >= CLASS_SIMILARITY) {
        push({
          fieldId,
          status: "pass",
          message: `Class/type similarity ${ratio.toFixed(2)} meets threshold.`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      } else {
        push({
          fieldId,
          status: "fail",
          message: `Class/type mismatch (similarity ${ratio.toFixed(2)}).`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      }
      continue;
    }

    if (fieldId === "alcoholContent") {
      const eAbv = parseApproxAbvPct(ev);
      const aAbv = parseApproxAbvPct(av);
      if (eAbv === null || aAbv === null) {
        push({
          fieldId,
          status: "manual_review",
          message:
            "Could not parse comparable ABV/proof values from label and/or application text.",
          extractedValue: ev,
          applicationValue: av || null,
          evidence: null,
        });
        continue;
      }
      if (Math.abs(eAbv - aAbv) <= ABV_TOLERANCE) {
        push({
          fieldId,
          status: "pass",
          message: `Alcohol strength matches within ±${ABV_TOLERANCE}% ABV after normalization.`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      } else {
        push({
          fieldId,
          status: "fail",
          message: `Alcohol strength differs materially (label ~${eAbv}% ABV vs application ~${aAbv}% ABV).`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      }
      continue;
    }

    if (fieldId === "netContents") {
      const eMl = parseApproxVolumeMl(ev);
      const aMl = parseApproxVolumeMl(av);
      if (eMl === null || aMl === null) {
        push({
          fieldId,
          status: "manual_review",
          message:
            "Could not parse comparable net contents volumes from label and/or application.",
          extractedValue: ev,
          applicationValue: av || null,
          evidence: null,
        });
        continue;
      }
      const tol = Math.max(
        VOLUME_TOLERANCE_ML,
        VOLUME_TOLERANCE_RATIO * Math.max(eMl, aMl),
      );
      if (Math.abs(eMl - aMl) <= tol) {
        push({
          fieldId,
          status: "pass",
          message: `Net contents match within tolerance after unit normalization.`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      } else {
        push({
          fieldId,
          status: "fail",
          message: `Net contents differ beyond tolerance (~${Math.round(eMl)} ml vs ~${Math.round(aMl)} ml).`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      }
    }
  }

  /* P1 fields */
  const extractedNa = extraction.fields.nameAddress;
  const appNa = appString(application, "nameAddress");

  if (extractedNa.confidence < CONFIDENCE_MANUAL_REVIEW) {
    push(lowConfidenceRow("nameAddress", extractedNa, appNa));
  } else if (
    extractedNa.value === null ||
    extractedNa.value.trim() === ""
  ) {
    push({
      fieldId: "nameAddress",
      status: "manual_review",
      message: "Name/address not confidently read from label (Phase 1 defers strict COLA address checks).",
      extractedValue: null,
      applicationValue: appNa,
      evidence: extractedNa.reason ?? null,
    });
  } else if (!appNa?.trim()) {
    push({
      fieldId: "nameAddress",
      status: "manual_review",
      message:
        "Application omitted name/address; skipping automated comparison.",
      extractedValue: extractedNa.value.trim(),
      applicationValue: appNa,
      evidence: null,
    });
  } else {
    const ratio = fuzzyRatio(extractedNa.value.trim(), appNa.trim());
    if (ratio >= NAME_SIMILARITY) {
      push({
        fieldId: "nameAddress",
        status: "pass",
        message: `Name/address similarity ${ratio.toFixed(2)} meets threshold.`,
        extractedValue: extractedNa.value.trim(),
        applicationValue: appNa.trim(),
        evidence: null,
      });
    } else {
      push({
        fieldId: "nameAddress",
        status: "fail",
        message: `Name/address mismatch (similarity ${ratio.toFixed(2)}).`,
        extractedValue: extractedNa.value.trim(),
        applicationValue: appNa.trim(),
        evidence: null,
      });
    }
  }

  const extractedCo = extraction.fields.countryOfOrigin;

  if (!isImport) {
    push({
      fieldId: "countryOfOrigin",
      status: "not_applicable",
      message:
        "Application marks non-import; country of origin is not applicable.",
      extractedValue: extractedCo.value,
      applicationValue: appString(application, "countryOfOrigin"),
      evidence: null,
    });
  } else if (extractedCo.confidence < CONFIDENCE_MANUAL_REVIEW) {
    push(lowConfidenceRow("countryOfOrigin", extractedCo, appString(application, "countryOfOrigin")));
  } else if (
    extractedCo.value === null ||
    extractedCo.value.trim() === ""
  ) {
    push({
      fieldId: "countryOfOrigin",
      status: "manual_review",
      message: "Import product but country of origin could not be read from label.",
      extractedValue: null,
      applicationValue: appString(application, "countryOfOrigin"),
      evidence: extractedCo.reason ?? null,
    });
  } else {
    const av = appString(application, "countryOfOrigin")?.trim() ?? "";
    const ev = extractedCo.value.trim();
    if (!av) {
      push({
        fieldId: "countryOfOrigin",
        status: "manual_review",
        message:
          "Import product but application omitted country of origin text.",
        extractedValue: ev,
        applicationValue: null,
        evidence: null,
      });
    } else {
      const ratio = fuzzyRatio(ev, av);
      if (ratio >= ORIGIN_SIMILARITY) {
        push({
          fieldId: "countryOfOrigin",
          status: "pass",
          message: `Country of origin similarity ${ratio.toFixed(2)} meets threshold.`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      } else {
        push({
          fieldId: "countryOfOrigin",
          status: "fail",
          message: `Country of origin mismatch (similarity ${ratio.toFixed(2)}).`,
          extractedValue: ev,
          applicationValue: av,
          evidence: null,
        });
      }
    }
  }

  return rows;
}
