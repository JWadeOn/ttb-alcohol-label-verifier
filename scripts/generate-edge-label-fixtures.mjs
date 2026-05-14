/**
 * Derives synthetic edge-case PNGs from the happy-path label for eval coverage
 * (glare overlay, moderate blur, camera-style tilt). Run after the base label exists:
 *
 *   node scripts/generate-edge-label-fixtures.mjs
 *
 * Requires: sharp (project dependency).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "fixtures", "labels", "on-bottle");
const srcPath = path.join(outDir, "liquor_label_happy_path.png");

const OUT = {
  glare: path.join(outDir, "edge-synthetic-glare.png"),
  blur: path.join(outDir, "edge-synthetic-moderate-blur.png"),
  tilt: path.join(outDir, "edge-synthetic-tilt.png"),
};

/** Laplacian variance (downscaled greyscale) — must stay >= 12 for assessImageQuality pass. */
async function laplacianVarianceRGBA(input) {
  const { data, info } = await sharp(input)
    .rotate()
    .greyscale()
    .resize({ width: 512, height: 512, fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const lap = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const c = data[i];
      const lapVal = -4 * c + data[i - 1] + data[i + 1] + data[i - width] + data[i + width];
      lap[i] = lapVal;
    }
  }

  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let i = 0; i < lap.length; i++) {
    const v = lap[i];
    sum += v;
    sumSq += v * v;
    n++;
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

async function main() {
  const bytes = await readFile(srcPath);
  const meta = await sharp(bytes).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 48 || h < 48) {
    throw new Error(`Source label too small: ${w}x${h}`);
  }

  const glareSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="white" stop-opacity="0.82"/>
      <stop offset="42%" stop-color="white" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`;

  const glareBuf = await sharp(bytes)
    .ensureAlpha()
    .composite([{ input: Buffer.from(glareSvg), top: 0, left: 0, blend: "screen" }])
    .png()
    .toBuffer();
  await writeFile(OUT.glare, glareBuf);
  const glareVar = await laplacianVarianceRGBA(glareBuf);
  console.log("wrote", path.relative(root, OUT.glare), "laplacianVar≈", glareVar.toFixed(2));

  const BLUR_MIN = 12;
  let blurSigma = 2.2;
  let blurBuf = await sharp(bytes).blur(blurSigma).png().toBuffer();
  let blurVar = await laplacianVarianceRGBA(blurBuf);
  while (blurVar < BLUR_MIN + 0.5 && blurSigma > 0.4) {
    blurSigma = Math.round((blurSigma - 0.25) * 100) / 100;
    blurBuf = await sharp(bytes).blur(blurSigma).png().toBuffer();
    blurVar = await laplacianVarianceRGBA(blurBuf);
  }
  if (blurVar < BLUR_MIN) {
    throw new Error(
      `Blur fixture still below gate (var ${blurVar.toFixed(2)} < ${BLUR_MIN}); reduce blur further or change source label.`,
    );
  }
  await writeFile(OUT.blur, blurBuf);
  console.log(
    "wrote",
    path.relative(root, OUT.blur),
    `blurSigma=${blurSigma}`,
    "laplacianVar≈",
    blurVar.toFixed(2),
  );

  const tiltBuf = await sharp(bytes)
    .rotate(22, { background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  await writeFile(OUT.tilt, tiltBuf);
  const tiltVar = await laplacianVarianceRGBA(tiltBuf);
  console.log("wrote", path.relative(root, OUT.tilt), "laplacianVar≈", tiltVar.toFixed(2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
