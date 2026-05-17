/** Filename without path or extension (case preserved). */
export function fileBaseName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "");
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

function normalizeStem(name: string): string {
  return fileBaseName(name).trim().toLowerCase();
}

function sortByFileName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export type BatchPairingMethod = "basename" | "sort_order";

export type BatchPairingResult<T extends { name: string }> = {
  pairs: Array<{ image: T; application: T }>;
  method: BatchPairingMethod;
  warning?: string;
};

/**
 * Pair label images with application JSON files.
 * Prefer matching by basename (e.g. `sku-01.png` + `sku-01.json`).
 * When counts match but basenames do not, fall back to alphabetical pairing with a warning.
 */
export function pairBatchFiles<T extends { name: string }>(
  images: T[],
  applicationFiles: T[],
):
  | { ok: true; result: BatchPairingResult<T> }
  | { ok: false; message: string } {
  if (images.length === 0) {
    return { ok: false, message: "Choose at least one label image." };
  }
  if (applicationFiles.length === 0) {
    return { ok: false, message: "Upload one application JSON file per label." };
  }
  if (images.length !== applicationFiles.length) {
    return {
      ok: false,
      message: `Label count (${images.length}) must match application file count (${applicationFiles.length}).`,
    };
  }

  const appByStem = new Map<string, T[]>();
  for (const app of applicationFiles) {
    const stem = normalizeStem(app.name);
    const bucket = appByStem.get(stem) ?? [];
    bucket.push(app);
    appByStem.set(stem, bucket);
  }

  const duplicateAppStems = [...appByStem.entries()].filter(([, apps]) => apps.length > 1);
  if (duplicateAppStems.length > 0) {
    const sample = duplicateAppStems
      .slice(0, 2)
      .map(([stem]) => `"${stem}"`)
      .join(", ");
    return {
      ok: false,
      message: `Duplicate application filenames (same name without extension): ${sample}. Rename so each stem is unique.`,
    };
  }

  const basenamePairs: Array<{ image: T; application: T }> = [];
  const unmatchedImages: T[] = [];

  for (const image of images) {
    const stem = normalizeStem(image.name);
    const app = appByStem.get(stem)?.[0];
    if (app) {
      basenamePairs.push({ image, application: app });
    } else {
      unmatchedImages.push(image);
    }
  }

  if (unmatchedImages.length === 0) {
    return { ok: true, result: { pairs: basenamePairs, method: "basename" } };
  }

  const sortedImages = sortByFileName(images);
  const sortedApps = sortByFileName(applicationFiles);
  const pairs = images.map((image) => {
    const imageSortIndex = sortedImages.indexOf(image);
    const application = sortedApps[imageSortIndex]!;
    return { image, application };
  });

  const sample = unmatchedImages
    .slice(0, 2)
    .map((img) => `"${fileBaseName(img.name)}"`)
    .join(", ");

  return {
    ok: true,
    result: {
      pairs,
      method: "sort_order",
      warning: `Could not match ${unmatchedImages.length} label(s) to application files by filename (${sample}${unmatchedImages.length > 2 ? ", …" : ""}). Paired by sorting file names alphabetically instead — confirm order before running.`,
    },
  };
}
