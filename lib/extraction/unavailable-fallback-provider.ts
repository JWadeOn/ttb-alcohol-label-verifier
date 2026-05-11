import type { ExtractionProvider } from "@/lib/extraction/provider";
import {
  emptyExtractionFields,
  type ExtractionResult,
} from "@/lib/extraction/types";

/** Phase 1 placeholder until Tesseract fallback lands (Phase 2). */
export function createUnavailableFallbackProvider(): ExtractionProvider {
  return {
    async extract(): Promise<ExtractionResult> {
      const started = Date.now();
      return {
        provider: "unavailable",
        durationMs: Date.now() - started,
        fields: emptyExtractionFields(
          "Fallback OCR not configured yet — Phase 2 wires Tesseract here.",
        ),
      };
    },
  };
}
