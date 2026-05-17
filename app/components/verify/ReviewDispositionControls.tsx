"use client";

import { useCallback, useState } from "react";
import {
  DEMO_MODE_ACTION_TOAST,
  DemoModeSnackbar,
  REVIEW_DISPOSITION_TOOLTIP,
} from "@/app/components/verify/DemoModeSnackbar";

type ReviewDisposition = "approved" | "rejected" | null;

const BTN =
  "min-w-[6.5rem] cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold leading-snug transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

function approveClasses(active: boolean): string {
  return active
    ? `${BTN} border-emerald-800 bg-emerald-700 text-white shadow-sm focus-visible:ring-emerald-600`
    : `${BTN} border-emerald-700 bg-white text-emerald-900 hover:bg-emerald-50 focus-visible:ring-emerald-500`;
}

function rejectClasses(active: boolean): string {
  return active
    ? `${BTN} border-red-800 bg-red-700 text-white shadow-sm focus-visible:ring-red-600`
    : `${BTN} border-red-700 bg-white text-red-900 hover:bg-red-50 focus-visible:ring-red-500`;
}

export function ReviewDispositionControls({
  disposition,
  onDisposition,
}: {
  disposition: ReviewDisposition;
  onDisposition: (next: ReviewDisposition) => void;
}) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dismissToast = useCallback(() => setToastMessage(null), []);

  const handleDispositionClick = (next: "approved" | "rejected") => {
    onDisposition(next);
    setToastMessage(DEMO_MODE_ACTION_TOAST);
  };

  return (
    <>
      <div
        className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end"
        role="group"
        aria-label="Review disposition"
        title={REVIEW_DISPOSITION_TOOLTIP}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          Your review
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title={REVIEW_DISPOSITION_TOOLTIP}
            aria-describedby="review-disposition-scope-hint"
            onClick={() => handleDispositionClick("approved")}
            aria-pressed={disposition === "approved"}
            className={approveClasses(disposition === "approved")}
          >
            Approve
          </button>
          <button
            type="button"
            title={REVIEW_DISPOSITION_TOOLTIP}
            aria-describedby="review-disposition-scope-hint"
            onClick={() => handleDispositionClick("rejected")}
            aria-pressed={disposition === "rejected"}
            className={rejectClasses(disposition === "rejected")}
          >
            Reject
          </button>
          {disposition ? (
            <button
              type="button"
              onClick={() => onDisposition(null)}
              className="cursor-pointer px-1 text-xs font-medium text-stone-600 underline decoration-stone-400 underline-offset-2 hover:text-stone-900"
            >
              Clear
            </button>
          ) : null}
        </div>
        <p id="review-disposition-scope-hint" className="max-w-xs text-[11px] leading-snug text-stone-500">
          {REVIEW_DISPOSITION_TOOLTIP}
        </p>
        {disposition ? (
          <span className="text-[11px] text-stone-500" role="status" aria-live="polite">
            {disposition === "approved" ? "Approved" : "Rejected"} — demo only, not saved.
          </span>
        ) : null}
      </div>

      <DemoModeSnackbar message={toastMessage} onDismiss={dismissToast} />
    </>
  );
}
