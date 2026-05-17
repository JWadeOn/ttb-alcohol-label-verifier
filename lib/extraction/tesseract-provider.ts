import path from "node:path";
import { finalizeGovernmentWarningExtraction } from "@/lib/extraction/government-warning";
import type { ExtractionProvider } from "@/lib/extraction/provider";
import {
  emptyExtractedField,
  emptyExtractionFields,
  type ExtractionResult,
  type ExtractedField,
} from "@/lib/extraction/types";

type TesseractWorker = {
  recognize: (image: Buffer) => Promise<{
    data?: {
      text?: string;
      words?: Array<{
        text?: string;
        confidence?: number;
        bbox?: {
          x0?: number;
          y0?: number;
          x1?: number;
          y1?: number;
        };
      }>;
    };
  }>;
};

let workerPromise: Promise<TesseractWorker> | null = null;
const WORKER_PATH = path.join(
  process.cwd(),
  "node_modules",
  "tesseract.js",
  "src",
  "worker-script",
  "node",
  "index.js",
);
const CORE_PATH = path.join(
  process.cwd(),
  "node_modules",
  "tesseract.js-core",
  "tesseract-core-simd.wasm.js",
);

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng", 1, {
        workerPath: WORKER_PATH,
        corePath: CORE_PATH,
      });
    })();
  }
  return workerPromise;
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

type OcrWord = {
  text: string;
  confidence?: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

function normalizeOcrWords(rawWords: Array<{
  text?: string;
  confidence?: number;
  bbox?: { x0?: number; y0?: number; x1?: number; y1?: number };
}> | undefined): OcrWord[] {
  if (!rawWords || rawWords.length === 0) return [];
  const out: OcrWord[] = [];
  for (const raw of rawWords) {
    const text = (raw.text ?? "").trim();
    const x0 = raw.bbox?.x0;
    const y0 = raw.bbox?.y0;
    const x1 = raw.bbox?.x1;
    const y1 = raw.bbox?.y1;
    if (!text) continue;
    if (![x0, y0, x1, y1].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    out.push({
      text,
      confidence: raw.confidence,
      bbox: { x0: x0!, y0: y0!, x1: x1!, y1: y1! },
    });
  }
  return out;
}

function wordsToLineText(words: OcrWord[]): string {
  if (words.length === 0) return "";
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  const avgHeight = sorted.reduce((sum, w) => sum + (w.bbox.y1 - w.bbox.y0), 0) / sorted.length;
  const rowTolerance = Math.max(8, Math.min(24, avgHeight * 0.75));

  const rows: Array<{ y: number; words: OcrWord[] }> = [];
  for (const w of sorted) {
    const y = (w.bbox.y0 + w.bbox.y1) / 2;
    const row = rows.find((r) => Math.abs(r.y - y) <= rowTolerance);
    if (row) {
      row.words.push(w);
      row.y = (row.y * (row.words.length - 1) + y) / row.words.length;
    } else {
      rows.push({ y, words: [w] });
    }
  }

  return rows
    .sort((a, b) => a.y - b.y)
    .map((row) =>
      row.words
        .sort((a, b) => a.bbox.x0 - b.bbox.x0)
        .map((w) => w.text)
        .join(" "),
    )
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function extractDualPanelText(words: OcrWord[]): { leftText: string; rightText: string } | null {
  if (words.length < 10) return null;
  const minX = Math.min(...words.map((w) => w.bbox.x0));
  const maxX = Math.max(...words.map((w) => w.bbox.x1));
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || maxX - minX < 80) return null;

  const splitX = minX + (maxX - minX) / 2;
  const leftWords = words.filter((w) => (w.bbox.x0 + w.bbox.x1) / 2 <= splitX);
  const rightWords = words.filter((w) => (w.bbox.x0 + w.bbox.x1) / 2 > splitX);
  if (leftWords.length < 4 || rightWords.length < 4) return null;

  const leftText = wordsToLineText(leftWords);
  const rightText = wordsToLineText(rightWords);
  if (!leftText || !rightText) return null;
  return { leftText, rightText };
}

function warningSignalCount(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  if (lower.includes("government warning")) count += 2;
  for (const snippet of WARNING_TEXT_HINTS) {
    if (lower.includes(snippet)) count += 1;
  }
  for (const rx of WARNING_TEXT_REGEX_HINTS) {
    if (rx.test(lower)) count += 1;
  }
  return count;
}

function classificationSignalCount(text: string): number {
  let count = 0;
  if (extractClassTypeValue(text)) count += 1;
  if (/\b\d+(?:\.\d+)?\s*(?:% ?(?:alc\/vol|abv)?|proof)\b/i.test(text)) count += 1;
  if (/\b\d+(?:\.\d+)?\s*(?:ml|mL|l|L|fl\.?\s*oz|fluid ounces?)\b/i.test(text)) count += 1;
  return count;
}

export function shouldUseLeftPanelClassificationText(dualPanel: {
  leftText: string;
  rightText: string;
}): boolean {
  const leftText = dualPanel.leftText?.trim() ?? "";
  const rightText = dualPanel.rightText?.trim() ?? "";
  if (!leftText || !rightText) return false;

  const leftWarningSignals = warningSignalCount(leftText);
  const rightWarningSignals = warningSignalCount(rightText);
  const leftClassificationSignals = classificationSignalCount(leftText);

  // Use left-panel classification only when warning text is strongly right-sided
  // and left-side still looks like product identity content.
  return rightWarningSignals >= 3 && leftWarningSignals <= 1 && leftClassificationSignals >= 2;
}

function buildField(value: string | null, confidence: number, reason?: string): ExtractedField {
  if (value === null) {
    return emptyExtractedField(reason);
  }
  return {
    value,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason,
  };
}

function firstRegex(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match) return null;
  if (typeof match[1] === "string" && match[1].trim().length > 0) {
    return match[1].trim();
  }
  return match[0].trim();
}

const CLASS_TYPE_PATTERNS: RegExp[] = [
  /\b((?:straight|spiced|flavored|flavoured|aged|dark|light|gold|silver|white|american\s+single|single)\s+(?:(?:bourbon|rye|corn|malt)\s+)?(?:whiskey|whisky|rum|vodka|gin|tequila|liqueur|spirit))\b/i,
  /\b((?:straight\s+)?(?:bourbon|rye|corn|malt)\s*whiskey)\b/i,
  /\b((?:whiskey|whisky|vodka|gin|rum|tequila|liqueur|spirit))\b/i,
];

function normalizeClassTypeDisplay(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => (part.length === 0 ? part : `${part[0]!.toUpperCase()}${part.slice(1).toLowerCase()}`))
    .join(" ");
}

