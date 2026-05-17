"use client";

import { useEffect } from "react";

export const DEMO_MODE_ACTION_TOAST =
  "Demo Mode: In a production environment, this action would update the application's status in the database.";

export const REVIEW_DISPOSITION_TOOLTIP =
  "Out of scope for take-home: Maps to future manual override functionality.";

type DemoModeSnackbarProps = {
  message: string | null;
  onDismiss: () => void;
  autoHideMs?: number;
};

export function DemoModeSnackbar({
  message,
  onDismiss,
  autoHideMs = 6000,
}: DemoModeSnackbarProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, autoHideMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 sm:bottom-6"
    >
      <div className="pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl border border-stone-700/20 bg-stone-900 px-4 py-3 text-sm leading-snug text-white shadow-lg shadow-stone-900/25">
        <p className="flex-1">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 cursor-pointer rounded-md px-2 py-0.5 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
