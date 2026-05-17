"use client";

import { ApplicationEditor } from "@/components/ApplicationEditor";
import type { BatchApplicationListItem } from "@/lib/batch-applications";
import type { BatchPairingMethod } from "@/lib/batch-pairing";
import { fileBaseName } from "@/lib/batch-pairing";
import type { ChangeEventHandler, RefObject } from "react";
import { BatchUploadZone } from "./BatchUploadZone";

export type BatchPairingPreview = {
  method: BatchPairingMethod;
  warning?: string;
  rows: Array<{ imageName: string; applicationName: string }>;
};

type BatchApplicationsPanelProps = {
  applicationFiles: File[];
  applicationInputRef: RefObject<HTMLInputElement | null>;
  onApplicationsChange: ChangeEventHandler<HTMLInputElement>;
  items: BatchApplicationListItem[];
  pairingPreview: BatchPairingPreview | null;
  pairingError: string | null;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  applicationJson: string;
  loading: boolean;
};

export function BatchApplicationsPanel({
  applicationFiles,
  applicationInputRef,
  onApplicationsChange,
  items,
  pairingPreview,
  pairingError,
  selectedIndex,
  onSelectIndex,
  applicationJson,
  loading,
}: BatchApplicationsPanelProps) {
  const hasUploadedApplications = applicationFiles.length > 0;
  const selected = items[selectedIndex];

  if (!hasUploadedApplications) {
    return (
      <BatchUploadZone
          title="Application JSON"
          hint=".json files — one per label, same count as images on the left"
          detail={
            <>
              Upload a set, then select an entry to preview. Use matching filenames when possible (e.g.{" "}
              <span className="font-mono">sku.png</span> and <span className="font-mono">sku.json</span>).
            </>
          }
          files={applicationFiles}
          inputRef={applicationInputRef}
          accept=".json,application/json"
          emptyLabel="Upload application JSON files"
          ariaLabel="Upload batch application JSON files"
          onChange={onApplicationsChange}
        />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <input
        ref={applicationInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        className="sr-only"
        aria-label="Upload batch application JSON files"
        onChange={onApplicationsChange}
      />

      {pairingError ? (
        <p className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          {pairingError}
        </p>
      ) : null}

      {pairingPreview?.warning ? (
        <p className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          {pairingPreview.warning}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        <div className="flex min-h-0 shrink-0 flex-col lg:w-[11.5rem]">
          <p className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            In this batch
            {pairingPreview ? (
              <span className="font-normal normal-case text-stone-400">
                {" "}
                · {pairingPreview.method === "basename" ? "by filename" : "by sort"}
              </span>
            ) : null}
          </p>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/80 p-1">
            {items.map((item, index) => {
              const active = index === selectedIndex;
              return (
                <li key={`${item.fileName}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onSelectIndex(index)}
                    className={`w-full cursor-pointer rounded-md px-2 py-1.5 text-left transition ${
                      active
                        ? "border border-ttb-300 bg-ttb-50 shadow-sm"
                        : "border border-transparent hover:bg-white"
                    }`}
                  >
                    <span className="block truncate font-mono text-[11px] font-semibold text-stone-900">
                      {fileBaseName(item.fileName)}
                    </span>
                    {item.brandName ? (
                      <span className="mt-0.5 block truncate text-[10px] text-stone-600">{item.brandName}</span>
                    ) : item.parseError ? (
                      <span className="mt-0.5 block text-[10px] text-red-700">{item.parseError}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {loading ? (
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-4 text-center text-xs text-stone-600">
              Loading application previews…
            </p>
          ) : selected ? (
            <div className="min-h-0 flex-1">
              <ApplicationEditor value={applicationJson} onChange={() => {}} density="compact" readOnly />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