function extractClassTypeValue(text: string): string | null {
  for (const pattern of CLASS_TYPE_PATTERNS) {
    const candidate = firstRegex(text, pattern);
    if (candidate) return normalizeClassTypeDisplay(candidate);
  }
  return null;
}

type BrandDetection = {
  value: string | null;
  confidence: number;
  reason: string;
};

type LineStats = {
  letters: number;
  digits: number;
  symbols: number;
};

type BrandCandidate = {
  value: string;
  score: number;
  alphaRatio: number;
  symbolRatio: number;
};

const BRAND_EXCLUDE_HINTS = [
  "government warning",
  "% alc",
  "% abv",
  "proof",
  "ml",
  "fl oz",
  "country of origin",
  "bottled by",
];
const WARNING_TEXT_HINTS = [
  "according to the surgeon general",
  "surgeon general",
  "women should not drink",
  "during pregnancy",
  "risk of birth defects",
  "consumption of alcoholic beverages",
  "impairs your ability",
  "operate machinery",
  "health problems",
];
const WARNING_TEXT_REGEX_HINTS = [
  /consum\w+\s+of\s+alco\w*\s+beverag\w+/i,
  /risk\s+of\s+birth\s+defects?/i,
  /impairs?\s+your\s+ability\s+to\s+drive/i,
];

function lineStats(line: string): LineStats {
  let letters = 0;
  let digits = 0;
  let symbols = 0;
  for (const ch of line) {
    if (/[a-z]/i.test(ch)) letters += 1;
    else if (/[0-9]/.test(ch)) digits += 1;
    else if (!/\s/.test(ch)) symbols += 1;
  }
  return { letters, digits, symbols };
}

function looksLikeNonBrandLine(lower: string): boolean {
  if (BRAND_EXCLUDE_HINTS.some((snippet) => lower.includes(snippet))) return true;
  if (WARNING_TEXT_HINTS.some((snippet) => lower.includes(snippet))) return true;
  if (WARNING_TEXT_REGEX_HINTS.some((rx) => rx.test(lower))) return true;
  if (/^(?:spiced\s+)?(?:rum|vodka|gin|tequila|whiskey|liqueur|spirit)s?$/i.test(lower)) return true;
  if (/(?:^|\s)(?:alc|abv|proof|ml|l|oz)(?:\s|$)/i.test(lower)) return true;
  return false;
}

