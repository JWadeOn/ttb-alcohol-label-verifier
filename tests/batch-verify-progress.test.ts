import { describe, expect, it } from "vitest";
import {
  batchVerifyItemStatus,
  batchVerifyProgressCaption,
  batchVerifyProgressIntervalMs,
  batchVerifyProgressPercent,
} from "@/lib/batch-verify-progress";

describe("batchVerifyProgressIntervalMs", () => {
  it("returns shorter intervals for larger batches", () => {
    expect(batchVerifyProgressIntervalMs(8)).toBeLessThan(batchVerifyProgressIntervalMs(2));
  });
});

describe("batchVerifyItemStatus", () => {
  it("marks all done when finishing", () => {
    expect(batchVerifyItemStatus(2, 0, "finishing")).toBe("done");
  });

  it("marks active index as running during processing", () => {
    expect(batchVerifyItemStatus(0, 2, "processing")).toBe("done");
    expect(batchVerifyItemStatus(2, 2, "processing")).toBe("running");
    expect(batchVerifyItemStatus(3, 2, "processing")).toBe("pending");
  });
});

describe("batchVerifyProgressPercent", () => {
  it("reaches 100 when finishing", () => {
    expect(batchVerifyProgressPercent("finishing", 0, 5)).toBe(100);
  });

  it("stays below 100 while processing", () => {
    expect(batchVerifyProgressPercent("processing", 4, 5)).toBeLessThan(100);
  });
});

describe("batchVerifyProgressCaption", () => {
  it("mentions prepare phase", () => {
    expect(batchVerifyProgressCaption("prepare", 0, 3, "a.png")).toMatch(/Preparing/i);
  });

  it("mentions label index during processing", () => {
    expect(batchVerifyProgressCaption("processing", 1, 3, "b.png")).toMatch(/2 of 3/);
  });
});
