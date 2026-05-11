import type { ExtractionResult } from "@/lib/extraction/types";

export interface ExtractionProvider {
  extract(imageBytes: Buffer, signal?: AbortSignal): Promise<ExtractionResult>;
}

export async function extractWithFailover(
  imageBytes: Buffer,
  primary: ExtractionProvider,
  fallback: ExtractionProvider,
  opts?: { softTimeoutMs?: number; hardTimeoutMs?: number },
): Promise<ExtractionResult> {
  const softMs = opts?.softTimeoutMs ?? 3000;
  const hardMs = opts?.hardTimeoutMs ?? 3500;

  const primaryAbort = new AbortController();
  const hardTimer = setTimeout(() => primaryAbort.abort(), hardMs);

  let fallbackPromise: Promise<ExtractionResult> | undefined;
  const softTimer = setTimeout(() => {
    fallbackPromise = fallback.extract(imageBytes);
  }, softMs);

  try {
    const result = await primary.extract(imageBytes, primaryAbort.signal);
    clearTimeout(hardTimer);
    clearTimeout(softTimer);
    return result;
  } catch {
    clearTimeout(hardTimer);
    clearTimeout(softTimer);

    if (fallbackPromise) {
      try {
        return await fallbackPromise;
      } catch {
        /* try direct fallback below */
      }
    }

    return await fallback.extract(imageBytes);
  }
}