function isLikelyClassTypeLine(line: string): boolean {
  const lower = line.toLowerCase();
  return /^(?:straight\s+|aged\s+|spiced\s+)?(?:bourbon|rye|corn|malt)?\s*(?:whiskey|vodka|gin|rum|tequila|liqueur|spirit)s?$/.test(lower);
}

function cleanBrandValue(raw: string): string | null {
  let v = raw.replace(/\s+/g, " ").trim();
  if (!v) return null;

  // Normalize obvious OCR separators and clip to leading probable brand segment.
  const separators = [" || ", " | ", " — ", " - ", " / "];
  for (const sep of separators) {
    const idx = v.indexOf(sep);
    if (idx > 1) {
      v = v.slice(0, idx).trim();
      break;
    }
  }

  const lower = v.toLowerCase();
  const stopHints = [
    "country-of-origin",
    "country of origin",
    "government warning",
    "according to the surgeon general",
    "consumption of alcoholic beverages",
    "bottled by",
    "distilled by",
    "spirit",
    "spirits,",
  ];
  let stopAt = -1;
  for (const hint of stopHints) {
    const i = lower.indexOf(hint);
    if (i > 0 && (stopAt === -1 || i < stopAt)) stopAt = i;
  }
  if (stopAt > 0) {
    v = v.slice(0, stopAt).trim();
  }

  // Keep just the first short phrase-like segment if punctuation chain appears.
  v = v.replace(/[|]{2,}/g, " ").replace(/\s{2,}/g, " ").trim();

  const words = v.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 5) return null;
  const alphaChars = (v.match(/[a-z]/gi) ?? []).length;
  if (alphaChars < 3) return null;
  if (v.length > 40) return null;
  return v;
}

function looksLikeReadableBrandPhrase(value: string): boolean {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const alphaLens = words.map((word) => word.replace(/[^a-z]/gi, "").length);
  if (words.length === 1) return alphaLens[0]! >= 4;
  const longWords = alphaLens.filter((len) => len >= 3).length;
  const mediumWords = alphaLens.filter((len) => len >= 2).length;
  if (longWords >= 2) return true;
  if (longWords >= 1 && mediumWords >= 2) return true;
  return false;
}

function looksLikeAddressFragment(line: string): boolean {
  // Heuristic: city/state snippets frequently include commas and short region tokens.
  if (!line.includes(",")) return false;
  if (/\b(?:[A-Z]{2}|pr|usa|u\.s\.a|puerto rico)\b/i.test(line)) return true;
  if (/,\s*[a-z .'-]{2,24},\s*[a-z .'-]{2,24}$/i.test(line)) return true;
  return false;
}

function scoreBrandCandidate(line: string, index: number): BrandCandidate | null {
  const value = line.replace(/\s+/g, " ").trim();
  if (value.length < 3 || value.length > 64) return null;
  if (/[[\]{}\\/|]/.test(value)) return null;
  if (looksLikeAddressFragment(value)) return null;

  const lower = value.toLowerCase();
  if (looksLikeNonBrandLine(lower)) return null;

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length > 7) return null;
  const alphaWordLengths = words
    .map((word) => word.replace(/[^a-z]/gi, "").length)
    .filter((len) => len > 0);
  const longAlphaWords = alphaWordLengths.filter((len) => len >= 3).length;
  if (longAlphaWords === 0) return null;

  const stats = lineStats(value);
  const printable = stats.letters + stats.digits + stats.symbols;
  if (printable === 0 || stats.letters < 3) return null;

  const alphaRatio = stats.letters / printable;
  const symbolRatio = stats.symbols / printable;
  if (alphaRatio < 0.62 || symbolRatio > 0.18) return null;
  if (stats.digits > 1) return null;

  const wordsScore = words.length >= 2 && words.length <= 4 ? 1 : words.length === 1 ? 0.65 : 0.45;
  const digitsScore = stats.digits === 0 ? 1 : 0.45;
  const symbolsScore = stats.symbols === 0 ? 1 : stats.symbols === 1 ? 0.45 : 0;
  const positionScore = index === 0 ? 1 : index < 3 ? 0.8 : index < 6 ? 0.55 : 0.3;
  const caseScore = /[A-Z]/.test(value) && /[a-z]/.test(value) ? 1 : 0.55;

  const score =
    alphaRatio * 0.4 +
    wordsScore * 0.2 +
    digitsScore * 0.14 +
    symbolsScore * 0.14 +
    positionScore * 0.08 +
    caseScore * 0.04;

  const cleaned = cleanBrandValue(value);
  if (!cleaned) return null;
  if (!looksLikeReadableBrandPhrase(cleaned)) return null;
  return { value: cleaned, score, alphaRatio, symbolRatio };
}

