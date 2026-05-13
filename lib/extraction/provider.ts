import type { ExtractionResult } from "@/lib/extraction/types";

export interface ExtractionProvider {
  extract(imageBytes: Buffer, signal?: AbortSignal): Promise<ExtractionResult>;
}

export type ExtractWithFailoverOpts = {
  softTimeoutMs?: number;
  hardTimeoutMs?: number;
  /** Correlates server logs with JSON `requestId` (never log secrets). */
  requestId?: string;
};

function logPrimaryExtractionFailure(params: {
  requestId?: string;
  err: unknown;
  primaryAborted: boolean;
  softMs?: number;
  hardMs?: number;
}): void {
  const { err, primaryAborted, softMs, hardMs, requestId } = params;
  const name = err instanceof Error ? err.name : "UnknownError";
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  console.warn("[extractWithFailover] primary extraction failed; attempting fallback", {
    requestId,
    errorName: name,
    errorMessage: message,
    primaryAborted,
    softTimeoutMs: softMs ?? null,
    hardTimeoutMs: hardMs ?? null,
  });
}

export async function extractWithFailover(
  imageBytes: Buffer,
  primary: ExtractionProvider,
  fallback: ExtractionProvider,
  opts?: ExtractWithFailoverOpts,
): Promise<ExtractionResult> {
  const softMs = typeof opts?.softTimeoutMs === "number" && opts.softTimeoutMs > 0
    ? opts.softTimeoutMs
    : undefined;
  const hardMs = typeof opts?.hardTimeoutMs === "number" && opts.hardTimeoutMs > 0
    ? opts.hardTimeoutMs
    : undefined;
  const requestId = opts?.requestId;

  const primaryAbort = new AbortController();
  const hardTimer = hardMs !== undefined
    ? setTimeout(() => primaryAbort.abort(), hardMs)
    : undefined;

  let fallbackPromise: Promise<ExtractionResult> | undefined;
  const softTimer = softMs !== undefined
    ? setTimeout(() => {
      fallbackPromise = fallback.extract(imageBytes);
    }, softMs)
    : undefined;

  try {
    const result = await primary.extract(imageBytes, primaryAbort.signal);
    if (hardTimer !== undefined) clearTimeout(hardTimer);
    if (softTimer !== undefined) clearTimeout(softTimer);
    return result;
  } catch (e) {
    if (hardTimer !== undefined) clearTimeout(hardTimer);
    if (softTimer !== undefined) clearTimeout(softTimer);
    logPrimaryExtractionFailure({
      requestId,
      err: e,
      primaryAborted: primaryAbort.signal.aborted,
      softMs,
      hardMs,
    });

    if (fallbackPromise) {
      try {
        return await fallbackPromise;
      } catch (fallbackErr) {
        console.warn("[extractWithFailover] parallel fallback promise rejected", {
          requestId,
          errorName: fallbackErr instanceof Error ? fallbackErr.name : "UnknownError",
          errorMessage:
            fallbackErr instanceof Error
              ? fallbackErr.message
              : typeof fallbackErr === "string"
                ? fallbackErr
                : String(fallbackErr),
        });
        /* try direct fallback below */
      }
    }

    return await fallback.extract(imageBytes);
  }
}
