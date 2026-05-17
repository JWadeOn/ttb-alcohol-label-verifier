"use client";

import { FIELD_LABELS } from "@/app/components/verify/constants";
import {
  formatFieldStatusLabel,
  hasFieldValue,
  statusBadgeClasses,
  truncateFieldCell,
} from "@/lib/field-outcomes-display";
import type { FieldStatus, FieldValidationRow } from "@/lib/schemas";

type FieldOutcomesTableProps = {
  fields: FieldValidationRow[];
  fieldStatusFilter?: FieldStatus | null;
  showFilteredHint?: boolean;
  showFullComparisonNote?: boolean;
  headingId?: string;
};

export function FieldOutcomesTable({
  fields,
  fieldStatusFilter = null,
  showFilteredHint = true,
  showFullComparisonNote = false,
  headingId,
}: FieldOutcomesTableProps) {
  const visible = fieldStatusFilter
    ? fields.filter((row) => row.status === fieldStatusFilter)
    : fields;

  return (
    <div>
      <h3
        id={headingId}
        className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500"
      >
        Field outcomes
        {fieldStatusFilter && showFilteredHint ? (
          <span className="ml-2 font-normal normal-case text-stone-600">(filtered)</span>
        ) : null}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
              <th className="px-3 py-2">Field</th>
              <th className="whitespace-nowrap px-3 py-2">Status</th>
              <th className="px-3 py-2">From label</th>
              <th className="px-3 py-2">From application</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const extractedDisplay =
                row.status === "manual_review" && !hasFieldValue(row.extractedValue)
                  ? "No confident label text"
                  : truncateFieldCell(row.extractedValue, 56);
              const applicationDisplay = truncateFieldCell(row.applicationValue, 56);
              const extractedTrimmed = row.extractedValue?.trim() ?? "";
              const applicationTrimmed = row.applicationValue?.trim() ?? "";
              const extractedExpandable =
                extractedDisplay !== "No confident label text" && extractedTrimmed.length > 56;
              const applicationExpandable = applicationTrimmed.length > 56;

              return (
                <tr key={row.fieldId} className="border-b border-stone-100 last:border-0">
                  <td className="max-w-[10rem] px-3 py-2 font-medium text-stone-900">
                    {FIELD_LABELS[row.fieldId]}
                  </td>
                  <td className="max-w-[9.5rem] px-3 py-2 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold leading-snug ${statusBadgeClasses(row.status)}`}
                    >
                      {formatFieldStatusLabel(row.status)}
                    </span>
                  </td>
                  <td
                    className="max-w-[14rem] px-3 py-2 font-mono text-xs text-stone-800"
                    title={row.extractedValue ?? undefined}
                  >
                    {extractedExpandable ? (
                      <details
                        className="group max-w-full"
                        {...(row.fieldId === "governmentWarning" ? { open: true } : {})}
                      >
                        <summary className="cursor-pointer list-none truncate text-xs leading-relaxed text-stone-800 [&::-webkit-details-marker]:hidden">
                          {extractedDisplay}
                          <span className="ml-1 text-[10px] font-medium text-ttb-700 underline underline-offset-2">
                            View full
                          </span>
                        </summary>
                        <p className="mt-1.5 rounded border border-stone-200 bg-white px-2 py-1.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-stone-800">
                          {row.extractedValue}
                        </p>
                      </details>
                    ) : (
                      extractedDisplay
                    )}
                  </td>
                  <td
                    className="max-w-[14rem] px-3 py-2 font-mono text-xs text-stone-800"
                    title={row.applicationValue ?? undefined}
                  >
                    {applicationExpandable ? (
                      <details
                        className="group max-w-full"
                        {...(row.fieldId === "governmentWarning" ? { open: true } : {})}
                      >
                        <summary className="cursor-pointer list-none truncate text-xs leading-relaxed text-stone-800 [&::-webkit-details-marker]:hidden">
                          {applicationDisplay}
                          <span className="ml-1 text-[10px] font-medium text-ttb-700 underline underline-offset-2">
                            View full
                          </span>
                        </summary>
                        <p className="mt-1.5 rounded border border-stone-200 bg-white px-2 py-1.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-stone-800">
                          {row.applicationValue}
                        </p>
                      </details>
                    ) : (
                      applicationDisplay
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showFullComparisonNote ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
          Full values, coded rules, and validator notes appear in{" "}
          <span className="font-medium text-stone-700">Full comparison by field</span> below.
        </p>
      ) : null}
    </div>
  );
}