function brandConfidenceFromScore(score: number): number {
  if (score >= 0.88) return 0.86;
  if (score >= 0.78) return 0.78;
  if (score >= 0.68) return 0.7;
  return 0.58;
}

type BrandFallbackCandidate = { value: string; score: number };

function scoreBrandFallbackCandidate(
  line: string,
  index: number,
  anchoredWindow: boolean,
): BrandFallbackCandidate | null {
  const cleaned = cleanBrandValue(line);
  if (!cleaned) return null;
  const value = cleaned;
  if (value.length < 3 || value.length > 72) return null;
  if (!looksLikeReadableBrandPhrase(value)) return null;

  const lower = value.toLowerCase();
  if (/(?:^|\s)(?:alc|abv|proof|ml|l|oz)(?:\s|$)/i.test(lower)) return null;

  const stats = lineStats(value);
  const printable = stats.letters + stats.digits + stats.symbols;
  if (printable === 0 || stats.letters < 2) return null;

  const alphaRatio = stats.letters / printable;
  const symbolRatio = stats.symbols / printable;
  const positionBonus = index <= 2 ? 0.08 : index <= 6 ? 0.04 : 0;
  const anchorBonus = anchoredWindow ? 0.12 : 0;
  const warningPenalty = looksLikeNonBrandLine(lower) ? 0.35 : 0;
  const addressPenalty = looksLikeAddressFragment(value) ? 0.22 : 0;

  const score =
    alphaRatio * 0.7 - symbolRatio * 0.3 + positionBonus + anchorBonus - warningPenalty - addressPenalty;
  return { value, score };
}

function extractTentativeBrandCandidate(lines: string[], classLineIndex: number): string | null {
  const maxScan = Math.min(lines.length, 18);
  const preferredStart = classLineIndex > 0 ? Math.max(0, classLineIndex - 4) : 0;
  const preferredEnd = classLineIndex > 0 ? classLineIndex : maxScan;

  let best: BrandFallbackCandidate | null = null;

  for (let i = preferredStart; i < preferredEnd; i += 1) {
    const candidate = scoreBrandFallbackCandidate(lines[i]!, i, true);
    if (candidate && (!best || candidate.score > best.score)) {
      best = candidate;
    }
  }
  for (let i = 0; i < maxScan; i += 1) {
    const candidate = scoreBrandFallbackCandidate(lines[i]!, i, false);
    if (candidate && (!best || candidate.score > best.score)) {
      best = candidate;
    }
  }

  if (best === null || best.score < 0.15) return null;
  return best.value;
}

function inferBrandFromNameAddress(nameAddress: string | null): BrandDetection | null {
  if (!nameAddress) return null;
  const match = nameAddress.match(
    /\b(?:bottled|distilled|produced|crafted|imported|manufactured)\s+by\s+([^,\n]{3,120})/i,
  );
  if (!match) return null;
  let candidate = match[1]!.replace(/\s+/g, " ").trim();
  candidate = candidate
    .replace(
      /\b(?:distilling|distillers?|spirits?|imports?|importers?|company|co\.?|inc\.?|llc|ltd\.?)\b.*$/i,
      "",
    )
    .trim();
  const cleaned = cleanBrandValue(candidate);
  if (!cleaned || !looksLikeReadableBrandPhrase(cleaned)) return null;
  return {
    value: cleaned,
    confidence: 0.58,
    reason: "Brand inferred from bottler name/address context after noisy headline OCR.",
  };
}

