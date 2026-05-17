"use client";

import { FieldOutcomesTable } from "@/app/components/verify/FieldOutcomesTable";
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

type BatchApplicationDetailsProps = {
  item: VerifyBatchItem;
  detailsId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disposition: ReviewDisposition;
  onDisposition: (next: ReviewDisposition) => void;
};

export function BatchApplicationDetails({
  item,
  detailsId,
  open,
  onOpenChange,
  disposition,
  onDisposition,
}: BatchApplicationDetailsProps) {
  const outcome = deriveBatchItemOutcome(item);

  return (
    <details
      id={detailsId}
      open={open}
      onToggle={(e) => onOpenChange(e.currentTarget.open)}
      className="rounded-xl border border-stone-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="truncate font-mono text-xs font-semibold text-stone-900">{item.fileName}</span>
          <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-snug ${batchOutcomeBadgeClasses(outcome)}`}
          >
            {batchOutcomeLabel(outcome)}
          </span>
        </div>
        <div className="shrink-0" onClick={(e) => e.preventDefault()}>
          <ReviewDispositionCompact
            disposition={disposition}
            onDisposition={onDisposition}
            hideLabel
          />
        </div>
      </summary>
      <div className="border-t border-stone-100 px-3 py-3 sm:px-4">
        {!item.ok ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
            <p className="font-semibold">{item.error?.code ?? "Error"}</p>
            <p className="mt-1 text-xs leading-relaxed">{item.error?.message ?? "Verification failed."}</p>
            <p className="mt-2 font-mono text-[11px] text-red-800/85">HTTP {item.status}</p>
          </div>
        ) : item.result?.validation?.fields?.length ? (
          <FieldOutcomesTable
            fields={item.result.validation.fields}
            showFilteredHint={false}
            headingId={`${detailsId}-fields-heading`}
          />
        ) : (
          <p className="text-sm text-stone-600">No field comparison data returned for this label.</p>
        )}
      </div>
    </details>
  );
}
