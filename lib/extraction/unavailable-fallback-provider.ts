import type { ExtractionProvider } from "@/lib/extraction/provider";
import {
  emptyExtractionFields,
  type ExtractionResult,
} from "@/lib/extraction/types";

/** Last-resort fallback when both OCR and LLM extraction paths are unavailable. */
export function createUnavailableFallbackProvider(): ExtractionProvider {
  return {
    async extract(): Promise<ExtractionResult> {
      const started = Date.now();
      return {
        provider: "unavailable",
        durationMs: Date.now() - started,
        fields: emptyExtractionFields(
          "No extraction provider produced a usable result for this request.",
        ),
      };
    },
  };
}
