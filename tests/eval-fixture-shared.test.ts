import { describe, expect, it } from "vitest";
import {
  deriveBatchItemOutcome,
  scoreBatchTransport,
} from "../evals/fixture-eval-shared.mjs";

describe("eval fixture-eval-shared", () => {
  it("deriveBatchItemOutcome mirrors batch-results rules", () => {
    expect(
      deriveBatchItemOutcome({
        ok: false,
        result: undefined,
      }),
    ).toBe("error");
    expect(
      deriveBatchItemOutcome({
        ok: true,
        result: {
          validation: {
            fields: [{ fieldId: "brandName", status: "pass" }],
          },
        },
      }),
    ).toBe("pass");
    expect(
      deriveBatchItemOutcome({
        ok: true,
        result: {
          validation: {
            fields: [{ fieldId: "brandName", status: "fail" }],
          },
        },
      }),
    ).toBe("fail");
  });

  it("scoreBatchTransport checks item count and errors", () => {
    const scored = scoreBatchTransport(
      {
        summary: { total: 2, success: 2, totalMs: 100 },
        items: [
          { index: 0, ok: true, result: { validation: { fields: [{ status: "pass" }] } } },
          { index: 1, ok: true, result: { validation: { fields: [{ status: "pass" }] } } },
        ],
      },
      ["a", "b"],
      { batch: { maxErrorItems: 0, maxWallMs: 5000 }, fixtures: {}, thresholds: {} },
    );
    expect(scored.pass).toBe(true);
    expect(scored.outcomeCounts.pass).toBe(2);
  });
});
