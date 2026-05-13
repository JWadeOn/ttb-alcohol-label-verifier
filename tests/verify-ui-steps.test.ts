import { describe, expect, it } from "vitest";
import {
  buildVerifyUiStepsFromResponse,
  buildVerifyUiStepsLoading,
  verifyResponseIndicatesPipelineFailure,
} from "@/lib/verify-ui-steps";

describe("buildVerifyUiStepsLoading", () => {
  it("highlights only the active index as running; earlier are upstream", () => {
    const s0 = buildVerifyUiStepsLoading(0);
    expect(s0.map((x) => x.state)).toEqual(["running", "pending", "pending", "pending"]);

    const s2 = buildVerifyUiStepsLoading(2);
    expect(s2.map((x) => x.state)).toEqual(["upstream", "upstream", "running", "pending"]);
  });

  it("clamps active index to 0–3", () => {
    const s = buildVerifyUiStepsLoading(99);
    expect(s[3].state).toBe("running");
    expect(s.map((x) => x.state).filter((t) => t === "upstream")).toHaveLength(3);
  });
});

describe("buildVerifyUiStepsFromResponse", () => {
  it("marks all complete on success", () => {
    const steps = buildVerifyUiStepsFromResponse({
      httpStatus: 200,
      successPayload: {
        requestId: "00000000-0000-4000-8000-000000000001",
        imageQuality: { ok: true },
        extraction: {
          provider: "openai",
          durationMs: 10,
          fields: {},
        },
        validation: { fields: [] },
        timings: {
          imageQualityMs: 1,
          ocrMs: 1,
          llmMs: 1,
          extractionMs: 1,
          validationMs: 1,
          totalMs: 1,
          cacheHit: false,
        },
      },
      errorPayload: null,
      errorText: null,
    });
    expect(steps.every((s) => s.state === "complete")).toBe(true);
  });

  it("fails image gate on IMAGE_QUALITY_REJECTED", () => {
    const steps = buildVerifyUiStepsFromResponse({
      httpStatus: 422,
      successPayload: null,
      errorPayload: {
        requestId: "00000000-0000-4000-8000-000000000002",
        code: "IMAGE_QUALITY_REJECTED",
        message: "Too small",
      },
      errorText: null,
    });
    expect(steps[1].state).toBe("failed");
    expect(steps[2].state).toBe("skipped");
  });
});

describe("verifyResponseIndicatesPipelineFailure", () => {
  it("is false on success", () => {
    expect(
      verifyResponseIndicatesPipelineFailure({
        successPayload: {
          requestId: "00000000-0000-4000-8000-000000000099",
          imageQuality: { ok: true },
          extraction: { provider: "openai", durationMs: 1, fields: {} },
          validation: { fields: [] },
          timings: {
            imageQualityMs: 1,
            ocrMs: 0,
            llmMs: 1,
            extractionMs: 1,
            validationMs: 1,
            totalMs: 1,
            cacheHit: false,
          },
        },
        errorPayload: null,
        errorText: null,
      }),
    ).toBe(false);
  });

  it("is true on error payload", () => {
    expect(
      verifyResponseIndicatesPipelineFailure({
        successPayload: null,
        errorPayload: {
          requestId: "00000000-0000-4000-8000-000000000003",
          code: "X",
          message: "m",
        },
        errorText: null,
      }),
    ).toBe(true);
  });
});
