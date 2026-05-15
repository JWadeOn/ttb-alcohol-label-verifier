"use client";

import type { VerifyBatchResponse } from "@/lib/schemas";
import { CLIENT_BATCH_MAX_IMAGES, CLIENT_UPLOAD_MAX_BYTES } from "./constants";
import { formatBytes } from "./format";

type BatchPanelProps = {
  batchFiles: File[];
  batchResponse: VerifyBatchResponse | null;
  batchErrorText: string | null;
  onChooseBatchFiles: () => void;
};

export function BatchPanel({
  batchFiles,
  batchResponse,
  batchErrorText,
  onChooseBatchFiles,
}: BatchPanelProps) {
  return (
    <>
      <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
        Batch mode reuses the same application JSON across up to {CLIENT_BATCH_MAX_IMAGES} images (
        {formatBytes(CLIENT_UPLOAD_MAX_BYTES)} max per file). Processing is synchronous in this MVP: expect roughly a
        few seconds per image, running with bounded server concurrency (typically 2 at a time).
      </p>
      <div className="flex min-h-0 flex-1 flex-col">
        {batchFiles.length > 0 || batchResponse ? (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/70 p-3">
            <div className="space-y-3">
              <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold text-stone-900">Selected files ({batchFiles.length})</p>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
                  {batchFiles.length > 0 ? (
                    batchFiles.map((batchFile) => (
                      <div
                        key={`${batchFile.name}-${batchFile.size}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-700"
                      >
                        <span className="min-w-0 truncate font-mono">{batchFile.name}</span>
                        <span className="shrink-0 text-stone-500">{formatBytes(batchFile.size)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-stone-500">No files selected yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onChooseBatchFiles}
                  className="mt-2 cursor-pointer rounded-lg border border-ttb-300 bg-ttb-50 px-2.5 py-1 text-xs font-semibold text-ttb-900 transition hover:bg-ttb-100"
                >
                  {batchFiles.length > 0 ? "Choose different images" : "Choose batch images"}
                </button>
              </div>
              {batchResponse ? (
                <div className="space-y-2">
                  <div className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700">
                    total {batchResponse.summary.total} · success {batchResponse.summary.success} · error{" "}
                    {batchResponse.summary.error} · pass {batchResponse.summary.pass} · fail{" "}
                    {batchResponse.summary.fail} · manual review {batchResponse.summary.manualReview} ·{" "}
                    {batchResponse.summary.totalMs} ms
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-stone-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 text-stone-600">
                        <tr>
                          <th className="px-2 py-1">File</th>
                          <th className="px-2 py-1">HTTP</th>
                          <th className="px-2 py-1">ms</th>
                          <th className="px-2 py-1">Result</th>
                          <th className="px-2 py-1">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResponse.items.map((item) => (
                          <tr key={`${item.index}-${item.fileName}`} className="border-t border-stone-100">
                            <td className="px-2 py-1 font-mono text-[11px] text-stone-800">{item.fileName}</td>
                            <td className="px-2 py-1 text-stone-700">{item.status}</td>
                            <td className="px-2 py-1 font-mono text-[11px] text-stone-700">{item.durationMs}</td>
                            <td className="px-2 py-1 text-stone-700">
                              {item.ok
                                ? item.result?.validation?.fields?.some((f) => f.status === "fail")
                                  ? "fail"
                                  : item.result?.validation?.fields?.some((f) => f.status === "manual_review")
                                    ? "manual_review"
                                    : "pass"
                                : item.error?.code ?? "error"}
                            </td>
                            <td
                              className="max-w-[12rem] truncate px-2 py-1 text-[11px] text-stone-600"
                              title={item.error?.message}
                            >
                              {item.ok ? "—" : (item.error?.message ?? "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ttb-200 bg-gradient-to-b from-ttb-50/80 to-white px-3 py-4 text-center">
            <p className="text-xs font-semibold text-stone-800">1. Choose batch images</p>
            <p className="max-w-[18rem] text-[11px] leading-relaxed text-stone-500">
              2. Run batch verification with the current application data applied to every image.
            </p>
            <button
              type="button"
              onClick={onChooseBatchFiles}
              className="cursor-pointer rounded-lg border-2 border-ttb-600 bg-ttb-50 px-3 py-2 text-xs font-semibold text-ttb-900 transition hover:bg-ttb-100 sm:text-sm"
            >
              Choose batch images
            </button>
            <p className="text-[10px] text-stone-500">
              JPEG or PNG · up to {CLIENT_BATCH_MAX_IMAGES} files
            </p>
          </div>
        )}
      </div>
      {batchErrorText ? (
        <p className="mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900">
          {batchErrorText}
        </p>
      ) : null}
    </>
  );
}
