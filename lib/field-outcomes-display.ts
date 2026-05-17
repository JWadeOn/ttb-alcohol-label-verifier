import type { FieldStatus } from "@/lib/schemas";

export function hasFieldValue(value: string | null): boolean {
  return value != null && String(value).trim() !== "";
}

export function truncateFieldCell(value: string | null, maxLen: number): string {
  if (!hasFieldValue(value)) return "—";
  const s = value!.trim();
  return s.length <= maxLen ? s : `${s.slice(0, maxLen - 1)}…`;
}

export function statusBadgeClasses(status: FieldStatus): string {
  switch (status) {
    case "pass":
      return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600/20";
    case "fail":
      return "bg-red-100 text-red-900 ring-1 ring-red-600/20";
    case "manual_review":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-600/25";
    case "not_applicable":
      return "bg-stone-200 text-stone-700 ring-1 ring-stone-400/30";
    default:
      return "bg-stone-100 text-stone-800";
  }
}

export function formatFieldStatusLabel(status: FieldStatus): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "manual_review":
      return "Needs review";
    case "not_applicable":
      return "Not applicable";
    default:
      return status;
  }
}