function extractBrand(lines: string[]): BrandDetection {
  let bestAnchored: (BrandCandidate & { sourceIndex: number; source: "anchored" | "global" }) | null = null;
  let bestGlobal: (BrandCandidate & { sourceIndex: number; source: "anchored" | "global" }) | null = null;
  const pool = lines.slice(0, 18);

  const classLineIndex = pool.findIndex((line) => isLikelyClassTypeLine(line));
  if (classLineIndex > 0) {
    const start = Math.max(0, classLineIndex - 4);
    for (let i = start; i < classLineIndex; i += 1) {
      const candidate = scoreBrandCandidate(pool[i]!, i);
      if (!candidate) continue;
      const distance = classLineIndex - i;
      const proximityBoost = distance <= 2 ? 0.1 : 0.04;
      const boostedScore = Math.min(1, candidate.score + proximityBoost);
      const anchoredCandidate = { ...candidate, score: boostedScore, sourceIndex: i, source: "anchored" as const };
      if (!bestAnchored || anchoredCandidate.score > bestAnchored.score) bestAnchored = anchoredCandidate;
    }
  }

  for (let i = 0; i < pool.length; i += 1) {
    const candidate = scoreBrandCandidate(pool[i]!, i);
    if (!candidate) continue;
    const globalCandidate = { ...candidate, sourceIndex: i, source: "global" as const };
    if (!bestGlobal || globalCandidate.score > bestGlobal.score) bestGlobal = globalCandidate;
  }

  const best = bestAnchored && bestAnchored.score >= 0.62 ? bestAnchored : bestGlobal;

  if (!best) {
    const tentative = extractTentativeBrandCandidate(pool, classLineIndex);
    if (tentative) {
      return {
        value: tentative,
        confidence: 0.35,
        reason: "Low-confidence tentative brand candidate preserved for review (no strict match).",
      };
    }
    return {
      value: null,
      confidence: 0,
      reason: "No high-quality brand candidate detected in OCR text.",
    };
  }

  if (best.score < 0.62) {
    const tentative = extractTentativeBrandCandidate(pool, classLineIndex);
    if (tentative) {
      return {
        value: tentative,
        confidence: 0.35,
        reason: `Low-confidence tentative brand candidate preserved for review (strict score ${best.score.toFixed(2)}).`,
      };
    }
    return {
      value: null,
      confidence: 0,
      reason: `Best brand candidate looked noisy (score ${best.score.toFixed(2)}); deferring to manual review.`,
    };
  }

  return {
    value: best.value,
    confidence: brandConfidenceFromScore(best.score),
    reason: `Brand candidate selected from OCR lines (score ${best.score.toFixed(2)}, alpha ${best.alphaRatio.toFixed(2)}, symbols ${best.symbolRatio.toFixed(2)}, source ${best.source}@line${best.sourceIndex + 1}).`,
  };
}

function extractGovernmentWarning(text: string): string | null {
  const lower = text.toLowerCase();
  const start = lower.indexOf("government warning");
  if (start < 0) return null;
  const healthProblemsIdx = lower.indexOf("health problems", start);
  const naturalEnd =
    healthProblemsIdx >= 0
      ? Math.min(text.length, healthProblemsIdx + "health problems".length + 2)
      : Math.min(text.length, start + 900);
  return text
    .slice(start, naturalEnd)
    .replace(/\s+/g, " ")
    .trim();
}

type WarningAssessment = {
  value: string | null;
  confidence: number;
  reason: string;
};

function warningConfidenceFromScore(score: number): number {
  if (score >= 0.86) return 0.74;
  if (score >= 0.74) return 0.68;
  if (score >= 0.62) return 0.62;
  return 0.48;
}

function assessGovernmentWarning(value: string | null): WarningAssessment {
  if (!value) {
    return {
      value: null,
      confidence: 0,
      reason: "Government warning heading not found in OCR text.",
    };
  }

  const normalized = finalizeGovernmentWarningExtraction(value.replace(/\s+/g, " ").trim());
  const lower = normalized.toLowerCase();
  const stats = lineStats(normalized);
  const printable = stats.letters + stats.digits + stats.symbols;
  const alphaRatio = printable > 0 ? stats.letters / printable : 0;
  const symbolRatio = printable > 0 ? stats.symbols / printable : 1;

  const signalChecks = [
    "government warning",
    "(1)",
    "(2)",
    "surgeon general",
    "pregnan",
    "birth defects",
    "operate machinery",
    "health problems",
  ];
  const matchedSignals = signalChecks.filter((signal) => lower.includes(signal)).length;

  const lengthScore =
    normalized.length >= 240 ? 0.24 : normalized.length >= 180 ? 0.17 : normalized.length >= 120 ? 0.1 : 0.03;
  const signalScore = (matchedSignals / signalChecks.length) * 0.56;
  const alphaScore = alphaRatio >= 0.72 ? 0.12 : alphaRatio >= 0.62 ? 0.06 : 0;
  const symbolScore = symbolRatio <= 0.12 ? 0.08 : symbolRatio <= 0.2 ? 0.04 : 0;
  const qualityScore = Math.min(1, lengthScore + signalScore + alphaScore + symbolScore);
  const confidence = warningConfidenceFromScore(qualityScore);

  return {
    value: normalized,
    confidence,
    reason: `Government warning OCR quality score ${qualityScore.toFixed(2)} with ${matchedSignals}/${signalChecks.length} warning signals.`,
  };
}

