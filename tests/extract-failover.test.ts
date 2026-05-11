import { describe, expect, it } from "vitest";
import { extractWithFailover } from "@/lib/extraction/provider";
import type { ExtractionProvider } from "@/lib/extraction/provider";
import {
  emptyExtractionFields,
  type ExtractionResult,
} from "@/lib/extraction/types";

describe("extractWithFailover", () => {
  const buf = Buffer.from([1, 2, 3]);

  it("returns primary result when primary resolves before abort", async () => {
    const primary: ExtractionProvider = {
      async extract(): Promise<ExtractionResult> {
        return {
          provider: "openai",
          durationMs: 1,
          fields: emptyExtractionFields(),
        };
      },
    };

    const fallback: ExtractionProvider = {
      async extract(): Promise<ExtractionResult> {
        return {
          provider: "unavailable",
          durationMs: 1,
          fields: emptyExtractionFields("should not win"),
        };
      },
    };

    const result = await extractWithFailover(buf, primary, fallback, {
      softTimeoutMs: 3000,
      hardTimeoutMs: 3500,
    });

    expect(result.provider).toBe("openai");
  });

  it("falls back when primary abort signal fires", async () => {
    const primary: ExtractionProvider = {
      extract(_imageBytes, signal): Promise<ExtractionResult> {
        return new Promise((_, reject) => {
          const onAbort = () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          };
          signal?.addEventListener("abort", onAbort, { once: true });
          setTimeout(() => {
            /* hang intentionally */
          }, 60_000);
        });
      },
    };

    const fallback: ExtractionProvider = {
      async extract(): Promise<ExtractionResult> {
        return {
          provider: "unavailable",
          durationMs: 2,
          fields: emptyExtractionFields(),
        };
      },
    };

    const result = await extractWithFailover(buf, primary, fallback, {
      softTimeoutMs: 10,
      hardTimeoutMs: 40,
    });

    expect(result.provider).toBe("unavailable");
  });
});
