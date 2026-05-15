import { ApplicationJsonSchema } from "@/lib/schemas";

export function getApplicationInputState(raw: string): { ok: true } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Application JSON is invalid. Switch to JSON view to fix it." };
  }

  const checked = ApplicationJsonSchema.safeParse(parsed);
  if (!checked.success) {
    return {
      ok: false,
      reason: "Application data does not match the expected fields yet. Fix it before verifying.",
    };
  }

  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
