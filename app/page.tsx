"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

/** Plain-language rule the deterministic validator applies for this field. */
const FIELD_REQUIREMENTS: Record<FieldId, string> = {
  brandName:
    "Fuzzy match: normalized label text vs application brand, above a minimum similarity score.",
  classType:
    "Fuzzy match: normalized label text vs application class/type line.",
  alcoholContent:
    "Parsed strength (percent ABV or proof) must agree within a small tolerance.",
  netContents:
    "Parsed volume (mL, L, fl oz, etc.) must agree within tolerance after unit conversion.",
  governmentWarning:
    "Exact match: label warning text must equal the application string (case-sensitive).",
  nameAddress:
    "Compared when application includes text; if application omits it, the row is manual review even when the label is blank.",
  countryOfOrigin:
    "Not applicable when import is unchecked. For imports, fuzzy match when both sides include text.",
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

function FieldComparisonPanel({
  role,
  title,
  titleShort,
  children,
}: {
  role: "extracted" | "application" | "requirement";
  title: string;
  /** Shorter label for tight mobile layout */
  titleShort: string;
  children: ReactNode;
}) {
  const shell =
    role === "extracted"
      ? "border-sky-200/90 bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-500/10 border-l-sky-500"
      : role === "application"
        ? "border-violet-200/90 bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-500/10 border-l-violet-600"
        : "border-amber-200/90 bg-gradient-to-b from-amber-50/80 to-amber-50/30 ring-1 ring-amber-600/10 border-l-amber-600";

  return (
    <div
      className={`flex min-h-0 flex-col gap-2 rounded-lg border border-stone-200/80 pl-3 shadow-sm ${shell} border-l-4`}
    >
      <div className="pr-2 pt-2">
        <span className="hidden text-[11px] font-bold uppercase tracking-wide text-stone-600 sm:inline">
          {title}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600 sm:hidden">
          {titleShort}
        </span>
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2">{children}</div>
    </div>
  );
}

function MonospaceValueBox({
  text,
  sub,
}: {
  text: string | null;
  sub?: string | null;
}) {
  const display = text !== null && text.trim() !== "" ? text : "—";
  const isLong = display.length > 200;

  return (
    <>
      <div
        className={`rounded-md border border-stone-200/90 bg-white/90 px-3 py-2 font-mono text-xs leading-relaxed text-stone-900 break-words whitespace-pre-wrap shadow-sm ${
          isLong ? "max-h-40 overflow-y-auto" : ""
        }`}
      >
        {display}
      </div>
      {sub ? <span className="mt-1 block text-[11px] text-stone-500">{sub}</span> : null}
    </>
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
                    <p className="text-xs leading-relaxed text-stone-600">
                      Three columns per field: what the model read from the label, what you submitted in
                      application JSON, and the rule this prototype uses. The badge is the outcome for that
                      field; the line below is the validator explanation for this run.
                    </p>
                    <div
                      className="flex flex-wrap gap-2 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-[11px] text-stone-700"
                      aria-label="Column legend"
                    >
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-sky-500" aria-hidden />
                        Label (extracted)
                      </span>
                      <span className="text-stone-300" aria-hidden>
                        |
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-violet-600" aria-hidden />
                        Application (submitted)
                      </span>
                      <span className="text-stone-300" aria-hidden>
                        |
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-amber-600" aria-hidden />
                        Requirement (rule)
                      </span>
                    </div>
                    <ul className="space-y-5">
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
                            <div className="grid gap-3 lg:grid-cols-3">
                              <FieldComparisonPanel
                                role="extracted"
                                title="From label (extracted)"
                                titleShort="Label"
                              >
                                <MonospaceValueBox
                                  text={row.extractedValue}
                                  sub={
                                    confLabel
                                      ? `${confLabel}${ex.reason ? ` · ${ex.reason}` : ""}`
                                      : ex.reason ?? undefined
                                  }
                                />
                              </FieldComparisonPanel>
                              <FieldComparisonPanel
                                role="application"
                                title="From application (submitted)"
                                titleShort="Application"
                              >
                                <MonospaceValueBox text={row.applicationValue} />
                              </FieldComparisonPanel>
                              <FieldComparisonPanel
                                role="requirement"
                                title="Requirement (this prototype)"
                                titleShort="Rule"
                              >
                                <p className="rounded-md border border-amber-200/70 bg-white/70 px-3 py-2 text-xs leading-snug text-stone-800">
                                  {FIELD_REQUIREMENTS[row.fieldId]}
                                </p>
                              </FieldComparisonPanel>
                            </div>
                            <p className="mt-3 border-t border-stone-100 pt-3 text-xs font-medium leading-relaxed text-stone-800">
                              <span className="text-stone-500">Outcome for this run: </span>
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
