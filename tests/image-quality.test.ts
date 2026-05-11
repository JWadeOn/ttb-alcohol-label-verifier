import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { assessImageQuality } from "@/lib/image-quality";
import { createTestLabelPng } from "./helpers/test-image";

describe("assessImageQuality", () => {
  it("rejects tiny images", async () => {
    const tiny = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .png()
      .toBuffer();

    const result = await assessImageQuality(tiny);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("too small");
    }
  });

  it("accepts moderately textured PNG fixtures", async () => {
    const png = await createTestLabelPng();
    const result = await assessImageQuality(png);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.processedBuffer.byteLength).toBeGreaterThan(100);
    }
  });
});
