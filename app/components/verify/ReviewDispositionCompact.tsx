"use client";

import { useCallback, useState } from "react";
import {
  DEMO_MODE_ACTION_TOAST,
  DemoModeSnackbar,
  REVIEW_DISPOSITION_TOOLTIP,
} from "@/app/components/verify/DemoModeSnackbar";

export type ReviewDisposition = "approved" | "rejected" | null;

const BTN =
  "cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";

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

export function ReviewDispositionCompact({
  disposition,
  onDisposition,
  label = "Review",
  hideLabel = false,
}: {
  disposition: ReviewDisposition;
  onDisposition: (next: ReviewDisposition) => void;
  label?: string;
  /** Hide the small label (e.g. when the table column already says "Your review"). */
  hideLabel?: boolean;
}) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToastMessage(null), []);

  const handleClick = (next: "approved" | "rejected") => {
    onDisposition(next);
    setToastMessage(DEMO_MODE_ACTION_TOAST);
  };

  return (
    <>
      <div
        className="flex flex-col gap-1"
        role="group"
        aria-label={`${label} disposition`}
        title={REVIEW_DISPOSITION_TOOLTIP}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideLabel ? (
          <span className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            title={REVIEW_DISPOSITION_TOOLTIP}
            onClick={() => handleClick("approved")}
            aria-pressed={disposition === "approved"}
            className={approveClasses(disposition === "approved")}
          >
            Approve
          </button>
          <button
            type="button"
            title={REVIEW_DISPOSITION_TOOLTIP}
            onClick={() => handleClick("rejected")}
            aria-pressed={disposition === "rejected"}
            className={rejectClasses(disposition === "rejected")}
          >
            Reject
          </button>
          {disposition ? (
            <button
              type="button"
              onClick={() => onDisposition(null)}
              className="cursor-pointer px-1 py-1 text-[11px] font-medium text-stone-600 underline decoration-stone-400 underline-offset-2 hover:text-stone-900"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <DemoModeSnackbar message={toastMessage} onDismiss={dismissToast} />
    </>
  );
}
