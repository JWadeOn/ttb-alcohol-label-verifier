import { describe, expect, it } from "vitest";
import { ApplicationJsonSchema } from "@/lib/schemas";

describe("ApplicationJsonSchema", () => {
  it("accepts minimal payloads", () => {
    const r = ApplicationJsonSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("rejects unknown keys (strict)", () => {
    const r = ApplicationJsonSchema.safeParse({
      brandName: "x",
      extraField: true,
    });
    expect(r.success).toBe(false);
  });
});
