import type { VerifyBatchItem, VerifyBatchResponse } from "@/lib/schemas";

export type BatchApplicationOutcome = "pass" | "fail" | "manual_review" | "error";

export type BatchResultsOverall = "pass" | "fail" | "manual_review" | "mixed";

export type BatchApplicationStatusFilter = BatchApplicationOutcome | null;

export type BatchResultsCounts = Record<BatchApplicationOutcome, number>;

export type BatchResultsDigest = {
  counts: BatchResultsCounts;
  overall: BatchResultsOverall;
  applicationCount: number;
};

export function deriveBatchItemOutcome(item: VerifyBatchItem): BatchApplicationOutcome {
  if (!item.ok) return "error";
  const fields = item.result?.validation?.fields;
  if (!fields?.length) return "manual_review";
  if (fields.some((f) => f.status === "fail")) return "fail";
  if (fields.some((f) => f.status === "manual_review")) return "manual_review";
  return "pass";
}

export function buildBatchResultsDigest(response: VerifyBatchResponse): BatchResultsDigest {
  const counts: BatchResultsCounts = {
    pass: 0,
    fail: 0,
    manual_review: 0,
    error: 0,
  };

  for (const item of response.items) {
    counts[deriveBatchItemOutcome(item)] += 1;
  }

  const applicationCount = response.items.length;
  const hasFailOrError = counts.fail > 0 || counts.error > 0;
  const positiveKinds =
    (counts.pass > 0 ? 1 : 0) +
    (counts.manual_review > 0 ? 1 : 0) +
    (counts.fail > 0 ? 1 : 0) +
    (counts.error > 0 ? 1 : 0);

  let overall: BatchResultsOverall;
  if (hasFailOrError) {
    overall = positiveKinds > 1 ? "mixed" : "fail";
  } else if (counts.manual_review > 0) {
    overall = counts.pass > 0 ? "mixed" : "manual_review";
  } else if (counts.pass === applicationCount && applicationCount > 0) {
    overall = "pass";
  } else {
    overall = "mixed";
  }

  return { counts, overall, applicationCount };
}

export function filterBatchItems(
  items: VerifyBatchItem[],
  filter: BatchApplicationStatusFilter,
): VerifyBatchItem[] {
  if (!filter) return items;
  return items.filter((item) => deriveBatchItemOutcome(item) === filter);
}

export function batchOutcomeLabel(outcome: BatchApplicationOutcome): string {
  switch (outcome) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "manual_review":
      return "Needs review";
    case "error":
      return "Error";
    default:
      return outcome;
  }
}

export function batchOutcomeBadgeClasses(outcome: BatchApplicationOutcome): string {
  switch (outcome) {
    case "pass":
      return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600/20";
    case "fail":
      return "bg-red-100 text-red-900 ring-1 ring-red-600/20";
    case "manual_review":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-600/25";
    case "error":
      return "bg-stone-200 text-stone-800 ring-1 ring-stone-500/30";
    default:
      return "bg-stone-100 text-stone-800";
  }
}
