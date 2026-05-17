"use client";

import type { FieldStatus } from "@/lib/schemas";
import type { ReactNode } from "react";

export type ResultsOverall = "pass" | "fail" | "manual_review" | "mixed";

export type ResultsSummaryCounts = Record<FieldStatus, number>;

export type ResultsSummaryDigest = {
  counts: ResultsSummaryCounts;
  overall: ResultsOverall;
  fieldCount: number;
};

export type OutcomeStatusFilter = "pass" | "manual_review" | "fail" | null;

function overallHeadline(overall: ResultsOverall): string {
  switch (overall) {
    case "pass":
      return "Passed";
    case "fail":
      return "Failed";
    case "manual_review":
      return "Needs Review";
    default:
      return "Needs Review";
  }
}

function overallCardClasses(overall: ResultsOverall): string {
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

function overallTitleClasses(overall: ResultsOverall): string {
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

type TagKind = "pass" | "manual_review" | "fail";

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
};

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

export function ResultsSummaryCard({
  digest,
  extractionPathLine,
  activeFilter,
  onFilterChange,
  moreInfo,
}: {
  digest: ResultsSummaryDigest;
  extractionPathLine: string;
  activeFilter: OutcomeStatusFilter;
  onFilterChange: (filter: OutcomeStatusFilter) => void;
  moreInfo: ReactNode;
}) {
  const { counts, overall, fieldCount } = digest;
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
        aria-label="Filter field outcomes by status"
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
        {counts.not_applicable > 0 ? (
          <span className="inline-flex items-center rounded-full bg-stone-200/90 px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-400/30">
            Not applicable
            <span className="ml-1.5 min-w-[1.25rem] rounded-full bg-white/80 px-1.5 py-0.5 text-center text-xs font-bold tabular-nums text-stone-800">
              {counts.not_applicable}
            </span>
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs font-medium leading-snug text-stone-600">
        {activeFilter
          ? `Showing ${TAG_META[activeFilter].label.toLowerCase()} fields — click the tag again to show all ${fieldCount}.`
          : `Click a tag to filter the field table below (${fieldCount} field${fieldCount === 1 ? "" : "s"}).`}
      </p>
      <p className="mt-1 text-xs font-medium leading-snug text-stone-600">{extractionPathLine}</p>
      {moreInfo}
    </div>
  );
}
