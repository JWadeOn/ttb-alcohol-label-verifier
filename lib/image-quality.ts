import sharp from "sharp";

const MIN_DIMENSION = 48;
const MAX_DIMENSION = 2048;
/** Laplacian variance on downscaled greyscale; lower ⇒ more blur / flat signal */
const BLUR_VARIANCE_THRESHOLD = 12;

export type ImageQualityOk = {
  ok: true;
  processedBuffer: Buffer;
};

export type ImageQualityBad = {
  ok: false;
  reason: string;
};

export type ImageQualityResult = ImageQualityOk | ImageQualityBad;

async function laplacianVarianceRGBA(input: Buffer): Promise<number> {
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
      const lapVal =
        -4 * c + data[i - 1] + data[i + 1] + data[i - width] + data[i + width];
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

export async function assessImageQuality(input: Buffer): Promise<ImageQualityResult> {
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    return {
      ok: false,
      reason: "Could not decode image bytes.",
    };
  }

  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w < MIN_DIMENSION || h < MIN_DIMENSION) {
    return {
      ok: false,
      reason:
        "Image dimensions are too small for reliable label reading (image quality insufficient).",
    };
  }

  try {
    const variance = await laplacianVarianceRGBA(input);
    if (!Number.isFinite(variance) || variance < BLUR_VARIANCE_THRESHOLD) {
      return {
        ok: false,
        reason:
          "Image appears too blurry or low-detail for reliable extraction (image quality insufficient).",
      };
    }
  } catch {
    return {
      ok: false,
      reason: "Could not analyze image clarity.",
    };
  }

  try {
    let pipeline = sharp(input).rotate();
    const longest = Math.max(w, h);
    if (longest > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const processedBuffer = await pipeline.jpeg({ quality: 88 }).toBuffer();
    return { ok: true, processedBuffer };
  } catch {
    return {
      ok: false,
      reason: "Could not normalize image for extraction.",
    };
  }
}
