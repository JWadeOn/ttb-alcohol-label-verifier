import { checkApplicationReadyForVerify } from "@/lib/application-compliance";

export function getApplicationInputState(raw: string): { ok: true } | { ok: false; reason: string } {
  return checkApplicationReadyForVerify(raw);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
