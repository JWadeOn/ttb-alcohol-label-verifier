"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApplicationEditor } from "@/components/ApplicationEditor";
import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import {
  VERIFY_FORM_FIELDS,
  type FieldId,
  type FieldStatus,
  type VerifyErrorResponse,
  type VerifySuccessResponse,
  VerifyErrorResponseSchema,
  VerifySuccessResponseSchema,
} from "@/lib/schemas";

const DEFAULT_APPLICATION = JSON.stringify(
  {
    productClass: "distilled_spirits",
    isImport: false,
    brandName: "Stone's Throw Distilling Co",
    classType: "Straight Bourbon Whiskey",
    alcoholContent: "45% ALC/VOL",
    netContents: "750 mL",
    governmentWarning: CANONICAL_GOVERNMENT_WARNING,
    nameAddress: "",
    countryOfOrigin: "",
  },
  null,
  2,
);

const FIELD_LABELS: Record<FieldId, string> = {
  brandName: "Brand name",
  classType: "Class / type",
  alcoholContent: "Alcohol content",
  netContents: "Net contents",
  governmentWarning: "Government warning",
  nameAddress: "Name & address",
  countryOfOrigin: "Country of origin",
};

function parseExtractionField(raw: unknown): {
  value: string | null;
  confidence: number;
  reason: string | null;
} {
  if (!raw || typeof raw !== "object") {
    return { value: null, confidence: 0, reason: null };
  }
  const o = raw as Record<string, unknown>;
  const value =
    typeof o.value === "string"
      ? o.value
      : o.value === null || o.value === undefined
        ? null
        : null;
  const confidence = typeof o.confidence === "number" ? o.confidence : 0;
  const reason =
    typeof o.reason === "string"
      ? o.reason
      : o.reason === null
        ? null
        : null;
  return { value, confidence, reason };
}

function statusBadgeClasses(status: FieldStatus): string {
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

function formatStatusLabel(status: FieldStatus): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "manual_review":
      return "Manual review";
    case "not_applicable":
      return "N/A";
    default:
      return status;
  }
}

