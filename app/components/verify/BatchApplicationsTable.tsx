"use client";

import {
  ReviewDispositionCompact,
  type ReviewDisposition,
} from "@/app/components/verify/ReviewDispositionCompact";
import {
  batchOutcomeBadgeClasses,
  batchOutcomeLabel,
  deriveBatchItemOutcome,
} from "@/lib/batch-results";
import type { VerifyBatchItem } from "@/lib/schemas";

type BatchApplicationsTableProps = {
  items: VerifyBatchItem[];
  dispositions: Record<number, ReviewDisposition>;
  onDisposition: (index: number, next: ReviewDisposition) => void;
  onRowActivate: (index: number) => void;
};

export function BatchApplicationsTable({
  items,
  dispositions,
  onDisposition,
  onRowActivate,
}: BatchApplicationsTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-600">
        No applications match the current filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
            <th className="px-3 py-2">Label file</th>
            <th className="whitespace-nowrap px-3 py-2">Status</th>
            <th className="whitespace-nowrap px-3 py-2">Duration</th>
            <th className="px-3 py-2">Your review</th>
            <th className="whitespace-nowrap px-3 py-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const outcome = deriveBatchItemOutcome(item);
            return (
              <tr
                key={`${item.index}-${item.fileName}`}
                className="cursor-pointer border-b border-stone-100 last:border-0 hover:bg-stone-50/80"
                onClick={() => onRowActivate(item.index)}
              >
                <td className="max-w-[14rem] px-3 py-2 font-mono text-xs text-stone-800">{item.fileName}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold leading-snug ${batchOutcomeBadgeClasses(outcome)}`}
                  >
                    {batchOutcomeLabel(outcome)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-stone-700">
                  {item.durationMs} ms
                </td>
                <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                  <ReviewDispositionCompact
                    disposition={dispositions[item.index] ?? null}
                    onDisposition={(next) => onDisposition(item.index, next)}
                    hideLabel
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-ttb-700">
                  Expand
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
