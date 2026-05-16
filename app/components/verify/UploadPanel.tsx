"use client";

import Image from "next/image";
import { formatBytes } from "./format";

type UploadPanelProps = {
  file: File | null;
  previewUrl: string | null;
  preparingFile: boolean;
  prefetchState: "idle" | "prefetching" | "ready" | "error";
  uploadPreparation: {
    originalBytes: number;
    uploadBytes: number;
    compressed: boolean;
  } | null;
  uploadGuardrailErrorText: string | null;
  onChooseFile: () => void;
};

export function UploadPanel({
  file,
  previewUrl,
  preparingFile,
  prefetchState,
  uploadPreparation,
  uploadGuardrailErrorText,
  onChooseFile,
}: UploadPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-1 lg:flex-1">
      {!file ? (
        <p className="shrink-0 text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          Single-label verify starts here: choose one image, then run verification before reviewing results.
        </p>
      ) : preparingFile ? (
        <p className="shrink-0 text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          Preparing an optimized upload for faster verification…
        </p>
      ) : uploadPreparation?.compressed ? (
        <p className="shrink-0 text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          Upload optimized before submit: {formatBytes(uploadPreparation.originalBytes)} to{" "}
          {formatBytes(uploadPreparation.uploadBytes)}.
        </p>
      ) : null}
      {file && !preparingFile ? (
        <p className="shrink-0 text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          {prefetchState === "prefetching"
            ? "Prefetching extraction in the background…"
            : prefetchState === "ready"
              ? "Extraction prefetched. Verify can reuse cached results."
              : prefetchState === "error"
                ? "Background prefetch unavailable; verify will run full extraction."
                : null}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-col lg:flex-1">
        {previewUrl ? (
          <div className="relative min-h-[10rem] flex-1 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 max-lg:max-h-[min(42vh,22rem)]">
            <Image
              src={previewUrl}
              alt={file?.name ? `Label preview: ${file.name}` : "Label preview"}
              fill
              unoptimized
              className="object-contain object-top p-1"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div className="flex min-h-[10rem] flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-ttb-200 bg-gradient-to-b from-ttb-50/80 to-white px-3 py-4 text-center lg:min-h-0">
            <details className="relative">
              <summary className="cursor-pointer list-none text-[11px] font-semibold text-stone-600 underline decoration-stone-400 underline-offset-2 transition hover:text-stone-800 [&::-webkit-details-marker]:hidden">
                Click here for instructions on how to use this.
              </summary>
              <div className="absolute left-1/2 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-3 text-left shadow-lg">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Quick start</p>
                <ol className="mt-2 space-y-1.5 text-xs text-stone-700">
                  <li>1. Choose a label image</li>
                  <li>2. Enter application data</li>
                  <li>3. Run verification and review results</li>
                </ol>
              </div>
            </details>
            <button
              type="button"
              onClick={onChooseFile}
              className="cursor-pointer rounded-lg border-2 border-ttb-600 bg-ttb-50 px-3 py-2 text-xs font-semibold text-ttb-900 transition hover:bg-ttb-100 sm:text-sm"
            >
              Choose label image
            </button>
            <p className="text-[10px] text-stone-500">JPEG or PNG · single-label path</p>
          </div>
        )}
      </div>
      {uploadGuardrailErrorText ? (
        <p className="mt-1 shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900">
          {uploadGuardrailErrorText}
        </p>
      ) : null}
    </div>
  );
}
