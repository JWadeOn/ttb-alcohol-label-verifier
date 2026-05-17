export type BatchVerifyProgressPhase = "prepare" | "processing" | "finishing";

export type BatchVerifyFileStatus = "pending" | "running" | "done";

/** Timer interval for advancing the estimated active label index while the batch request is in flight. */
export function batchVerifyProgressIntervalMs(total: number): number {
  if (total <= 0) return 1500;
  return Math.min(4500, Math.max(750, Math.floor(14000 / total)));
}

export function batchVerifyItemStatus(
  index: number,
  activeIndex: number,
  phase: BatchVerifyProgressPhase,
): BatchVerifyFileStatus {
  if (phase === "finishing") return "done";
  if (phase === "prepare") return index === 0 ? "running" : "pending";
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "running";
  return "pending";
}

export function batchVerifyProgressPercent(
  phase: BatchVerifyProgressPhase,
  activeIndex: number,
  total: number,
): number {
  if (total <= 0) return phase === "finishing" ? 100 : 0;
  if (phase === "finishing") return 100;
  if (phase === "prepare") return Math.min(12, Math.max(4, Math.floor(100 / (total + 3))));
  const completed = Math.min(activeIndex + 1, total);
  return Math.min(96, Math.max(14, Math.round((completed / total) * 96)));
}

export function batchVerifyProgressCaption(
  phase: BatchVerifyProgressPhase,
  activeIndex: number,
  total: number,
  activeFileName: string | null,
): string {
  const name = activeFileName ? `"${activeFileName}"` : "the current label";
  if (phase === "prepare") {
    return "Preparing your batch: pairing applications and building the upload request…";
  }
  if (phase === "finishing") {
    return "Finishing up — collecting per-label results from the server…";
  }
  if (total <= 1) {
    return `Verifying ${name} on the server (extract label text, then compare to application data)…`;
  }
  return `Verifying label ${activeIndex + 1} of ${total}: ${name}. The server runs a few labels in parallel; this indicator advances on a timer until the batch completes.`;
}
