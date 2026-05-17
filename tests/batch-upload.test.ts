import { describe, expect, it } from "vitest";
import { normalizeBatchApplicationFiles, normalizeBatchImageFiles } from "@/lib/batch-upload";

function file(name: string, type: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("normalizeBatchImageFiles", () => {
  it("keeps images and sorts by name", () => {
    const result = normalizeBatchImageFiles([
      file("b.png", "image/png"),
      file("readme.txt", "text/plain"),
      file("a.jpg", "image/jpeg"),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.files.map((f) => f.name)).toEqual(["a.jpg", "b.png"]);
  });

  it("rejects when no images in selection", () => {
    const result = normalizeBatchImageFiles([file("notes.txt", "text/plain")]);
    expect(result.ok).toBe(false);
  });
});

describe("normalizeBatchApplicationFiles", () => {
  it("keeps json files only", () => {
    const result = normalizeBatchApplicationFiles([
      file("b.json", "application/json"),
      file("a.png", "image/png"),
      file("a.json", "application/json"),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.files.map((f) => f.name)).toEqual(["a.json", "b.json"]);
  });
});
