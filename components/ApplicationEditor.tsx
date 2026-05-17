"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ApplicationJson,
  ApplicationJsonSchema,
} from "@/lib/schemas";

type EditorMode = "formatted" | "json";

type FieldKey = keyof ApplicationJson;

export const APPLICATION_FORMATTED_PAGE_COUNT = 2;

/** First page: identity & quantities; second: warning & address fields. */
export const APPLICATION_FORMATTED_PAGE_BREAK = 6;

const APPLICATION_FIELDS: {
  key: FieldKey;
  label: string;
  hint?: string;
  multiline?: boolean;
  kind: "string" | "boolean";
}[] = [
  { key: "productClass", label: "Product class", kind: "string" },
  { key: "brandName", label: "Brand name", kind: "string" },
  { key: "classType", label: "Class / type", kind: "string" },
  { key: "alcoholContent", label: "Alcohol content", hint: "% ABV/VOL or proof", kind: "string" },
  { key: "netContents", label: "Net contents", hint: "Volume with unit (mL, L, fl oz)", kind: "string" },
  { key: "isImport", label: "Import product", hint: "Turn on to enable country of origin.", kind: "boolean" },
  { key: "countryOfOrigin", label: "Country of origin", hint: "Used when Import product is enabled.", kind: "string" },
  {
    key: "nameAddress",
    label: "Name & address",
    hint: 'Full line as on the label, e.g. "Distilled by …" or "Bottled by …" plus company and location',
    kind: "string",
    multiline: true,
  },
];

/** Single-label formatted layout: explicit rows (not document-order grid flow). */
const SINGLE_COLUMN_FIELD_ROWS: FieldKey[][] = [
  ["productClass"],
  ["brandName", "classType"],
  ["alcoholContent", "netContents"],
  ["isImport", "countryOfOrigin"],
  ["nameAddress"],
];

const PRODUCT_CLASS_OPTIONS: Array<{ value: string; label: string; disabled?: boolean }> = [
  { value: "distilled_spirits", label: "Distilled spirits (supported)" },
  { value: "wine", label: "Wine (not yet supported)", disabled: true },
  { value: "beer", label: "Beer / malt beverage (not yet supported)", disabled: true },
];

export const APPLICATION_FORMATTED_PAGE_NAV = [
  {
    shortLabel: "Core fields",
    title: "Product, import & quantity",
    hint: "Brand line, class/type, alcohol statement, and net contents for distilled spirits.",
    fields: ["Product class", "Import", "Brand name", "Class / type", "Alcohol", "Net contents"],
  },
  {
    shortLabel: "Supplemental",
    title: "Responsible party & origin",
    hint: "Full name/address line (with Distilled by, Bottled by, or Imported by when printed) and country of origin when import is enabled.",
    fields: ["Name & address", "Country of origin"],
  },
] as const;

function tryParseApplicationJson(
  s: string,
): { ok: true; data: ApplicationJson } | { ok: false; message: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(s);
  } catch {
    return { ok: false, message: "Invalid JSON (syntax error)." };
  }
  const r = ApplicationJsonSchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return {
    ok: false,
    message: r.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
  };
}

export type ApplicationEditorProps = {
  value: string;
  onChange: (next: string) => void;
  /** Tighter fields and smaller controls (batch preview pane). */
  density?: "default" | "compact";
  /** Single-label workbench: one column with roomier spacing; batch preview stays two-column when compact. */
  columnMode?: "one" | "two";
  /**
   * When set (0 … APPLICATION_FORMATTED_PAGE_COUNT-1), formatted mode lists only that page’s fields.
   * JSON mode always shows the full document.
   */
  formattedPageIndex?: number;
  /** Required with `formattedPageIndex` on the home page to switch Basics / Statements. */
  onFormattedPageChange?: (pageIndex: number) => void;
  /** Read-only preview (batch application review). */
  readOnly?: boolean;
  /** Mount Formatted/JSON toggle on the top edge of the field container (single-label workbench). */
  connectedToolbar?: boolean;
};

