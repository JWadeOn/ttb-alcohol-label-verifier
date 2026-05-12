"use client";

import { Fragment } from "react";
import type { VerifyUiStep, VerifyUiStepId, VerifyUiStepState } from "@/lib/verify-ui-steps";

const STEP_LABEL: Record<VerifyUiStepId, string> = {
  inputs: "Request",
  image_gate: "Image",
  extraction: "Extract",
  comparison: "Compare",
};

function StepIcon({ state, compact }: { state: VerifyUiStepState; compact?: boolean }) {
  const ring = compact ? "h-6 w-6" : "h-7 w-7";
  const icon = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  if (state === "upstream") {
    return (
      <span
        className={`flex ${ring} shrink-0 items-center justify-center rounded-full bg-ttb-50 text-ttb-700 ring-1 ring-ttb-200/80`}
        aria-hidden
      >
        <svg className={`${icon} opacity-80`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    );
  }
  if (state === "complete") {
    return (
      <span
        className={`flex ${ring} shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20`}
        aria-hidden
      >
        <svg className={icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span
        className={`flex ${ring} shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800 ring-1 ring-red-600/20`}
        aria-hidden
      >
        <svg className={icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (state === "skipped") {
    return (
      <span
        className={`flex ${ring} shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 ring-1 ring-stone-300/50`}
        aria-hidden
      >
        <span className="text-[9px] font-bold">—</span>
      </span>
    );
  }
  if (state === "running") {
    return (
      <span
        className={`relative flex ${ring} shrink-0 items-center justify-center rounded-full bg-ttb-100 text-ttb-800 ring-2 ring-ttb-500/40`}
        aria-hidden
      >
        <span className="absolute inset-0.5 animate-pulse rounded-full bg-ttb-200/40" />
        <span className="relative text-[9px] font-bold">…</span>
      </span>
    );
  }
  return (
    <span
      className={`flex ${ring} shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-400 ring-1 ring-stone-200`}
      aria-hidden
    >
      <span className="text-[9px] font-semibold">○</span>
    </span>
  );
}

function stateVerb(state: VerifyUiStepState): string {
  switch (state) {
    case "running":
      return "In progress";
    case "upstream":
      return "On server";
    case "complete":
      return "Done";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    default:
      return "Pending";
  }
}

function captionLine(steps: VerifyUiStep[]): string {
  const failed = steps.find((s) => s.state === "failed");
  if (failed) return failed.detail;
  const running = steps.find((s) => s.state === "running");
  if (running) return running.detail;
  const foot = steps.find((s) => s.footnote)?.footnote;
  if (foot) return foot;
  if (steps.every((s) => s.state === "complete" || s.state === "skipped")) {
    return "All stages completed.";
  }
  return "";
}

export function VerifyRunStepsPanel({
  steps,
  compact = true,
  heading,
  subheading,
}: {
  steps: VerifyUiStep[];
  compact?: boolean;
  heading?: string;
  subheading?: string;
}) {
  const busy = steps.some((s) => s.state === "running");
  const caption = captionLine(steps);
  const sm = compact;

  return (
    <div
      className={compact ? "space-y-2" : "space-y-3"}
      aria-live="polite"
      aria-busy={busy}
    >
      {heading ? (
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold text-stone-900 sm:text-sm">{heading}</h3>
          {subheading ? (
            <p className="text-[11px] leading-snug text-stone-500 sm:text-xs">{subheading}</p>
          ) : null}
        </div>
      ) : null}

      <div
        className="flex w-full flex-row flex-nowrap items-center gap-0"
        role="group"
        aria-label={heading ? `${heading} progress` : "Verification pipeline progress"}
      >
        {steps.map((step, i) => (
          <Fragment key={step.id}>
            {i > 0 ? (
              <span aria-hidden className="mx-0.5 flex min-w-[0.25rem] flex-1 items-center px-0.5 sm:mx-1">
                <span className="h-px w-full rounded-full bg-stone-200" />
              </span>
            ) : null}
            <div
              className="flex min-w-0 max-w-[24%] shrink-0 flex-col items-center gap-1 sm:max-w-none sm:flex-1"
              aria-current={step.state === "running" ? "step" : undefined}
              title={`${step.title}. ${step.detail}`}
            >
              <StepIcon state={step.state} compact={sm} />
              <span className="w-full truncate text-center text-[10px] font-semibold leading-tight text-stone-800 sm:text-[11px]">
                {STEP_LABEL[step.id]}
              </span>
              <span className="sr-only">
                {step.title}. {stateVerb(step.state)}. {step.detail}
                {step.footnote ? ` ${step.footnote}` : ""}
              </span>
            </div>
          </Fragment>
        ))}
      </div>

      {caption ? (
        <p className="text-center text-[11px] leading-snug text-stone-600 sm:text-left sm:text-xs">{caption}</p>
      ) : null}
    </div>
  );
}
