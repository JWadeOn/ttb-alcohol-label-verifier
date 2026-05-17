"use client";

import { useMemo } from "react";
import { BatchApplicationDetails } from "@/app/components/verify/BatchApplicationDetails";
import { BatchApplicationsTable } from "@/app/components/verify/BatchApplicationsTable";
import { BatchResultsSummaryCard } from "@/app/components/verify/BatchResultsSummaryCard";
import type { ReviewDisposition } from "@/app/components/verify/ReviewDispositionCompact";
import {
  buildBatchResultsDigest,
  filterBatchItems,
  type BatchApplicationStatusFilter,
} from "@/lib/batch-results";
import type { VerifyBatchResponse } from "@/lib/schemas";

type BatchResultsViewProps = {
  response: VerifyBatchResponse;
  applicationFilter: BatchApplicationStatusFilter;
  onApplicationFilterChange: (filter: BatchApplicationStatusFilter) => void;
  dispositions: Record<number, ReviewDisposition>;
  onDisposition: (index: number, next: ReviewDisposition) => void;
  expandedIndices: Record<number, boolean>;
  onExpandedChange: (index: number, open: boolean) => void;
};

export function BatchResultsView({
  response,
  applicationFilter,
  onApplicationFilterChange,
  dispositions,
  onDisposition,
  expandedIndices,
  onExpandedChange,
}: BatchResultsViewProps) {
  const digest = useMemo(() => buildBatchResultsDigest(response), [response]);
  const filteredItems = useMemo(
    () => filterBatchItems(response.items, applicationFilter),
    [response.items, applicationFilter],
  );
  const handleRowActivate = (index: number) => {
    onExpandedChange(index, true);
    requestAnimationFrame(() => {
      document.getElementById(`batch-app-details-${index}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  return (
    <section className="mx-auto w-full max-w-none space-y-4">
      <BatchResultsSummaryCard
        digest={digest}
        summary={response.summary}
        activeFilter={applicationFilter}
        onFilterChange={onApplicationFilterChange}
      />

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Applications in this batch
        </h3>
        <BatchApplicationsTable
          items={filteredItems}
          dispositions={dispositions}
          onDisposition={onDisposition}
          onRowActivate={handleRowActivate}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Field detail by application
        </h3>
        {filteredItems.length === 0 ? (
          <p className="text-sm text-stone-600">No applications to show for this filter.</p>
        ) : (
          filteredItems.map((item) => {
            const detailsId = `batch-app-details-${item.index}`;
            return (
              <BatchApplicationDetails
                key={`${item.index}-${item.fileName}`}
                item={item}
                detailsId={detailsId}
                open={expandedIndices[item.index] ?? false}
                onOpenChange={(open) => onExpandedChange(item.index, open)}
                disposition={dispositions[item.index] ?? null}
                onDisposition={(next) => onDisposition(item.index, next)}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
