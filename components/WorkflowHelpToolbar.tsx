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
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-ttb-800 sm:space-y-4 sm:pl-6 sm:text-base sm:leading-relaxed">
            <li>
              In <strong className="font-semibold text-stone-900">Edit inputs</strong>, choose one label image and confirm
              the application data. Use <strong className="font-semibold text-stone-900">Demo runs</strong> to preload a
              committed fixture.
            </li>
            <li>
              Click <strong className="font-semibold text-stone-900">Run verification</strong> at the bottom of the page.
              For batch, switch to <strong className="font-semibold text-stone-900">Batch</strong> mode (up to 10 images).
            </li>
            <li>
              The verify screen shows pipeline status and failure details while the server request runs.
            </li>
            <li>
              Results shows field-by-field outcomes with pass, fail, and manual review statuses. Use the header controls to
              go back and edit inputs or run verification again.
            </li>
          </ol>
        </div>
      </details>
    </aside>
  );
}
