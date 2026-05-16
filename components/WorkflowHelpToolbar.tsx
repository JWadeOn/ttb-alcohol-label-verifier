"use client";

import { FixtureLoader } from "@/app/components/verify/FixtureLoader";
import type { DemoCaseId } from "@/lib/demo-cases";

type WorkflowHelpToolbarProps = {
  demoLoadingCaseId: DemoCaseId | null;
  demoLoadErrorText: string | null;
  onSelectDemoCase: (id: DemoCaseId) => void | Promise<void>;
};

export function WorkflowHelpToolbar({
  demoLoadingCaseId,
  demoLoadErrorText,
  onSelectDemoCase,
}: WorkflowHelpToolbarProps) {
  return (
    <aside
      className="pointer-events-auto flex w-full min-w-0 items-center gap-2 sm:w-auto sm:justify-end sm:self-start sm:pt-0.5 sm:pl-3 sm:border-l sm:border-stone-200"
      aria-label="Help and demo tools"
    >
      <FixtureLoader
        variant="toolbar"
        demoLoadingCaseId={demoLoadingCaseId}
        demoLoadErrorText={demoLoadErrorText}
        onSelectDemoCase={onSelectDemoCase}
      />
      <details className="relative min-w-0 flex-1 sm:flex-none sm:max-w-[18rem]">
        <summary className="flex h-8 w-full cursor-pointer list-none items-center justify-center rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs font-medium leading-none text-stone-800 shadow-sm outline-none transition hover:bg-white hover:ring-2 hover:ring-stone-400/30 focus-visible:ring-2 focus-visible:ring-stone-500/40 [&::-webkit-details-marker]:hidden open:bg-white open:ring-2 sm:inline-flex sm:w-max sm:justify-center">
          How this works
        </summary>
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),30rem)] max-h-[min(70vh,36rem)] overflow-y-auto rounded-xl border border-stone-200 bg-white p-4 text-stone-700 shadow-xl sm:left-auto sm:right-0 sm:p-5"
          role="region"
          aria-label="How this works"
        >
          <div className="space-y-3 text-sm leading-relaxed sm:text-[15px]">
            <p className="font-semibold text-stone-900">Quick guide</p>
            <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-ttb-800">
              <li>
                <strong className="text-stone-900">Edit inputs:</strong> choose a label image, then enter application
                data.
              </li>
              <li>
                <strong className="text-stone-900">Run verification:</strong> click the button at the bottom.
              </li>
              <li>
                <strong className="text-stone-900">Review results:</strong> check field outcomes (`pass`, `fail`,
                `manual_review`) and rerun if you change inputs.
              </li>
            </ol>
            <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
              Tip: use <strong className="text-stone-800">Demo runs</strong> to preload a fixture instantly.
            </div>
          </div>
        </div>
      </details>
    </aside>
  );
}