function ValueBlock({
  label,
  text,
  sub,
}: {
  label: string;
  text: string | null;
  sub?: string | null;
}) {
  const display =
    text !== null && text.trim() !== "" ? text : "—";
  const isLong = display.length > 200;

  return (
    <div className="flex min-h-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </span>
      <div
        className={`rounded-md border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs leading-relaxed text-stone-900 break-words whitespace-pre-wrap ${
          isLong ? "max-h-40 overflow-y-auto" : ""
        }`}
      >
        {display}
      </div>
      {sub ? (
        <span className="text-[11px] text-stone-500">{sub}</span>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [applicationJson, setApplicationJson] = useState(DEFAULT_APPLICATION);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [successPayload, setSuccessPayload] = useState<VerifySuccessResponse | null>(
    null,
  );
  const [errorPayload, setErrorPayload] = useState<VerifyErrorResponse | null>(null);
  const [rawResponseJson, setRawResponseJson] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setErrorText(null);
    setSuccessPayload(null);
    setErrorPayload(null);
    setRawResponseJson(null);
    setHttpStatus(null);

    try {
      const formData = new FormData();
      formData.append(VERIFY_FORM_FIELDS.image, file);
      formData.append(VERIFY_FORM_FIELDS.application, applicationJson);

      const res = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setErrorText(`Non-JSON response (${res.status}): ${text.slice(0, 500)}`);
        return;
      }

      setHttpStatus(res.status);
      setRawResponseJson(JSON.stringify(parsed, null, 2));

      if (res.ok) {
        const checked = VerifySuccessResponseSchema.safeParse(parsed);
        if (checked.success) {
          setSuccessPayload(checked.data);
        } else {
          setErrorText("Response JSON did not match the expected success schema.");
        }
      } else {
        const errParsed = VerifyErrorResponseSchema.safeParse(parsed);
        if (errParsed.success) {
          setErrorPayload(errParsed.data);
        }
        setErrorText(`HTTP ${res.status}`);
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const showResultsPanel = rawResponseJson !== null;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-2 border-b border-stone-200 pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            Phase 1
          </span>
          <span className="text-stone-300" aria-hidden>
            ·
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Label verification
          </h1>
        </div>
        <details className="text-xs leading-snug text-stone-500 sm:max-w-sm sm:text-right">
          <summary className="cursor-pointer list-none text-amber-800 hover:underline [&::-webkit-details-marker]:hidden">
            How this works
          </summary>
          <p className="mt-2 text-left text-stone-600 sm:text-right">
            Pick a label image, confirm or edit application fields on the right, then{" "}
            <strong className="font-medium text-stone-700">Run verification</strong>. Results
            appear below with the label next to extracted vs submitted values. Uses OpenAI
            vision plus deterministic checks (see README).
          </p>
        </details>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              aria-label="Choose label image file"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                setFile(f ?? null);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
            >
              Choose label image
            </button>
            <span
              className="min-w-0 truncate text-xs text-stone-600 sm:max-w-[min(40vw,280px)]"
              title={file?.name}
            >
              {file ? (
                <span className="font-mono text-stone-800">{file.name}</span>
              ) : (
                <span className="text-stone-500">JPEG or PNG required</span>
              )}
            </span>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full shrink-0 rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[200px]"
          >
            {loading ? "Verifying…" : "Run verification"}
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
          <section
            aria-labelledby="workbench-label-heading"
            className="flex min-h-[min(40vh,420px)] flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
              <h2 id="workbench-label-heading" className="text-sm font-semibold text-stone-900">
                Label preview
              </h2>
              {file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-amber-800 underline decoration-amber-600/40 underline-offset-2 hover:text-amber-950"
                >
                  Replace image
                </button>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {previewUrl ? (
                <div className="flex flex-1 justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={file?.name ? `Label preview: ${file.name}` : "Label preview"}
                    className="max-h-[min(42vh,440px)] w-auto max-w-full object-contain p-2 sm:p-3"
                  />
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
                  <p className="text-sm text-stone-600">No label yet</p>
                  <p className="max-w-xs text-xs text-stone-500">
                    Use <strong className="text-stone-700">Choose label image</strong> above, then run verification.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section
            aria-labelledby="workbench-json-heading"
            className="flex min-h-[min(40vh,420px)] flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <header className="border-b border-stone-100 pb-2">
              <h2 id="workbench-json-heading" className="text-sm font-semibold text-stone-900">
                Application data
              </h2>
              <p className="mt-0.5 text-[11px] text-stone-500">
                Formatted fields or <strong className="text-stone-700">JSON</strong> toggle — edit if needed before you run verification.
              </p>
            </header>
            <ApplicationEditor value={applicationJson} onChange={setApplicationJson} />
          </section>
        </div>
      </form>

      {errorText ? (
        <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">{errorText}</p>
          {errorPayload ? (
            <dl className="mt-2 grid gap-1 text-xs">
              <div>
                <dt className="inline font-semibold text-red-950">Code: </dt>
                <dd className="inline font-mono">{errorPayload.code}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-red-950">Message: </dt>
                <dd className="inline">{errorPayload.message}</dd>
              </div>
            </dl>
          ) : null}
        </section>
      ) : null}

      {showResultsPanel ? (
        <section className="space-y-5 border-t border-stone-200 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-900">Verification results</h2>
            {httpStatus !== null ? (
              <span className="rounded-md bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-700">
                HTTP {httpStatus}
              </span>
            ) : null}
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start lg:gap-10">
            <div className="space-y-2 lg:sticky lg:top-6">
              <h3 className="text-sm font-semibold text-stone-800">Label image</h3>
              {previewUrl ? (
                <div className="flex max-h-[min(70vh,560px)] min-h-[200px] justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Label used for this verification"
                    className="max-h-[min(70vh,560px)] w-auto max-w-full object-contain p-2"
                  />
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  No image preview (select a file and run verify again).
                </p>
              )}
              {file ? (
                <p className="text-xs text-stone-500">
                  File: <span className="font-mono text-stone-700">{file.name}</span>
                </p>
              ) : null}
            </div>

            <div className="min-w-0 space-y-6">
              {successPayload ? (
                <>
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-stone-800">Run summary</h3>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                          Request ID
                        </dt>
                        <dd className="font-mono text-xs text-stone-800 break-all">
                          {successPayload.requestId}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                          Extraction
                        </dt>
                        <dd className="text-stone-800">
                          <span className="font-mono text-xs">
                            {successPayload.extraction.provider}
                          </span>
                          <span className="text-stone-500">
                            {" "}
                            · {successPayload.extraction.durationMs} ms
                          </span>
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                          Image quality
                        </dt>
                        <dd className="text-stone-800">
                          {successPayload.imageQuality.ok ? (
                            <span className="text-emerald-800">Passed</span>
                          ) : (
                            <span className="text-red-800">
                              {successPayload.imageQuality.reason ?? "Not ok"}
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-stone-800">
                      Field comparison
                    </h3>
                    <p className="text-xs text-stone-500">
                      Compare <strong className="text-stone-700">From label</strong>{" "}
                      (model read) to <strong className="text-stone-700">From application</strong>{" "}
                      (submitted JSON). Status reflects automated rules.
                    </p>
                    <ul className="space-y-4">
                      {successPayload.validation.fields.map((row) => {
                        const rawEx = successPayload.extraction.fields[row.fieldId];
                        const ex = parseExtractionField(rawEx);
                        const confPct = Math.round(ex.confidence * 100);
                        const confLabel =
                          ex.confidence > 0
                            ? `Model confidence ${confPct}%`
                            : null;

                        return (
                          <li
                            key={row.fieldId}
                            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                          >
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-stone-900">
                                {FIELD_LABELS[row.fieldId]}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(row.status)}`}
                              >
                                {formatStatusLabel(row.status)}
                              </span>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <ValueBlock
                                label="From label (extracted)"
                                text={row.extractedValue}
                                sub={
                                  confLabel
                                    ? `${confLabel}${ex.reason ? ` · ${ex.reason}` : ""}`
                                    : ex.reason ?? undefined
                                }
                              />
                              <ValueBlock
                                label="From application (submitted)"
                                text={row.applicationValue}
                              />
                            </div>
                            <p className="mt-3 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-600">
                              {row.message}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Success response could not be parsed for the comparison table. Use
                  raw JSON below if needed.
                </div>
              )}

              <details className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-stone-800">
                  Raw API JSON
                </summary>
                <pre className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-stone-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-stone-800">
                  {rawResponseJson}
                </pre>
              </details>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
