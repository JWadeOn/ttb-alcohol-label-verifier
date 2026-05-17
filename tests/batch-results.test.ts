import { describe, expect, it } from "vitest";
import {
  buildBatchResultsDigest,
  deriveBatchItemOutcome,
  filterBatchItems,
} from "@/lib/batch-results";
import type { VerifyBatchItem, VerifyBatchResponse, VerifySuccessResponse } from "@/lib/schemas";

const mockTimings: VerifySuccessResponse["timings"] = {
  imageQualityMs: 0,
  ocrMs: 0,
  llmMs: 0,
  extractionMs: 0,
  validationMs: 0,
  totalMs: 0,
  cacheHit: false,
};

function item(partial: Partial<VerifyBatchItem> & Pick<VerifyBatchItem, "index" | "fileName" | "ok">): VerifyBatchItem {
  return {
    status: partial.ok ? 200 : 500,
    durationMs: 100,
    ...partial,
  };
}

function response(items: VerifyBatchItem[]): VerifyBatchResponse {
  const pass = items.filter((i) => deriveBatchItemOutcome(i) === "pass").length;
  const fail = items.filter((i) => deriveBatchItemOutcome(i) === "fail").length;
  const manualReview = items.filter((i) => deriveBatchItemOutcome(i) === "manual_review").length;
  const error = items.filter((i) => deriveBatchItemOutcome(i) === "error").length;
  return {
    requestId: "00000000-0000-4000-8000-000000000001",
    summary: {
      total: items.length,
      success: items.filter((i) => i.ok).length,
      error,
      pass,
      fail,
      manualReview,
      totalMs: 500,
    },
    items,
  };
}

describe("deriveBatchItemOutcome", () => {
  it("returns error when item is not ok", () => {
    expect(
      deriveBatchItemOutcome(
        item({ index: 0, fileName: "a.png", ok: false, error: { code: "X", message: "fail" } }),
      ),
    ).toBe("error");
  });

  it("returns fail when any field fails", () => {
    expect(
      deriveBatchItemOutcome(
        item({
          index: 0,
          fileName: "a.png",
          ok: true,
          result: {
            requestId: "00000000-0000-4000-8000-000000000002",
            imageQuality: { ok: true },
            extraction: { provider: "openai", durationMs: 1, fields: {} },
            validation: {
              fields: [
                {
                  fieldId: "brandName",
                  status: "fail",
                  message: "mismatch",
                  extractedValue: "a",
                  applicationValue: "b",
                  evidence: null,
                },
              ],
            },
            timings: mockTimings,
          },
        }),
      ),
    ).toBe("fail");
  });

  it("returns pass when all fields pass", () => {
    expect(
      deriveBatchItemOutcome(
        item({
          index: 0,
          fileName: "a.png",
          ok: true,
          result: {
            requestId: "00000000-0000-4000-8000-000000000003",
            imageQuality: { ok: true },
            extraction: { provider: "openai", durationMs: 1, fields: {} },
            validation: {
              fields: [
                {
                  fieldId: "brandName",
                  status: "pass",
                  message: "ok",
                  extractedValue: "a",
                  applicationValue: "a",
                  evidence: null,
                },
              ],
            },
            timings: mockTimings,
          },
        }),
      ),
    ).toBe("pass");
  });
});

describe("buildBatchResultsDigest", () => {
  it("counts applications by outcome", () => {
    const items = [
      item({ index: 0, fileName: "a.png", ok: false, error: { code: "E", message: "x" } }),
      item({
        index: 1,
        fileName: "b.png",
        ok: true,
        result: {
          requestId: "00000000-0000-4000-8000-000000000004",
          imageQuality: { ok: true },
          extraction: { provider: "openai", durationMs: 1, fields: {} },
          validation: {
            fields: [
              {
                fieldId: "brandName",
                status: "pass",
                message: "ok",
                extractedValue: "a",
                applicationValue: "a",
                evidence: null,
              },
            ],
          },
          timings: mockTimings,
        },
      }),
    ];
    const digest = buildBatchResultsDigest(response(items));
    expect(digest.counts.error).toBe(1);
    expect(digest.counts.pass).toBe(1);
    expect(digest.applicationCount).toBe(2);
  });
});

describe("filterBatchItems", () => {
  it("filters by outcome", () => {
    const items = [
      item({ index: 0, fileName: "a.png", ok: false, error: { code: "E", message: "x" } }),
      item({
        index: 1,
        fileName: "b.png",
        ok: true,
        result: {
          requestId: "00000000-0000-4000-8000-000000000005",
          imageQuality: { ok: true },
          extraction: { provider: "openai", durationMs: 1, fields: {} },
          validation: {
            fields: [
              {
                fieldId: "brandName",
                status: "pass",
                message: "ok",
                extractedValue: "a",
                applicationValue: "a",
                evidence: null,
              },
            ],
          },
          timings: mockTimings,
        },
      }),
    ];
    expect(filterBatchItems(items, "error")).toHaveLength(1);
    expect(filterBatchItems(items, "error")[0]?.fileName).toBe("a.png");
  });
});
