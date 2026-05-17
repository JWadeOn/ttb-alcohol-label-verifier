import { MAX_LABEL_UPLOAD_BYTES } from "@/lib/upload-limits";

/** Keep aligned with `CLIENT_BATCH_MAX_IMAGES` and server `VERIFY_BATCH_MAX_IMAGES` default. */
export const BATCH_MAX_ITEMS = 20;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function sortByFileName(files: File[]): File[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function isImageFile(file: File): boolean {
  if (file.type === "image/jpeg" || file.type === "image/png") return true;
  return /\.(jpe?g|png)$/i.test(file.name);
}

function isJsonFile(file: File): boolean {
  if (file.type === "application/json") return true;
  return file.name.toLowerCase().endsWith(".json");
}

export function normalizeBatchImageFiles(
  files: File[],
): { ok: true; files: File[] } | { ok: false; message: string } {
  const images = sortByFileName(files.filter(isImageFile));
  if (images.length === 0) {
    return {
      ok: false,
      message: "No label images found. Choose one or more JPEG or PNG files.",
    };
  }
  if (images.length > BATCH_MAX_ITEMS) {
    return {
      ok: false,
      message: `Batch size exceeds maximum of ${BATCH_MAX_ITEMS} images.`,
    };
  }
  const oversized = images.filter((f) => f.size > MAX_LABEL_UPLOAD_BYTES);
  if (oversized.length > 0) {
    const sample = oversized
      .slice(0, 2)
      .map((f) => `"${f.name}" (${formatBytes(f.size)})`)
      .join(", ");
    return {
      ok: false,
      message: `Each batch image must be ${formatBytes(MAX_LABEL_UPLOAD_BYTES)} or smaller. Oversized: ${sample}${oversized.length > 2 ? `, +${oversized.length - 2} more` : ""}.`,
    };
  }
  return { ok: true, files: images };
}

export function normalizeBatchApplicationFiles(
  files: File[],
): { ok: true; files: File[] } | { ok: false; message: string } {
  const jsonFiles = sortByFileName(files.filter(isJsonFile));
  if (jsonFiles.length === 0) {
    return {
      ok: false,
      message: "No application JSON found. Choose one or more .json files.",
    };
  }
  if (jsonFiles.length > BATCH_MAX_ITEMS) {
    return {
      ok: false,
      message: `Batch size exceeds maximum of ${BATCH_MAX_ITEMS} application files.`,
    };
  }
  return { ok: true, files: jsonFiles };
}
