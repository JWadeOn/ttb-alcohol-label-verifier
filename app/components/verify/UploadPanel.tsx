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
    <>
      {!file ? (
        <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          Single-label verify starts here: choose one image, then run verification before reviewing results.
        </p>
      ) : preparingFile ? (
        <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          Preparing an optimized upload for faster verification…
        </p>
      ) : uploadPreparation?.compressed ? (
        <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          Upload optimized before submit: {formatBytes(uploadPreparation.originalBytes)} to{" "}
          {formatBytes(uploadPreparation.uploadBytes)}.
        </p>
      ) : null}
      {file && !preparingFile ? (
        <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
          {prefetchState === "prefetching"
            ? "Prefetching extraction in the background…"
            : prefetchState === "ready"
              ? "Extraction prefetched. Verify can reuse cached results."
              : prefetchState === "error"
                ? "Background prefetch unavailable; verify will run full extraction."
                : null}
        </p>
      ) : null}

      <div className="flex flex-col">
        {previewUrl ? (
          <div className="relative min-h-[10rem] max-h-[min(42vh,22rem)] overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
            <Image
              src={previewUrl}
              alt={file?.name ? `Label preview: ${file.name}` : "Label preview"}
              fill
              unoptimized
              className="object-contain object-top p-1"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ttb-200 bg-gradient-to-b from-ttb-50/80 to-white px-3 py-3 text-center">
            <p className="text-xs font-semibold text-stone-800">1. Choose a label image</p>
            <p className="max-w-[18rem] text-[11px] leading-relaxed text-stone-500">
              2. Run verification, then review field outcomes in Results.
            </p>
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
        <p className="mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900">
          {uploadGuardrailErrorText}
        </p>
      ) : null}
    </>
  );
}
