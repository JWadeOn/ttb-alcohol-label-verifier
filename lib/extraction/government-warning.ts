/**
 * Repairs standard TTB government-warning text when OCR/vision drops the
 * printed "(1)" / "(2)" sentence markers but the two-sentence body is intact.
 */

import { levenshteinDistance } from "@/lib/levenshtein-distance";
import type { ExtractedField } from "@/lib/extraction/types";

/** Phrase coverage used to score how complete a warning block is (OCR or vision). */
export const GOVERNMENT_WARNING_COMPLETENESS_SIGNALS = [
  "government warning",
  "(1)",
  "(2)",
  "surgeon general",
  "pregnan",
  "birth defects",
  "operate machinery",
  "health problems",
] as const;

const COMPLETE_WARNING_SCORE = 0.75;
const PARTIAL_WARNING_SCORE = 0.55;

function hasStandardWarningBody(lower: string): boolean {
  return (
    lower.includes("according to the surgeon general") &&
    lower.includes("consumption of alcoholic beverages") &&
    lower.includes("health problems")
  );
}

function normalizeWarningText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function prefixAligns(partial: string, full: string): boolean {
  const p = normalizeWarningText(partial);
  const f = normalizeWarningText(full);
  if (p.length < 30) return false;
  const head = p.slice(0, Math.min(p.length, 100));
  if (f.startsWith(head)) return true;
  const slice = f.slice(0, Math.min(f.length, head.length + 48));
  if (!slice || !head) return false;
  const dist = levenshteinDistance(head, slice);
  const maxLen = Math.max(head.length, slice.length, 1);
  return 1 - dist / maxLen >= 0.72;
}

/** Restore "(1)" / "(2)" markers when the standard two-sentence warning body is present. */
export function restoreGovernmentWarningMarkers(text: string): string {
  let s = text.replace(/\s+/g, " ").trim();
  if (!/government\s+warning/i.test(s)) return s;

  const lower = s.toLowerCase();
  if (!hasStandardWarningBody(lower)) return s;

  const has1 = /\(1\)/.test(s);
  const has2 = /\(2\)/.test(s);
  if (has1 && has2) return s;

  if (!has1) {
    s = s.replace(/^(GOVERNMENT\s+WARNING\s*:)\s*(?!\(1\))/i, "$1 (1) ");
  }

  if (!has2) {
    s = s.replace(
      /(birth defects)\.\s*(Consumption of alcoholic beverages)/i,
      "$1. (2) $2",
    );
    if (!/\(2\)/.test(s)) {
      s = s.replace(
        /\.\s*(Consumption of alcoholic beverages)/i,
        ". (2) $1",
      );
    }
  }

  return s.replace(/\s+/g, " ").trim();
}

/** Canonical proper-noun / fixed phrases in the standard TTB warning (case-insensitive repair). */
const STANDARD_WARNING_PHRASE_FIXES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bsurgeon general\b/gi, "Surgeon General"],
];

/** Normalize casing on fixed phrases when the standard warning body is present. */
export function normalizeStandardGovernmentWarningCasing(text: string): string {
  if (!hasStandardWarningBody(text.toLowerCase())) return text;
  let s = text;
  for (const [pattern, replacement] of STANDARD_WARNING_PHRASE_FIXES) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

/** Marker restore + canonical phrase casing for OCR/vision output. */
export function finalizeGovernmentWarningExtraction(text: string): string {
  return normalizeStandardGovernmentWarningCasing(restoreGovernmentWarningMarkers(text));
}

export type GovernmentWarningCompleteness = {
  score: number;
  matchedSignals: number;
  signalCount: number;
};

/** Score 0–1 for how much of the standard warning block is present in extracted text. */
export function scoreGovernmentWarningCompleteness(text: string): GovernmentWarningCompleteness {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const signalCount = GOVERNMENT_WARNING_COMPLETENESS_SIGNALS.length;
  const matchedSignals = GOVERNMENT_WARNING_COMPLETENESS_SIGNALS.filter((signal) =>
    lower.includes(signal),
  ).length;

  const lengthScore =
    normalized.length >= 240 ? 0.24 : normalized.length >= 180 ? 0.17 : normalized.length >= 120 ? 0.1 : 0.03;
  const signalScore = (matchedSignals / signalCount) * 0.56;
  const printable = normalized.replace(/\s/g, "").length;
  const letters = (normalized.match(/[a-z]/gi) ?? []).length;
  const alphaRatio = printable > 0 ? letters / printable : 0;
  const alphaScore = alphaRatio >= 0.72 ? 0.12 : alphaRatio >= 0.62 ? 0.06 : 0;
  const score = Math.min(1, lengthScore + signalScore + alphaScore);

  return { score, matchedSignals, signalCount };
}

export function confidenceFromGovernmentWarningCompleteness(score: number): number {
  if (score >= 0.86) return 0.74;
  if (score >= 0.74) return 0.68;
  if (score >= 0.62) return 0.62;
  return 0.48;
}

/**
 * When hybrid mode escalates to vision, prefer partial OCR over a suspiciously
 * "completed" LLM warning that no longer matches what was read from the image.
 */
export function reconcileGovernmentWarningAfterLlm(
  llm: ExtractedField,
  ocr: ExtractedField | undefined,
): ExtractedField {
  const llmVal = llm.value?.trim();
  if (!llmVal) return llm;

  const finalizedLlm = finalizeGovernmentWarningExtraction(llmVal);
  const llmCompleteness = scoreGovernmentWarningCompleteness(finalizedLlm);
  const completenessCap = confidenceFromGovernmentWarningCompleteness(llmCompleteness.score);

  const ocrVal = ocr?.value?.trim();
  if (ocrVal && ocr) {
    const finalizedOcr = finalizeGovernmentWarningExtraction(ocrVal);
    const ocrCompleteness = scoreGovernmentWarningCompleteness(finalizedOcr);

    if (
      ocrCompleteness.score < PARTIAL_WARNING_SCORE &&
      llmCompleteness.score >= COMPLETE_WARNING_SCORE &&
      prefixAligns(finalizedOcr, finalizedLlm)
    ) {
      const ocrConfidence = Math.min(
        ocr.confidence,
        completenessCap,
        confidenceFromGovernmentWarningCompleteness(ocrCompleteness.score),
        0.64,
      );
      return {
        value: finalizedOcr,
        confidence: ocrConfidence,
        reason:
          "Vision returned a complete standard warning but OCR only captured a partial block; using partial OCR text because the label warning appears cropped.",
      };
    }
  }

  if (llm.confidence > completenessCap) {
    return {
      ...llm,
      value: finalizedLlm,
      confidence: completenessCap,
      reason:
        llm.reason ??
        `Government warning completeness score ${llmCompleteness.score.toFixed(2)} (${llmCompleteness.matchedSignals}/${llmCompleteness.signalCount} signals).`,
    };
  }

  if (finalizedLlm !== llmVal) {
    return { ...llm, value: finalizedLlm };
  }

  return llm;
}
