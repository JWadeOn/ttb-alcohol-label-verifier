"use client";

import { useId, type ChangeEventHandler, type ReactNode, type RefObject } from "react";
import { formatBytes } from "./format";

type BatchUploadZoneProps = {
  title: string;
  hint: string;
  /** Extra guidance shown inside the dashed upload area. */
  detail?: ReactNode;
  files: File[];
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  emptyLabel: string;
  ariaLabel: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function BatchUploadZone({
  title,
  hint,
  detail,
  inputRef,
  accept,
  emptyLabel,
  ariaLabel,
  onChange,
}: BatchUploadZoneProps) {
  const zoneId = useId();

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-stone-200 bg-white p-2.5">
      <p className="text-xs font-semibold text-stone-900">{title}</p>
      <label
        htmlFor={zoneId}
        className="group mt-2 flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-ttb-300 bg-gradient-to-b from-white to-ttb-50/70 px-3 py-5 text-center transition hover:border-ttb-400 hover:from-ttb-50/30 hover:to-ttb-50 focus-within:ring-2 focus-within:ring-ttb-600/30"
      >
        <span className="inline-flex items-center justify-center rounded-lg border-2 border-ttb-600 bg-ttb-50 px-4 py-2 text-xs font-semibold text-ttb-900 shadow-sm transition group-hover:border-ttb-700 group-hover:bg-ttb-100 group-active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-sm">
          {emptyLabel}
        </span>
        <div className="flex max-w-[20rem] flex-col gap-1.5 rounded-md border border-stone-200/80 bg-white/90 px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-medium leading-snug text-stone-900">{hint}</p>
          <p className="text-[11px] leading-snug text-stone-800">
            One dialog — select the full set (Shift/Cmd+click)
          </p>
          {detail ? (
            <p className="border-t border-stone-200 pt-1.5 text-[11px] leading-relaxed text-stone-800">{detail}</p>
          ) : null}
        </div>
      </label>
      <input
        ref={inputRef}
        id={zoneId}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        aria-label={ariaLabel}
        onChange={onChange}
      />
    </div>
  );
}

type BatchFileListProps = {
  files: File[];
  highlightedFileName?: string | null;
  className?: string;
};

export function BatchFileList({ files, highlightedFileName = null, className = "" }: BatchFileListProps) {
  if (files.length === 0) return null;

  return (
    <ul
      className={`min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/80 p-1.5 ${className}`}
    >
      {files.map((file) => {
        const highlighted = highlightedFileName != null && file.name === highlightedFileName;
        return (
          <li
            key={`${file.name}-${file.size}`}
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] transition ${
              highlighted
                ? "border border-ttb-300 bg-ttb-50 font-medium text-stone-900 shadow-sm"
                : "border border-stone-200 bg-white text-stone-700"
            }`}
          >
            <span className="min-w-0 truncate font-mono">{file.name}</span>
            <span className={`shrink-0 ${highlighted ? "text-stone-600" : "text-stone-500"}`}>
              {formatBytes(file.size)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
