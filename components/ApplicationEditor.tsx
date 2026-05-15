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
  { key: "isImport", label: "Import product", hint: "If checked, country of origin may apply.", kind: "boolean" },
  { key: "brandName", label: "Brand name", kind: "string" },
  { key: "classType", label: "Class / type", kind: "string" },
  { key: "alcoholContent", label: "Alcohol content", hint: "% ABV/VOL or proof", kind: "string" },
  { key: "netContents", label: "Net contents", hint: "Volume with unit (mL, L, fl oz)", kind: "string" },
  {
    key: "governmentWarning",
    label: "Government warning",
    kind: "string",
    multiline: true,
  },
  { key: "nameAddress", label: "Name & address", kind: "string", multiline: true },
  { key: "countryOfOrigin", label: "Country of origin", kind: "string" },
];

const PRODUCT_CLASS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Select product class" },
  { value: "distilled_spirits", label: "Distilled spirits" },
  { value: "wine", label: "Wine" },
  { value: "beer", label: "Beer / malt beverage" },
];

export const APPLICATION_FORMATTED_PAGE_NAV = [
  {
    shortLabel: "Basics",
    title: "Product, import & quantity",
    hint: "Brand line, class/type, alcohol statement, and net contents.",
    fields: ["Product class", "Import", "Brand name", "Class / type", "Alcohol", "Net contents"],
  },
  {
    shortLabel: "Statements",
    title: "Warning & responsible party",
    hint: "Warning text, responsible party, and origin when needed.",
    fields: ["Government warning", "Name & address", "Country of origin"],
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
  /** Tighter fields and smaller controls (workbench fits viewport). */
  density?: "default" | "compact";
  /**
   * When set (0 … APPLICATION_FORMATTED_PAGE_COUNT-1), formatted mode lists only that page’s fields.
   * JSON mode always shows the full document.
   */
  formattedPageIndex?: number;
  /** Required with `formattedPageIndex` on the home page to switch Basics / Statements. */
  onFormattedPageChange?: (pageIndex: number) => void;
};

export function ApplicationEditor({
  value,
  onChange,
  density = "default",
  formattedPageIndex,
  onFormattedPageChange,
}: ApplicationEditorProps) {
  const [mode, setMode] = useState<EditorMode>("formatted");
  const compact = density === "compact";

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
      const t = tryParseApplicationJson(value);
      if (!t.ok) return;
      const next: ApplicationJson = { ...t.data, ...partial };
      onChange(JSON.stringify(next, null, 2));
    },
    [value, onChange],
  );

  const labelClass = compact ? "text-[11px] font-semibold text-stone-800" : "text-xs font-semibold text-stone-800";
  const hintClass = compact ? "text-[10px] text-stone-500" : "text-[11px] text-stone-500";
  const inputClass = compact
    ? "w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none focus:border-ttb-500 focus:ring-1 focus:ring-ttb-500/35"
    : "w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-ttb-500 focus:ring-1 focus:ring-ttb-500/35";
  const textareaClass = inputClass;
  const fieldGap = compact ? "gap-1 border-b border-stone-200/80 pb-2.5 last:border-0 last:pb-0" : "gap-1.5 border-b border-stone-200/80 pb-4 last:border-0 last:pb-0";

  const showPagePager =
    mode === "formatted" &&
    formattedPageIndex !== undefined &&
    typeof onFormattedPageChange === "function";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1">
      <div className="flex shrink-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            className="inline-flex rounded-xl border border-stone-200 bg-stone-100/90 p-0.5 shadow-inner"
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
        {showPagePager ? (
          <div className="flex items-center gap-1.5 pl-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Page</span>
            <div
              className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5"
              role="group"
              aria-label="Application field pages"
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
                        ? `${pg.shortLabel} (page ${i + 1} of ${APPLICATION_FORMATTED_PAGE_COUNT}, selected)`
                        : `Show ${pg.shortLabel} (page ${i + 1} of ${APPLICATION_FORMATTED_PAGE_COUNT})`
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
          </div>
        ) : null}
      </div>

      {mode === "json" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <p className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-stone-600">
            Edit the submitted application JSON here. Use <span className="font-semibold text-stone-800">Results</span>{" "}
            after verification for field-by-field review.
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            aria-label="Application JSON"
            className="w-full min-h-[18rem] flex-1 resize-none rounded-lg border border-stone-300 bg-stone-50/80 px-3 py-2.5 font-mono text-xs leading-6 text-stone-900 outline-none focus:border-ttb-500 focus:ring-2 focus:ring-ttb-500/30 sm:min-h-[22rem] sm:text-[13px]"
          />
        </div>
      ) : parsed.ok ? (
        <div
          className={`min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 py-2 sm:px-3 ${
            compact ? "space-y-2" : "space-y-4 px-3 py-4 sm:px-4"
          }`}
        >
          {fieldsForPage.map((f) => {
            if (f.kind === "boolean") {
              const checked = parsed.data[f.key] === true;
              const boolRow = compact
                ? "flex cursor-pointer items-start gap-2.5 border-b border-stone-200/80 pb-2.5 last:border-0 last:pb-0"
                : "flex cursor-pointer items-start gap-3 border-b border-stone-200/80 pb-4 last:border-0 last:pb-0";
              return (
                <label key={f.key} className={boolRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => patch({ [f.key]: e.target.checked })}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-stone-400 text-ttb-600 focus:ring-ttb-500"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={labelClass}>{f.label}</span>
                    {f.hint ? <span className={hintClass}>{f.hint}</span> : null}
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

            const warnRows = compact ? 3 : 6;
            const addrRows = compact ? 2 : 3;

            return (
              <label key={f.key} className={`flex flex-col ${fieldGap}`}>
                <span className={labelClass}>{f.label}</span>
                {f.hint ? <span className={hintClass}>{f.hint}</span> : null}
                {f.multiline ? (
                  <textarea
                    value={strVal}
                    onChange={(e) => patch({ [f.key]: e.target.value })}
                    rows={f.key === "governmentWarning" ? warnRows : addrRows}
                    spellCheck={false}
                    className={textareaClass}
                  />
                ) : f.key === "productClass" ? (
                  <select
                    value={strVal}
                    onChange={(e) => patch({ [f.key]: e.target.value })}
                    className={inputClass}
                    aria-label="Product class"
                  >
                    {PRODUCT_CLASS_OPTIONS.map((option) => (
                      <option key={option.value || "__empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={strVal}
                    onChange={(e) => patch({ [f.key]: e.target.value })}
                    spellCheck={false}
                    className={inputClass}
                  />
                )}
              </label>
            );
          })}
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
