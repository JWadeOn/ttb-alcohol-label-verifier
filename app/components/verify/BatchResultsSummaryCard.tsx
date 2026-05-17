"use client";

import type { BatchApplicationStatusFilter, BatchResultsDigest } from "@/lib/batch-results";
import type { VerifyBatchResponse } from "@/lib/schemas";

type TagKind = "pass" | "manual_review" | "fail" | "error";

const TAG_META: Record<TagKind, { label: string; active: string; idle: string }> = {
  pass: {
    label: "Pass",
    active: "bg-emerald-600 text-white ring-2 ring-emerald-700/40 shadow-sm",
    idle:
      "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600/25 hover:bg-emerald-200/90 hover:ring-emerald-600/40",
  },
  manual_review: {
    label: "Needs review",
    active: "bg-amber-600 text-white ring-2 ring-amber-700/40 shadow-sm",
    idle:
      "bg-amber-100 text-amber-950 ring-1 ring-amber-600/25 hover:bg-amber-200/90 hover:ring-amber-600/40",
  },
  fail: {
    label: "Fail",
    active: "bg-red-600 text-white ring-2 ring-red-700/40 shadow-sm",
    idle: "bg-red-100 text-red-900 ring-1 ring-red-600/25 hover:bg-red-200/90 hover:ring-red-600/40",
  },
  error: {
    label: "Error",
    active: "bg-stone-700 text-white ring-2 ring-stone-800/40 shadow-sm",
    idle:
      "bg-stone-200 text-stone-800 ring-1 ring-stone-500/30 hover:bg-stone-300/90 hover:ring-stone-500/40",
  },
};

function overallHeadline(overall: BatchResultsDigest["overall"]): string {
  switch (overall) {
    case "pass":
      return "Batch passed";
    case "fail":
      return "Batch failed";
    case "manual_review":
      return "Batch needs review";
    default:
      return "Mixed batch outcomes";
  }
}

function overallCardClasses(overall: BatchResultsDigest["overall"]): string {
  switch (overall) {
    case "fail":
      return "border-red-200 bg-red-50/90";
    case "manual_review":
    case "mixed":
      return "border-amber-200 bg-amber-50/80";
    case "pass":
      return "border-emerald-200 bg-emerald-50/70";
    default:
      return "border-stone-200 bg-white";
  }
}

function overallTitleClasses(overall: BatchResultsDigest["overall"]): string {
  switch (overall) {
    case "fail":
      return "text-red-900";
    case "manual_review":
    case "mixed":
      return "text-amber-950";
    case "pass":
      return "text-emerald-900";
    default:
      return "text-stone-900";
  }
}

function OutcomeTag({
  kind,
  count,
  active,
  onClick,
}: {
  kind: TagKind;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  if (count <= 0) return null;
  const meta = TAG_META[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${active ? meta.active : meta.idle}`}
    >
      <span>{meta.label}</span>
      <span
        className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums ${
          active ? "bg-white/25 text-inherit" : "bg-white/70 text-inherit"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

type BatchResultsSummaryCardProps = {
  digest: BatchResultsDigest;
  summary: VerifyBatchResponse["summary"];
  activeFilter: BatchApplicationStatusFilter;
  onFilterChange: (filter: BatchApplicationStatusFilter) => void;
};

export function BatchResultsSummaryCard({
  digest,
  summary,
  activeFilter,
  onFilterChange,
}: BatchResultsSummaryCardProps) {
  const { counts, overall, applicationCount } = digest;

  const toggle = (kind: TagKind) => {
    onFilterChange(activeFilter === kind ? null : kind);
  };

  return (
    <div className={`rounded-xl border px-3 py-3 shadow-sm sm:px-4 ${overallCardClasses(overall)}`}>
      <h3
        className={`text-xl font-bold leading-snug tracking-tight sm:text-2xl ${overallTitleClasses(overall)}`}
      >
        {overallHeadline(overall)}
      </h3>

      <div
        className="mt-3 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filter applications by outcome"
      >
        <OutcomeTag
          kind="pass"
          count={counts.pass}
          active={activeFilter === "pass"}
          onClick={() => toggle("pass")}
        />
        <OutcomeTag
          kind="manual_review"
          count={counts.manual_review}
          active={activeFilter === "manual_review"}
          onClick={() => toggle("manual_review")}
        />
        <OutcomeTag
          kind="fail"
          count={counts.fail}
          active={activeFilter === "fail"}
          onClick={() => toggle("fail")}
        />
        <OutcomeTag
          kind="error"
          count={counts.error}
          active={activeFilter === "error"}
          onClick={() => toggle("error")}
        />
      </div>

      <p className="mt-2 text-xs font-medium leading-snug text-stone-600">
        {activeFilter
          ? `Showing ${TAG_META[activeFilter].label.toLowerCase()} applications — click the tag again to show all ${applicationCount}.`
          : `Click a tag to filter the application list below (${applicationCount} application${applicationCount === 1 ? "" : "s"}).`}
      </p>
      <p className="mt-1 text-xs font-medium leading-snug text-stone-600">
        {summary.total} label{summary.total === 1 ? "" : "s"} verified in {summary.totalMs} ms (
        {summary.success} succeeded, {summary.error} request error{summary.error === 1 ? "" : "s"}).
      </p>
    </div>
  );
}
