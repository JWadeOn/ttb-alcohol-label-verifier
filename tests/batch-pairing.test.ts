import { describe, expect, it } from "vitest";
import { fileBaseName, pairBatchFiles } from "@/lib/batch-pairing";

function f(name: string) {
  return { name };
}

describe("pairBatchFiles", () => {
  it("pairs by matching basename", () => {
    const result = pairBatchFiles(
      [f("alpha.png"), f("beta.jpg")],
      [f("beta.json"), f("alpha.json")],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.method).toBe("basename");
    expect(result.result.pairs.map((p) => p.image.name)).toEqual(["alpha.png", "beta.jpg"]);
    expect(result.result.pairs.map((p) => p.application.name)).toEqual(["alpha.json", "beta.json"]);
  });

  it("falls back to sort order when basenames differ", () => {
    const result = pairBatchFiles([f("z.png"), f("a.png")], [f("one.json"), f("two.json")]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.method).toBe("sort_order");
    expect(result.result.warning).toBeTruthy();
    expect(result.result.pairs[0]?.image.name).toBe("z.png");
    expect(result.result.pairs[0]?.application.name).toBe("two.json");
    expect(result.result.pairs[1]?.image.name).toBe("a.png");
    expect(result.result.pairs[1]?.application.name).toBe("one.json");
  });

  it("rejects count mismatch", () => {
    const result = pairBatchFiles([f("a.png")], [f("a.json"), f("b.json")]);
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate application stems", () => {
    const result = pairBatchFiles([f("a.png"), f("b.png")], [f("same.json"), f("SAME.JSON")]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Duplicate");
  });
});

describe("fileBaseName", () => {
  it("strips path and extension", () => {
    expect(fileBaseName("/tmp/foo.bar.png")).toBe("foo.bar");
  });
});