export function extractFromOcrText(
  text: string,
  opts?: { leftPanelText?: string | null },
): ExtractionResult["fields"] {
  const out = emptyExtractionFields("OCR field not confidently detected.");
  if (!text) {
    return emptyExtractionFields("OCR returned no text.");
  }

  const leftPanelText = opts?.leftPanelText?.trim() ? opts.leftPanelText : null;
  const lines = extractLines(text);
  const leftLines = leftPanelText ? extractLines(leftPanelText) : lines;
  const classificationText = leftPanelText ?? text;
  const brand = extractBrand(leftLines);
  const classType = extractClassTypeValue(classificationText);
  const alcoholContent = firstRegex(
    classificationText,
    /\b(\d+(?:\.\d+)?\s*(?:% ?(?:alc\/vol|abv)?|proof))\b/i,
  );
  const netContents = firstRegex(
    classificationText,
    /\b(\d+(?:\.\d+)?\s*(?:ml|mL|l|L|fl\.?\s*oz|fluid ounces?))\b/i,
  );
  const governmentWarning = assessGovernmentWarning(extractGovernmentWarning(text));
  const nameAddress = firstRegex(
    text,
    /\b((?:bottled|distilled|produced|crafted|imported|manufactured)\s+by[^.\n]{5,180})/i,
  );
  const countryOfOrigin = firstRegex(
    text,
    /\b(?:product of|made in)\s+([A-Za-z][A-Za-z .,'-]{1,60})\b/i,
  );

  const inferredBrand = brand.value && brand.confidence >= 0.62 ? null : inferBrandFromNameAddress(nameAddress);
  out.brandName = buildField(
    inferredBrand?.value ?? brand.value,
    inferredBrand?.confidence ?? brand.confidence,
    inferredBrand?.reason ?? brand.reason,
  );
  out.classType = buildField(
    classType,
    0.86,
    classType ? "Class/type matched via OCR keyword pattern." : "Class/type keyword not found in OCR text.",
  );
  out.alcoholContent = buildField(
    alcoholContent,
    0.9,
    alcoholContent ? "Alcohol content parsed from OCR pattern." : "Alcohol content pattern not found in OCR text.",
  );
  out.netContents = buildField(
    netContents,
    0.9,
    netContents ? "Net contents parsed from OCR pattern." : "Net contents pattern not found in OCR text.",
  );
  out.governmentWarning = buildField(
    governmentWarning.value,
    governmentWarning.confidence,
    governmentWarning.reason,
  );
  out.nameAddress = buildField(
    nameAddress,
    0.62,
    nameAddress ? "Name/address phrase matched from OCR text." : "Name/address phrase not found in OCR text.",
  );
  out.countryOfOrigin = buildField(
    countryOfOrigin,
    0.66,
    countryOfOrigin
      ? "Country of origin phrase matched from OCR text."
      : "Country of origin phrase not found in OCR text.",
  );

  return out;
}

export function createTesseractProvider(): ExtractionProvider {
  return {
    async extract(imageBytes: Buffer): Promise<ExtractionResult> {
      const started = Date.now();
      try {
        const worker = await getWorker();
        const result = await worker.recognize(imageBytes);
        const text = normalizeText(result?.data?.text ?? "");
        const words = normalizeOcrWords(result?.data?.words);
        const dualPanel = extractDualPanelText(words);
        const leftPanelText =
          dualPanel && shouldUseLeftPanelClassificationText(dualPanel) ? dualPanel.leftText : null;
        return {
          provider: "tesseract",
          durationMs: Date.now() - started,
          fields: extractFromOcrText(text, { leftPanelText }),
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
        throw new Error(`Tesseract extraction failed: ${message}`);
      }
    },
  };
}
