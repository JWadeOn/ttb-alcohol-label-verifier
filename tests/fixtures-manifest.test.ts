import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("fixtures manifest", () => {
  it("lists fixtures whose files exist on disk", async () => {
    const raw = await readFile(path.join(root, "fixtures", "manifest.json"), "utf8");
    const manifest = JSON.parse(raw) as {
      fixtures: { id: string; relativePath: string; applicationPath?: string }[];
    };
    expect(manifest.fixtures.length).toBeGreaterThanOrEqual(5);

    for (const f of manifest.fixtures) {
      const abs = path.join(root, "fixtures", f.relativePath);
      const buf = await readFile(abs);
      expect(buf.byteLength).toBeGreaterThan(100);
      if (typeof f.applicationPath === "string" && f.applicationPath.trim().length > 0) {
        const applicationAbs = path.join(root, "fixtures", f.applicationPath);
        const applicationRaw = await readFile(applicationAbs, "utf8");
        expect(applicationRaw.trim().length).toBeGreaterThan(2);
      }
    }
  });

  it("default application JSON parses as strict application schema", async () => {
    const { ApplicationJsonSchema } = await import("@/lib/schemas");
    const raw = await readFile(path.join(root, "fixtures", "default-application.json"), "utf8");
    const parsed = ApplicationJsonSchema.safeParse(JSON.parse(raw));
    expect(parsed.success).toBe(true);
  });
});
