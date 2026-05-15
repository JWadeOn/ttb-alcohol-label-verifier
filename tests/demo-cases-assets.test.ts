import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_CASES } from "@/lib/demo-cases";

const root = path.join(process.cwd(), "fixtures");

describe("demo case fixtures", () => {
  it.each(DEMO_CASES.map((demoCase) => [demoCase.id, demoCase] as const))(
    "assets exist for %s",
    async (_id, demoCase) => {
      await expect(access(path.join(root, demoCase.imageRelativePath))).resolves.toBeUndefined();
      await expect(access(path.join(root, demoCase.applicationRelativePath))).resolves.toBeUndefined();
    },
  );
});
