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

/**
 * Compact workflow control for the page header (Edit · Verify · Results).
 * Descriptions live in `title` tooltips only to keep the strip short.
 */
export function WorkflowProcessTabs({
  phase,
  onSelect,
  hasCompletedRun,
}: {
  phase: WorkflowPhase;
  onSelect: (phase: WorkflowPhase) => void;
  /** True after at least one verify response has been received (success or error body). */
  hasCompletedRun: boolean;
}) {
  return (
    <div
      className="min-w-0 w-full max-w-[20rem] sm:max-w-none"
      role="tablist"
      aria-label="Verification workflow"
    >
      <div className="flex w-full items-stretch gap-px rounded-md border border-stone-200 bg-stone-100/90 p-px shadow-inner">
        {TABS.map((tab) => {
          const selected = phase === tab.id;
          const isResults = tab.id === "results";
          const disabled = isResults && !hasCompletedRun;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onSelect(tab.id);
              }}
              title={
                disabled
                  ? "Run verification first to see results."
                  : `${tab.title}: ${tab.description}`
              }
              className={`flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-[3px] px-1.5 text-center text-[11px] font-semibold leading-none transition sm:px-2 sm:text-xs ${
                selected
                  ? "cursor-pointer bg-ttb-600 text-white shadow-sm ring-1 ring-ttb-700/20"
                  : disabled
                    ? "cursor-not-allowed text-stone-400"
                    : "cursor-pointer text-stone-600 hover:bg-white/90 hover:text-stone-900"
              }`}
            >
              <span
                className={`shrink-0 text-[9px] font-bold uppercase tracking-wide ${
                  selected ? "text-ttb-100" : disabled ? "text-stone-400" : "text-stone-500"
                }`}
              >
                {tab.index}
              </span>
              <span className="min-w-0 truncate">{tab.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
