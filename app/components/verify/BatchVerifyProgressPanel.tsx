"use client";

import {
  batchVerifyItemStatus,
  batchVerifyProgressCaption,
  batchVerifyProgressPercent,
  type BatchVerifyProgressPhase,
} from "@/lib/batch-verify-progress";

type BatchVerifyProgressPanelProps = {
  fileNames: string[];
  activeIndex: number;
  phase: BatchVerifyProgressPhase;
};

function FileStatusIcon({ status }: { status: ReturnType<typeof batchVerifyItemStatus> }) {
  if (status === "done") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20"
        aria-hidden
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ttb-100 text-ttb-800 ring-2 ring-ttb-500/35"
        aria-hidden
      >
        <span className="absolute inset-0.5 animate-pulse rounded-full bg-ttb-200/50" />
        <span className="relative text-[9px] font-bold">…</span>
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-400 ring-1 ring-stone-200"
      aria-hidden
    >
      <span className="text-[9px] font-semibold">○</span>
    </span>
  );
}

export function BatchVerifyProgressPanel({
  fileNames,
  activeIndex,
  phase,
}: BatchVerifyProgressPanelProps) {
  const total = fileNames.length;
  const percent = batchVerifyProgressPercent(phase, activeIndex, total);
  const safeIndex = total === 0 ? 0 : Math.min(activeIndex, total - 1);
  const activeFileName = total > 0 ? fileNames[safeIndex] : null;
  const caption = batchVerifyProgressCaption(phase, safeIndex, total, activeFileName);

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-stone-900">Batch verification in progress</h3>
        <p className="text-sm leading-relaxed text-stone-600">
          Working through {total} label{total === 1 ? "" : "s"}. Please keep this tab open — large batches can take a
          minute or more.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-stone-800">
            {phase === "finishing" ? "Completing batch" : phase === "prepare" ? "Preparing" : "Verifying labels"}
          </span>
          <span className="font-mono text-xs text-stone-600">{percent}%</span>
        </div>
        <div
          className="mb-4 h-2 overflow-hidden rounded-full bg-stone-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Estimated batch verification progress"
        >
          <div
            className="h-full rounded-full bg-ttb-600 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mb-4 text-sm leading-relaxed text-stone-700">{caption}</p>

        <ul className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/80 p-1.5">
          {fileNames.map((fileName, index) => {
            const status = batchVerifyItemStatus(index, safeIndex, phase);
            return (
              <li
                key={`${fileName}-${index}`}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                  status === "running"
                    ? "border border-ttb-300 bg-ttb-50"
                    : status === "done"
                      ? "bg-white/80 text-stone-600"
                      : "text-stone-500"
                }`}
                aria-current={status === "running" ? "step" : undefined}
              >
                <FileStatusIcon status={status} />
                <span className="min-w-0 flex-1 truncate font-mono">{fileName}</span>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                  {status === "done" ? "Done" : status === "running" ? "Active" : "Queued"}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
          Each label is extracted and compared on the server (typically two at a time). The list above is an estimate
          so you can see movement while the batch request finishes.
        </p>
      </div>
    </div>
  );
}
