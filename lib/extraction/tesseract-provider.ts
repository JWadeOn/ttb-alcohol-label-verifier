import path from "node:path";
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

function extractBrand(lines: string[]): string | null {
  for (const line of lines.slice(0, 8)) {
    const lower = line.toLowerCase();
    if (
      lower.includes("government warning") ||
      lower.includes("%") ||
      lower.includes("proof") ||
      lower.includes("ml") ||
      lower.includes("fl oz")
    ) {
      continue;
    }
    if (line.length >= 3 && line.length <= 64) return line;
  }
  return null;
}

function extractGovernmentWarning(text: string): string | null {
  const lower = text.toLowerCase();
  const start = lower.indexOf("government warning");
  if (start < 0) return null;
  return text.slice(start, Math.min(text.length, start + 900)).trim();
}

function extractFromOcrText(text: string): ExtractionResult["fields"] {
  const out = emptyExtractionFields("OCR field not confidently detected.");
  if (!text) {
    return emptyExtractionFields("OCR returned no text.");
  }

  const lines = extractLines(text);
  const brand = extractBrand(lines);
  const classType = firstRegex(
    text,
    /\b((?:straight\s+)?(?:bourbon|rye|corn|malt)?\s*whiskey|vodka|gin|rum|tequila|liqueur|spirit)\b/i,
  );
  const alcoholContent = firstRegex(text, /\b(\d+(?:\.\d+)?\s*(?:% ?(?:alc\/vol|abv)?|proof))\b/i);
  const netContents = firstRegex(
    text,
    /\b(\d+(?:\.\d+)?\s*(?:ml|mL|l|L|fl\.?\s*oz|fluid ounces?))\b/i,
  );
  const governmentWarning = extractGovernmentWarning(text);
  const nameAddress = firstRegex(
    text,
    /\b((?:bottled|distilled|produced|crafted|imported|manufactured)\s+by[^.\n]{5,180})/i,
  );
  const countryOfOrigin = firstRegex(
    text,
    /\b(?:product of|made in)\s+([A-Za-z][A-Za-z .,'-]{1,60})\b/i,
  );

  out.brandName = buildField(
    brand,
    0.7,
    brand ? "Brand candidate inferred from top OCR lines." : "Brand candidate missing in OCR text.",
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
    governmentWarning,
    0.68,
    governmentWarning
      ? "Government warning block detected from OCR text."
      : "Government warning heading not found in OCR text.",
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
        return {
          provider: "tesseract",
          durationMs: Date.now() - started,
          fields: extractFromOcrText(text),
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
        throw new Error(`Tesseract extraction failed: ${message}`);
      }
    },
  };
}
