"use client";

export type WorkflowPhase = "edit" | "verify" | "results";

type TabDef = {
  id: WorkflowPhase;
  index: string;
  title: string;
  description: string;
};

const TABS: TabDef[] = [
  { id: "edit", index: "1", title: "Edit", description: "Label + application" },
  { id: "verify", index: "2", title: "Verify", description: "Pipeline status" },
  { id: "results", index: "3", title: "Results", description: "Outcome & fields" },
];

type StepState = "complete" | "current" | "available" | "blocked";

function resolveStepState(
  tabId: WorkflowPhase,
  phase: WorkflowPhase,
  canEnterVerify: boolean,
  hasCompletedRun: boolean,
): StepState {
  if (phase === tabId) return "current";
  if (tabId === "edit") return phase === "verify" || phase === "results" ? "complete" : "available";
  if (tabId === "verify") {
    if (!canEnterVerify) return "blocked";
    return phase === "results" ? "complete" : "available";
  }
  if (!hasCompletedRun) return "blocked";
  return "available";
}

export function WorkflowProcessTabs({
  phase,
  onSelect,
  hasCompletedRun,
  canEnterVerify,
  verifyBlockedReason,
}: {
  phase: WorkflowPhase;
  onSelect: (phase: WorkflowPhase) => void;
  /** True after at least one verify response has been received (success or error body). */
  hasCompletedRun: boolean;
  /** True when the user has the minimum valid inputs to enter the verify step. */
  canEnterVerify: boolean;
  /** Why Verify is blocked when `canEnterVerify` is false. */
  verifyBlockedReason?: string;
}) {
  return (
    <div className="min-w-0 w-full max-w-[24rem] sm:max-w-none" aria-label="Verification workflow">
      <div className="flex w-full items-stretch gap-1.5">
        {TABS.map((tab) => {
          const state = resolveStepState(tab.id, phase, canEnterVerify, hasCompletedRun);
          const selected = state === "current";
          const disabled = state === "blocked";
          const complete = state === "complete";
          const bubbleClasses =
            state === "current"
              ? "bg-white/20 text-white"
              : state === "complete"
                ? "bg-emerald-600 text-white"
                : state === "available"
                  ? "bg-stone-900/5 text-stone-700"
                  : "bg-stone-200 text-stone-400";
          const buttonClasses =
            state === "current"
              ? "bg-ttb-600 text-white shadow-sm ring-1 ring-ttb-700/20"
              : state === "complete"
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                : state === "available"
                  ? "border-stone-300 bg-white text-stone-700 hover:border-ttb-300 hover:bg-stone-50 hover:text-stone-900"
                  : "border-stone-200 bg-stone-50 text-stone-400";
          const blockedReason =
            tab.id === "verify"
              ? (verifyBlockedReason ?? "Add a label image and valid application data to continue to Verify.")
              : "Run verification first to see results.";
          const label =
            state === "blocked"
              ? `${tab.title} blocked. ${blockedReason}`
              : state === "complete"
                ? `${tab.title} complete. ${tab.description}`
                : `${tab.title}. ${tab.description}`;

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={selected ? "step" : undefined}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onSelect(tab.id);
              }}
              title={disabled ? blockedReason : `${tab.title}: ${tab.description}`}
              aria-label={label}
              className={`group flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border px-2.5 text-center text-[11px] font-semibold leading-none transition sm:px-3 sm:text-xs ${buttonClasses} ${
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${bubbleClasses}`}>
                {complete ? (
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                ) : (
                  tab.index
                )}
              </span>
              <span className="min-w-0 truncate">{tab.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
