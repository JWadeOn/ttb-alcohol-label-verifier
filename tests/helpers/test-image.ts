import sharp from "sharp";

/** Produces a decodable PNG large enough for image-quality gate checks */
export async function createTestLabelPng(): Promise<Buffer> {
  const width = 120;
  const height = 120;
  const channels = 3;
  const raw = Buffer.alloc(width * height * channels);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = Math.floor(Math.random() * 256);
  }

  return sharp(raw, {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer();
}
