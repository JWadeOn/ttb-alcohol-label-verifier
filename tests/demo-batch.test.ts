import { describe, expect, it } from "vitest";
import {
  BATCH_DEMO_SUITES,
  BATCH_DEMO_SUITES_BY_ID,
  DEMO_CASES,
  getBatchDemoSuiteOutcomes,
} from "@/lib/demo-cases";
import { batchDemoItemsToUploadFiles } from "@/lib/demo-load";
import { pairBatchFiles } from "@/lib/batch-pairing";
import { GET as GET_SUITE } from "@/app/api/demo-cases/batch/[suiteId]/route";

async function loadSuite(suiteId: string) {
  const res = await GET_SUITE(new Request("http://test"), {
    params: Promise.resolve({ suiteId }),
  });
  return { res, json: (await res.json()) as { id: string; items: unknown[] } };
}

describe("batch demo suites", () => {
  it("defines three curated presets", () => {
    expect(BATCH_DEMO_SUITES).toHaveLength(3);
    expect(BATCH_DEMO_SUITES.map((s) => s.id)).toEqual([
      "batch-clean-pass",
      "batch-one-fail",
      "batch-mixed-half",
    ]);
  });

  it("clean pass batch is all pass cases", () => {
    const suite = BATCH_DEMO_SUITES_BY_ID["batch-clean-pass"];
    const outcomes = getBatchDemoSuiteOutcomes(suite);
    expect(outcomes.passCount).toBe(4);
    expect(outcomes.failCount).toBe(0);
    expect(suite.caseIds).toHaveLength(4);
  });

  it("one-fail batch has exactly one expected fail case", () => {
    const suite = BATCH_DEMO_SUITES_BY_ID["batch-one-fail"];
    const outcomes = getBatchDemoSuiteOutcomes(suite);
    expect(outcomes.passCount).toBe(3);
    expect(outcomes.failCount).toBe(1);
    expect(suite.caseIds).toContain("synthetic-whiskey-cream-fail-brand");
  });

  it("mixed-half batch is four pass and four fail", () => {
    const suite = BATCH_DEMO_SUITES_BY_ID["batch-mixed-half"];
    const outcomes = getBatchDemoSuiteOutcomes(suite);
    expect(outcomes.passCount).toBe(4);
    expect(outcomes.failCount).toBe(4);
    expect(suite.caseIds).toHaveLength(DEMO_CASES.length);
  });

  it("upload file names pair by basename for each suite", async () => {
    for (const suite of BATCH_DEMO_SUITES) {
      const items = suite.caseIds.map((caseId) => ({
        caseId,
        applicationJson: "{}",
        image: { fileName: `${caseId}.png`, mimeType: "image/png", base64: "aGk=" },
      }));
      const { images, applications } = batchDemoItemsToUploadFiles(items);
      const paired = pairBatchFiles(images, applications);
      expect(paired.ok).toBe(true);
      if (!paired.ok) continue;
      expect(paired.result.pairs).toHaveLength(suite.caseIds.length);
    }
  });

  it("batch API returns items for each suite", async () => {
    for (const suite of BATCH_DEMO_SUITES) {
      const { res, json } = await loadSuite(suite.id);
      expect(res.status).toBe(200);
      expect(json.id).toBe(suite.id);
      expect(json.items).toHaveLength(suite.caseIds.length);
    }
  });

  it("rejects unknown suite id", async () => {
    const { res } = await loadSuite("not-a-suite");
    expect(res.status).toBe(404);
  });
});
