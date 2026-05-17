"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  BATCH_DEMO_SUITES,
  DEMO_CASES,
  DEMO_CASES_BY_ID,
  getBatchDemoSuiteOutcomes,
  type BatchDemoSuiteId,
  type DemoCaseId,
} from "@/lib/demo-cases";

type FixtureLoaderProps = {
  uploadMode: "single" | "batch";
  demoLoadingCaseId: DemoCaseId | null;
  demoLoadingBatchSuiteId: BatchDemoSuiteId | null;
  demoLoadErrorText: string | null;
  onSelectDemoCase: (id: DemoCaseId) => void | Promise<void>;
  onSelectBatchDemo: (suiteId: BatchDemoSuiteId) => void | Promise<void>;
  variant?: "default" | "toolbar";
};

function BatchOutcomeBadges({ passCount, failCount }: { passCount: number; failCount: number }) {
  return (
    <div className="flex shrink-0 flex-wrap gap-1.5">
      {passCount > 0 ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
          {passCount} pass
        </span>
      ) : null}
      {failCount > 0 ? (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
          {failCount} fail
        </span>
      ) : null}
    </div>
  );
}

export function FixtureLoader({
  uploadMode,
  demoLoadingCaseId,
  demoLoadingBatchSuiteId,
  demoLoadErrorText,
  onSelectDemoCase,
  onSelectBatchDemo,
  variant = "default",
}: FixtureLoaderProps) {
  const demoMenuRef = useRef<HTMLDetailsElement>(null);
  const demoBusy = demoLoadingCaseId !== null || demoLoadingBatchSuiteId !== null;

  const summaryClasses =
    variant === "toolbar"
      ? "flex h-8 w-full cursor-pointer list-none items-center justify-center rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs font-medium leading-none text-stone-800 shadow-sm outline-none transition hover:bg-white hover:ring-2 hover:ring-stone-400/30 focus-visible:ring-2 focus-visible:ring-stone-500/40 [&::-webkit-details-marker]:hidden open:bg-white open:ring-2 sm:inline-flex sm:w-max sm:justify-center"
      : "flex h-7 cursor-pointer list-none items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold leading-none text-stone-800 shadow-sm outline-none ring-stone-400/20 transition hover:bg-stone-50 hover:ring-2 focus-visible:ring-2 [&::-webkit-details-marker]:hidden open:bg-stone-50 open:ring-2 sm:inline-flex sm:w-max sm:justify-center";

  function closeMenu() {
    if (demoMenuRef.current) demoMenuRef.current.open = false;
  }

  return (
    <details
      ref={demoMenuRef}
      className={`relative min-w-0 ${variant === "toolbar" ? "flex-1 sm:flex-none" : "w-full sm:w-auto sm:max-w-[30rem]"}`}
    >
      <summary className={summaryClasses}>Demo runs</summary>
      <div
        className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),32rem)] rounded-xl border border-stone-200 bg-white p-3 text-stone-700 shadow-xl sm:left-auto sm:right-0 sm:p-4"
        role="region"
        aria-label="Demo runs"
      >
        {uploadMode === "batch" ? (
          <>
            <p className="text-sm font-semibold text-stone-900">Batch demo</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Choose a preset batch. Each loads paired label images and application JSON with matching stems for
              automatic pairing.
            </p>
            <div className="mt-3 max-h-[min(58vh,34rem)] space-y-3 overflow-y-auto pr-1">
              {BATCH_DEMO_SUITES.map((suite) => {
                const outcomes = getBatchDemoSuiteOutcomes(suite);
                const loadingThis = demoLoadingBatchSuiteId === suite.id;
                return (
                  <button
                    key={suite.id}
                    type="button"
                    onClick={() => {
                      closeMenu();
                      void onSelectBatchDemo(suite.id);
                    }}
                    disabled={demoBusy}
                    className="flex w-full cursor-pointer flex-col rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-left transition hover:border-ttb-300 hover:bg-ttb-50/60 disabled:cursor-wait disabled:opacity-70"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-stone-900">{suite.title}</span>
                      <BatchOutcomeBadges
                        passCount={outcomes.passCount}
                        failCount={outcomes.failCount}
                      />
                    </div>
                    <span className="mt-1 block text-xs leading-relaxed text-stone-600">{suite.subtitle}</span>
                    <span className="mt-2 block text-[11px] font-medium text-stone-500">
                      {loadingThis
                        ? "Loading batch fixtures…"
                        : `${suite.caseIds.length} images + ${suite.caseIds.length} applications`}
                    </span>
                    <ul className="mt-2 space-y-1 border-t border-stone-200/80 pt-2">
                      {suite.caseIds.map((caseId) => {
                        const demoCase = DEMO_CASES_BY_ID[caseId];
                        return (
                          <li
                            key={caseId}
                            className="flex items-center justify-between gap-2 text-[11px] text-stone-700"
                          >
                            <span className="min-w-0 truncate">{demoCase.title}</span>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                demoCase.outcomeTone === "pass"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {demoCase.outcomeTone === "pass" ? "Pass" : "Fail"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-stone-500">
              Switch to <strong className="font-medium text-stone-700">Single label</strong> for one-off demos.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-stone-900">Load an existing eval fixture</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Presets include synthetic eval fixtures and on-bottle photos, each paired with committed application JSON.
              Some on-bottle options intentionally reuse the same photo with different application payloads.
            </p>
            <div className="mt-3 max-h-[min(58vh,34rem)] space-y-2 overflow-y-auto pr-1">
              {DEMO_CASES.map((demoCase) => {
                const loadingThisCase = demoLoadingCaseId === demoCase.id;
                const pairedAppLabel = demoCase.applicationRelativePath
                  .split("/")
                  .pop()
                  ?.replace(".json", "")
                  .replaceAll("_", " ");
                const isIntentionalMismatch =
                  demoCase.id.includes("mismatch") || demoCase.id.includes("fail-");
                return (
                  <button
                    key={demoCase.id}
                    type="button"
                    onClick={() => {
                      closeMenu();
                      void onSelectDemoCase(demoCase.id);
                    }}
                    disabled={demoBusy}
                    className="flex w-full cursor-pointer gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-left transition hover:border-ttb-300 hover:bg-ttb-50/60 disabled:cursor-wait disabled:opacity-70"
                  >
                    <Image
                      src={`/api/demo-cases/${demoCase.id}/image`}
                      alt={`${demoCase.title} thumbnail`}
                      width={96}
                      height={64}
                      className="h-16 w-24 shrink-0 rounded-md border border-stone-200 bg-white object-cover"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-stone-900">{demoCase.title}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            demoCase.outcomeTone === "pass"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {demoCase.outcomeTone === "pass" ? "Pass case" : "Stress case"}
                        </span>
                      </div>
                      <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-stone-500">
                        Paired app: {pairedAppLabel}
                        {isIntentionalMismatch ? " (intentional mismatch)" : ""}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-stone-600">{demoCase.subtitle}</span>
                      <span className="mt-2 block text-[11px] font-medium text-stone-500">
                        {loadingThisCase ? "Loading fixture..." : demoCase.outcomeSummary}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-stone-500">
              Switch to <strong className="font-medium text-stone-700">Batch</strong> for curated batch presets.
            </p>
          </>
        )}
        {demoLoadErrorText ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-900">
            {demoLoadErrorText}
          </p>
        ) : null}
      </div>
    </details>
  );
}
