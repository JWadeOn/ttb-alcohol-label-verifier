/**
 * Writes deterministic textured PNGs for eval / pipeline smoke (not readable text).
 * Run: node scripts/generate-fixture-pngs.mjs
 * Requires: sharp (project dependency).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "fixtures", "labels", "seed-textures");

const WIDTH = 200;
const HEIGHT = 200;
const CHANNELS = 3;
const COUNT = 9;

function fillRaw(seed) {
  const raw = Buffer.alloc(WIDTH * HEIGHT * CHANNELS);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = (seed * 131 + i * 17) % 256;
  }
  return raw;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  for (let n = 1; n <= COUNT; n++) {
    const seed = 1000 + n;
    const buf = await sharp(fillRaw(seed), {
      raw: { width: WIDTH, height: HEIGHT, channels: CHANNELS },
    })
      .png()
      .toBuffer();
    const name = `seed-texture-${String(n).padStart(2, "0")}.png`;
    const fp = path.join(outDir, name);
    await writeFile(fp, buf);
    console.log("wrote", path.relative(root, fp));
  }
  console.log("done:", COUNT, "fixtures");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