export function ApplicationEditor({
  value,
  onChange,
  density = "default",
  columnMode = "two",
  formattedPageIndex,
  onFormattedPageChange,
  readOnly = false,
  connectedToolbar = false,
}: ApplicationEditorProps) {
  const [mode, setMode] = useState<EditorMode>("formatted");
  const compact = density === "compact";
  const singleColumn = !compact && columnMode === "one";

  const parsed = useMemo(() => tryParseApplicationJson(value), [value]);

  const fieldsForPage = useMemo(() => {
    if (formattedPageIndex === undefined) return APPLICATION_FIELDS;
    const start =
      formattedPageIndex <= 0
        ? 0
        : Math.min(APPLICATION_FORMATTED_PAGE_BREAK, APPLICATION_FIELDS.length);
    const end =
      formattedPageIndex <= 0
        ? Math.min(APPLICATION_FORMATTED_PAGE_BREAK, APPLICATION_FIELDS.length)
        : APPLICATION_FIELDS.length;
    return APPLICATION_FIELDS.slice(start, end);
  }, [formattedPageIndex]);

  const patch = useCallback(
    (partial: Partial<ApplicationJson>) => {
      if (readOnly) return;
      const t = tryParseApplicationJson(value);
      if (!t.ok) return;
      const next: ApplicationJson = { ...t.data, ...partial };
      onChange(JSON.stringify(next, null, 2));
    },
    [value, onChange, readOnly],
  );

  const compactReadOnlyPreview = compact && readOnly;

  const labelClass = compact
    ? compactReadOnlyPreview
      ? "text-[11px] font-semibold leading-snug text-stone-800"
      : "text-[11px] font-semibold leading-tight text-stone-800"
    : "text-xs font-semibold text-stone-800";
  const hintClass = compact
    ? "text-[10px] font-normal leading-snug text-stone-500"
    : "text-[11px] text-stone-500";
  const inputClass = compact
    ? compactReadOnlyPreview
      ? "w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs leading-snug text-stone-900 outline-none focus:border-ttb-500 focus:ring-1 focus:ring-ttb-500/35"
      : "w-full rounded-md border border-stone-300 bg-white px-2 py-0.5 text-xs leading-snug text-stone-900 outline-none focus:border-ttb-500 focus:ring-1 focus:ring-ttb-500/35"
    : "w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-ttb-500 focus:ring-1 focus:ring-ttb-500/35";
  const textareaClass = inputClass;
  const fieldGap = compactReadOnlyPreview ? "gap-0.5" : compact ? "gap-0" : "gap-1.5";
  const showFieldHints = !compactReadOnlyPreview;
  const compactInlineHints = compact && showFieldHints;

  const formattedGridClass = compact
    ? compactReadOnlyPreview
      ? "grid h-fit max-h-full grid-cols-1 content-start gap-x-2 gap-y-2 px-2.5 py-2 lg:grid-cols-2"
      : "grid flex-1 grid-cols-1 content-start gap-x-2 gap-y-1 px-2 py-1 lg:grid-cols-2"
    : singleColumn
      ? connectedToolbar
        ? "mx-auto flex w-full max-w-xl flex-col gap-2 px-3 py-2 sm:px-3.5"
        : "mx-auto flex w-full max-w-xl flex-1 flex-col gap-2 px-4 py-5 sm:px-5"
      : "grid flex-1 grid-cols-1 content-start gap-3 px-3 py-4 lg:grid-cols-2 sm:px-4";

  const showPagePager =
    mode === "formatted" &&
    formattedPageIndex !== undefined &&
    typeof onFormattedPageChange === "function";

  const useConnectedShell = connectedToolbar && !compact;

  const modeToolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        className="inline-flex rounded-md border border-stone-200 bg-stone-100/80 p-0.5"
        role="group"
        aria-label="Application data editor mode"
      >
        <button
          type="button"
          onClick={() => setMode("formatted")}
          className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition ${
            mode === "formatted"
              ? "bg-ttb-600 text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Formatted
        </button>
        <button
          type="button"
          onClick={() => setMode("json")}
          className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition ${
            mode === "json"
              ? "bg-ttb-600 text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          JSON
        </button>
      </div>
      {mode === "json" ? (
        <span className="text-[10px] text-stone-500">Raw input editing view</span>
      ) : (
        <span className="text-[10px] text-stone-500">Expected schema</span>
      )}
    </div>
  );

  const formattedFieldElements = parsed.ok
    ? (() => {
        type FieldDef = (typeof APPLICATION_FIELDS)[number];

        const renderFormattedField = (f: FieldDef) => {
          const fieldColClass =
            !singleColumn && (f.multiline || f.key === "productClass") ? "lg:col-span-2" : "";

          if (f.kind === "boolean") {
            const checked = parsed.data[f.key] === true;
            const boolRow = compact
              ? "flex cursor-pointer items-start gap-2"
              : "flex cursor-pointer items-start gap-3";
            return (
              <label key={f.key} className={`${boolRow} min-w-0 ${fieldColClass}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly}
                  onChange={(e) => patch({ [f.key]: e.target.checked })}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-stone-400 text-ttb-600 focus:ring-ttb-500 disabled:cursor-default"
                />
                <span className={`flex min-w-0 flex-1 flex-col ${compact ? "gap-0" : "gap-0.5"}`}>
                  <span className={labelClass}>{f.label}</span>
                  {showFieldHints && f.hint ? <span className={hintClass}>{f.hint}</span> : null}
                </span>
              </label>
            );
          }

          const strVal =
            typeof parsed.data[f.key] === "string"
              ? (parsed.data[f.key] as string)
              : parsed.data[f.key] == null
                ? ""
                : String(parsed.data[f.key]);
          const normalizedProductClass =
            f.key === "productClass" &&
            strVal !== "distilled_spirits" &&
            strVal !== "wine" &&
            strVal !== "beer"
              ? "distilled_spirits"
              : strVal;
          const isCountryField = f.key === "countryOfOrigin";
          const importEnabled = parsed.data.isImport === true;
          const countryDisabled = isCountryField && !importEnabled;
          const countryReadOnlyPlaceholder = compactReadOnlyPreview && countryDisabled;

          const warnRows = compact ? 3 : 6;
          const addrRows = compact ? 2 : useConnectedShell ? 2 : 3;

          return (
            <label
              key={f.key}
              className={`flex min-w-0 flex-col ${fieldGap} ${fieldColClass} ${countryDisabled && !countryReadOnlyPlaceholder ? "opacity-60" : ""}`}
            >
              {compactInlineHints && showFieldHints && f.hint ? (
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span className={`${labelClass} ${countryDisabled ? "text-stone-500" : ""}`}>{f.label}</span>
                  <span className={`${hintClass} ${countryDisabled ? "text-stone-400" : ""}`}>{f.hint}</span>
                </span>
              ) : (
                <>
                  <span className={`${labelClass} ${countryDisabled ? "text-stone-500" : ""}`}>{f.label}</span>
                  {showFieldHints && f.hint ? (
                    <span className={`${hintClass} ${countryDisabled ? "text-stone-400" : ""}`}>{f.hint}</span>
                  ) : null}
                </>
              )}
              {f.multiline ? (
                <textarea
                  value={strVal}
                  readOnly={readOnly}
                  onChange={(e) => patch({ [f.key]: e.target.value })}
                  rows={f.key === "governmentWarning" ? warnRows : addrRows}
                  spellCheck={false}
                  className={`${textareaClass} resize-none ${readOnly ? "cursor-default bg-stone-50 text-stone-700" : ""}`}
                />
              ) : f.key === "productClass" ? (
                <select
                  value={normalizedProductClass}
                  disabled={readOnly}
                  onChange={(e) => patch({ [f.key]: e.target.value })}
                  className={`${inputClass} ${readOnly ? "cursor-default bg-stone-50 text-stone-700" : ""}`}
                  aria-label="Product class"
                >
                  {PRODUCT_CLASS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : countryReadOnlyPlaceholder ? (
                <div className={`${inputClass} text-stone-500`}>—</div>
              ) : (
                <input
                  type="text"
                  value={strVal}
                  readOnly={readOnly}
                  onChange={(e) => patch({ [f.key]: e.target.value })}
                  spellCheck={false}
                  disabled={countryDisabled}
                  className={`${inputClass} ${
                    readOnly
                      ? "cursor-default bg-stone-50 text-stone-700"
                      : countryDisabled
                        ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                        : ""
                  }`}
                />
              )}
              {countryDisabled && showFieldHints ? (
                <span className="text-[10px] leading-tight text-stone-500">
                  Enable Import product to edit this field.
                </span>
              ) : null}
            </label>
          );
        };

        if (singleColumn) {
          return SINGLE_COLUMN_FIELD_ROWS.map((rowKeys) => {
            const rowFields = rowKeys
              .map((key) => fieldsForPage.find((field) => field.key === key))
              .filter((field): field is FieldDef => field != null);
            if (rowFields.length === 0) return null;
            return (
              <div
                key={rowKeys.join("-")}
                className={
                  rowFields.length === 1
                    ? "min-w-0"
                    : "grid min-w-0 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 sm:gap-x-8"
                }
              >
                {rowFields.map((field) => renderFormattedField(field))}
              </div>
            );
          });
        }

        return fieldsForPage.map((f) => renderFormattedField(f));
      })()
    : null
  return (
    <div className={`flex h-full min-h-0 flex-1 flex-col ${compact ? "gap-0.5" : useConnectedShell ? "gap-0" : "gap-1"}`}>
      {(!useConnectedShell || showPagePager) ? (
      <div className={`flex shrink-0 flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
        {!useConnectedShell ? modeToolbar : null}
        {showPagePager ? (
          <div className="flex flex-col items-start gap-1 pl-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Section</span>
            <div
              className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5"
              role="group"
              aria-label="Application field sections"
            >
              {APPLICATION_FORMATTED_PAGE_NAV.map((pg, i) => {
                const active = formattedPageIndex === i;
                return (
                  <button
                    key={pg.shortLabel}
                    type="button"
                    onClick={() => {
                      onFormattedPageChange(i);
                    }}
                    aria-label={
                      active
                        ? `${pg.shortLabel} section selected`
                        : `Show ${pg.shortLabel} section`
                    }
                    aria-pressed={active}
                    className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition sm:px-2.5 ${
                      active
                        ? "bg-stone-900 text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    {pg.shortLabel}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-stone-500">
              Switch sections to edit all application fields.
            </span>
          </div>
        ) : null}
      </div>
      ) : null}

      {mode === "json" ? (
        useConnectedShell ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200 bg-stone-50/50">
            <div className="shrink-0 border-b border-stone-200 bg-white/90 px-3 py-1.5">{modeToolbar}</div>
            <p className="shrink-0 border-b border-stone-100 bg-stone-50/80 px-3 py-1.5 text-[11px] leading-relaxed text-stone-600">
              Edit the submitted application JSON here. Use Results after verification for field-by-field
              review.
            </p>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              readOnly={readOnly}
              spellCheck={false}
              aria-label="Application JSON"
              className={`min-h-0 w-full flex-1 resize-none border-0 bg-transparent px-3 py-2 font-mono text-xs leading-6 text-stone-900 outline-none focus:ring-0 sm:text-[13px] ${
                readOnly ? "cursor-default text-stone-700" : ""
              }`}
            />
          </div>
        ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <p className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-stone-600">
            {readOnly
              ? "Read-only preview of the selected batch application JSON."
              : "Edit the submitted application JSON here. Use Results after verification for field-by-field review."}
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            aria-label="Application JSON"
            className={`w-full min-h-[18rem] flex-1 resize-none rounded-lg border border-stone-300 bg-stone-50/80 px-3 py-2.5 font-mono text-xs leading-6 text-stone-900 outline-none focus:border-ttb-500 focus:ring-2 focus:ring-ttb-500/30 sm:min-h-[22rem] sm:text-[13px] ${
              readOnly ? "cursor-default text-stone-700" : ""
            }`}
          />
        </div>
        )
      ) : parsed.ok ? (
        <div
          className={
            useConnectedShell
              ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200 bg-stone-50/50"
              : `min-h-0 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/50 ${
                  compactReadOnlyPreview ? "flex-none" : "flex-1"
                } ${formattedGridClass}`
          }
        >
          {useConnectedShell ? (
            <div className="shrink-0 border-b border-stone-200 bg-white/90 px-3 py-1.5">{modeToolbar}</div>
          ) : null}
          {useConnectedShell ? (
            <div className={`min-h-0 flex-1 overflow-y-auto ${formattedGridClass}`}>
              {formattedFieldElements}
            </div>
          ) : (
            formattedFieldElements
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2 rounded-lg border border-ttb-200 bg-ttb-50 px-3 py-3">
          <p className="text-xs font-medium text-ttb-900">Cannot show formatted view</p>
          <p className="text-[11px] leading-relaxed text-ttb-800">{parsed.message}</p>
          <button
            type="button"
            onClick={() => setMode("json")}
            className="cursor-pointer self-start rounded-md bg-ttb-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-ttb-800"
          >
            Switch to JSON view to fix
          </button>
        </div>
      )}
    </div>
  );
}
