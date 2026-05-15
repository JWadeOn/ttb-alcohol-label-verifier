/**
 * Generate Batch 01 synthetic eval fixtures using Gemini for baseline labels.
 *
 * Required env:
 *   GEMINI_API_KEY=...
 *
 * Optional env:
 *   GEMINI_IMAGE_MODEL=gemini-2.0-flash-preview-image-generation
 *
 * Run:
 *   node scripts/generate-synthetic-eval-fixtures-gemini.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const labelsDir = path.join(root, "fixtures", "labels");
const applicationsDir = path.join(root, "fixtures", "applications");

const WIDTH = 900;
const HEIGHT = 600;
const MAX_BYTES = 1.5 * 1024 * 1024;
const DEFAULT_JPEG_QUALITY = 80;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";
const GEMINI_REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS ?? "120000");
const GEMINI_MAX_ATTEMPTS = Number(process.env.GEMINI_MAX_ATTEMPTS ?? "3");

const VARIANTS = [
  "baseline_front",
  "glare_brand",
  "angle_30",
  "low_light_grain",
  "crop_warning_partial",
];

const FAMILY_CONFIGS = [
  {
    idPrefix: "synthetic_eval_whiskey_cream",
    brandName: "Cinder Ridge",
    classType: "Straight Bourbon Whiskey",
    alcoholContent: "45% ALC/VOL",
    netContents: "750 mL",
    nameAddress: "Bottled by Cinder Ridge Distilling, Bardstown, KY",
    countryOfOrigin: "",
    isImport: false,
    textureHint: "cream parchment paper with subtle warm grain and an internal thin gold border",
  },
  {
    idPrefix: "synthetic_eval_whiskey_dark",
    brandName: "Iron Ledger",
    classType: "Straight Bourbon Whiskey",
    alcoholContent: "47% ALC/VOL",
    netContents: "750 mL",
    nameAddress: "Bottled by Iron Ledger Spirits, Louisville, KY",
    countryOfOrigin: "",
    isImport: false,
    textureHint: "dark charcoal label stock with warm metallic edging and high-contrast light typography",
  },
  {
    idPrefix: "synthetic_eval_vodka_import",
    brandName: "Silver Coast",
    classType: "Vodka",
    alcoholContent: "40% ALC/VOL",
    netContents: "1 L",
    nameAddress: "Imported by Silver Coast Imports, New York, NY",
    countryOfOrigin: "Product of Poland",
    isImport: true,
    textureHint: "cool silver-blue textured stock with subtle foil border lines",
  },
  {
    idPrefix: "synthetic_eval_spiced_rum",
    brandName: "Harbor Ember",
    classType: "Spiced Rum",
    alcoholContent: "35% ALC/VOL",
    netContents: "750 mL",
    nameAddress: "Bottled by Harbor Ember Spirits, San Juan, PR",
    countryOfOrigin: "",
    isImport: false,
    textureHint: "warm parchment stock with slight amber cast and antique gold border lines",
  },
];

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createPrng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function collapseWhitespace(input) {
  return String(input).replace(/\s+/g, " ").trim();
}

async function readCanonicalWarning() {
  const raw = JSON.parse(
    await readFile(path.join(root, "fixtures", "default-application.json"), "utf8"),
  );
  return raw.governmentWarning;
}

async function writeJsonIfChanged(absPath, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  try {
    const prev = await readFile(absPath, "utf8");
    if (prev === next) return false;
  } catch {}
  await writeFile(absPath, next, "utf8");
  return true;
}

function buildGeminiPrompt(family, warningText) {
  const countryLine = family.countryOfOrigin
    ? `\n${family.countryOfOrigin}`
    : "\n(leave country-of-origin line empty)";

  return [
    "Create a flat, 2D rectangular distilled spirits label image for a 750 mL bottle.",
    "Output exactly 900x600 pixels, landscape 3:2, RGB.",
    "No bottle, no table, no scene, no drop shadows, no external margins.",
    "The label texture must extend edge-to-edge to the canvas bounds.",
    "You may include only internal decorative border lines inside the canvas.",
    "Typography must be sharp and fully legible; do not clip any text.",
    `Style texture hint: ${family.textureHint}.`,
    "",
    "Layout:",
    "- Single centered vertical flow in one field of view; do not split into left/right columns.",
    "- Top section: brand name (largest text), then class/type, then alcohol content and net contents.",
    "- Middle section: bottler/address line, then country of origin line when provided.",
    "- Bottom section: full GOVERNMENT WARNING paragraph block, clearly readable and fully inside the frame.",
    "",
    "Use text exactly as provided:",
    "TOP SECTION:",
    `${family.brandName}`,
    `${family.classType}`,
    `${family.alcoholContent}`,
    `${family.netContents}`,
    "",
    "MIDDLE SECTION:",
    `${family.nameAddress}${countryLine}`,
    "",
    "BOTTOM WARNING SECTION:",
    collapseWhitespace(warningText),
    "",
    "No logos, icons, medallions, badges, or 3D effects.",
    "Output only the flat label artwork.",
  ].join("\n");
}

async function generateBaselineWithGemini(family, warningText) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY. Set it before running synthetic fixture generation.");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_IMAGE_MODEL)}` +
    `:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const prompt = buildGeminiPrompt(family, warningText);
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.2,
    },
  };

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
    try {
      console.log(`[gemini] ${family.idPrefix} baseline attempt ${attempt}/${GEMINI_MAX_ATTEMPTS}`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini image generation failed (${response.status}): ${text}`);
      }

      const json = await response.json();
      const parts = json?.candidates?.[0]?.content?.parts ?? [];
      const inlinePart = parts.find((p) => p?.inlineData?.data || p?.inline_data?.data);
      const data = inlinePart?.inlineData?.data ?? inlinePart?.inline_data?.data;
      if (!data) {
        throw new Error(`Gemini response missing image data for ${family.idPrefix}`);
      }
      return Buffer.from(data, "base64");
    } catch (error) {
      clearTimeout(timeout);
      if (attempt >= GEMINI_MAX_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
    }
  }
  throw new Error(`Exhausted Gemini attempts for ${family.idPrefix}`);
}

async function encodeJpegWithinLimit(inputBuffer) {
  let quality = DEFAULT_JPEG_QUALITY;
  let output = await sharp(inputBuffer)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (output.byteLength > MAX_BYTES && quality > 60) {
    quality -= 5;
    output = await sharp(inputBuffer)
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  if (output.byteLength > MAX_BYTES) {
    throw new Error(`Could not fit JPEG under ${MAX_BYTES} bytes`);
  }
  return output;
}

async function createNoiseOverlay(seedText) {
  const rand = createPrng(hashString(seedText));
  const raw = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let i = 0; i < raw.length; i += 4) {
    const v = 108 + Math.round(rand() * 70);
    raw[i] = v;
    raw[i + 1] = v;
    raw[i + 2] = v;
    raw[i + 3] = 30 + Math.round(rand() * 34);
  }
  return sharp(raw, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } }).blur(0.3).png().toBuffer();
}

async function buildVariant(baseBuffer, variant) {
  const background = "#f1ede2";
  if (variant === "baseline_front") return baseBuffer;

  if (variant === "glare_brand") {
    const glare = Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="brandGlare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="white" stop-opacity="0.0"/>
            <stop offset="42%" stop-color="white" stop-opacity="0.78"/>
            <stop offset="78%" stop-color="white" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="white" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <ellipse cx="450" cy="170" rx="320" ry="100" fill="url(#brandGlare)" transform="rotate(-6 450 170)"/>
      </svg>`);
    return sharp(baseBuffer).composite([{ input: glare, blend: "screen" }]).toBuffer();
  }

  if (variant === "angle_30") {
    return sharp(baseBuffer)
      .resize({ width: 820, height: HEIGHT, fit: "fill" })
      .extend({ left: 40, right: 40, top: 0, bottom: 0, background })
      .rotate(-8, { background })
      .resize({ width: WIDTH, height: HEIGHT, fit: "contain", background })
      .toBuffer();
  }

  if (variant === "low_light_grain") {
    const noise = await createNoiseOverlay(variant);
    return sharp(baseBuffer)
      .modulate({ brightness: 0.65, saturation: 0.92 })
      .composite([{ input: noise, blend: "overlay" }])
      .toBuffer();
  }

  if (variant === "crop_warning_partial") {
    const cover = Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="452" width="${WIDTH}" height="${HEIGHT - 452}" fill="#eee8d9"/>
      </svg>`);
    return sharp(baseBuffer).composite([{ input: cover, blend: "over" }]).toBuffer();
  }

  throw new Error(`Unknown variant: ${variant}`);
}

async function main() {
  await mkdir(labelsDir, { recursive: true });
  await mkdir(applicationsDir, { recursive: true });
  const warning = await readCanonicalWarning();

  for (const family of FAMILY_CONFIGS) {
    console.log(`[generate] family ${family.idPrefix}`);
    const appPath = path.join(applicationsDir, `${family.idPrefix}.json`);
    await writeJsonIfChanged(appPath, {
      productClass: "distilled_spirits",
      isImport: family.isImport,
      brandName: family.brandName,
      classType: family.classType,
      alcoholContent: family.alcoholContent,
      netContents: family.netContents,
      governmentWarning: warning,
      nameAddress: family.nameAddress,
      countryOfOrigin: family.countryOfOrigin,
    });

    const geminiRaw = await generateBaselineWithGemini(family, warning);
    const baseImage = await sharp(geminiRaw)
      .resize({ width: WIDTH, height: HEIGHT, fit: "cover", position: "centre" })
      .toBuffer();

    for (const variant of VARIANTS) {
      console.log(`[generate] variant ${family.idPrefix}_${variant}`);
      const transformed = await buildVariant(baseImage, variant);
      const jpeg = await encodeJpegWithinLimit(transformed);
      const name = `${family.idPrefix}_${variant}.jpg`;
      const outPath = path.join(labelsDir, name);
      await writeFile(outPath, jpeg);
      console.log("wrote", path.relative(root, outPath), `${Math.round(jpeg.byteLength / 1024)} KB`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
