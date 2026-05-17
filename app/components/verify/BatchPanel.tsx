"use client";

import type { ChangeEventHandler, RefObject } from "react";
import { CLIENT_BATCH_MAX_IMAGES, CLIENT_UPLOAD_MAX_BYTES } from "./constants";
import { formatBytes } from "./format";
import { BatchFileList, BatchUploadZone } from "./BatchUploadZone";

type BatchPanelProps = {
  batchFiles: File[];
  highlightedImageName?: string | null;
  batchImageInputRef: RefObject<HTMLInputElement | null>;
  batchErrorText: string | null;
  onBatchImagesChange: ChangeEventHandler<HTMLInputElement>;
};

export function BatchPanel({
  batchFiles,
  highlightedImageName = null,
  batchImageInputRef,
  batchErrorText,
  onBatchImagesChange,
}: BatchPanelProps) {
  const hasFiles = batchFiles.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {!hasFiles ? (
        <BatchUploadZone
            title="Label images"
            hint="JPEG or PNG — select the full set in one step"
            detail={`Add one matching application JSON per label on the right (same count). Up to ${CLIENT_BATCH_MAX_IMAGES} pairs · ${formatBytes(CLIENT_UPLOAD_MAX_BYTES)} max per image.`}
            files={batchFiles}
            inputRef={batchImageInputRef}
            accept="image/jpeg,image/png"
            emptyLabel="Upload label images"
            ariaLabel="Upload batch label images"
            onChange={onBatchImagesChange}
          />
      ) : (
        <>
          <input
            ref={batchImageInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="sr-only"
            aria-label="Upload batch label images"
            onChange={onBatchImagesChange}
          />
          <BatchFileList files={batchFiles} highlightedFileName={highlightedImageName} />
        </>
      )}

      {batchErrorText ? (
        <p className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900">
          {batchErrorText}
        </p>
      ) : null}
    </div>
  );
}
