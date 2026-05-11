"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ApplicationJson,
  ApplicationJsonSchema,
} from "@/lib/schemas";

type EditorMode = "formatted" | "json";

type FieldKey = keyof ApplicationJson;

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
  { key: "alcoholContent", label: "Alcohol content", hint: "e.g. 45% ALC/VOL", kind: "string" },
  { key: "netContents", label: "Net contents", hint: "e.g. 750 mL", kind: "string" },
  {
    key: "governmentWarning",
    label: "Government warning",
    kind: "string",
    multiline: true,
  },
  { key: "nameAddress", label: "Name & address", kind: "string", multiline: true },
  { key: "countryOfOrigin", label: "Country of origin", kind: "string" },
];

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

type ApplicationEditorProps = {
  value: string;
  onChange: (next: string) => void;
};

export function ApplicationEditor({ value, onChange }: ApplicationEditorProps) {
  const [mode, setMode] = useState<EditorMode>("formatted");

  const parsed = useMemo(() => tryParseApplicationJson(value), [value]);

  const patch = useCallback(
    (partial: Partial<ApplicationJson>) => {
      const t = tryParseApplicationJson(value);
      if (!t.ok) return;
      const next: ApplicationJson = { ...t.data, ...partial };
      onChange(JSON.stringify(next, null, 2));
    },
    [value, onChange],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-0.5"
          role="group"
          aria-label="Application data editor mode"
        >
          <button
            type="button"
            onClick={() => setMode("formatted")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              mode === "formatted"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Formatted
          </button>
          <button
            type="button"
            onClick={() => setMode("json")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              mode === "json"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            JSON
          </button>
        </div>
        {mode === "json" ? (
          <span className="text-[11px] text-stone-500">Raw string sent as multipart field</span>
        ) : (
          <span className="text-[11px] text-stone-500">Fields match application schema (strict)</span>
        )}
      </div>

      {mode === "json" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={18}
          aria-label="Application JSON"
          className="min-h-[280px] w-full flex-1 resize-y rounded-lg border border-stone-300 bg-stone-50/80 px-3 py-2 font-mono text-xs leading-relaxed text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 lg:min-h-0"
        />
      ) : parsed.ok ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-4 sm:px-4">
          {APPLICATION_FIELDS.map((f) => {
            if (f.kind === "boolean") {
              const checked = parsed.data[f.key] === true;
              return (
                <label
                  key={f.key}
                  className="flex cursor-pointer flex-col gap-1.5 border-b border-stone-200/80 pb-4 last:border-0 last:pb-0"
                >
                  <span className="text-xs font-semibold text-stone-800">{f.label}</span>
                  {f.hint ? <span className="text-[11px] text-stone-500">{f.hint}</span> : null}
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => patch({ [f.key]: e.target.checked })}
                    className="h-4 w-4 rounded border-stone-400 text-amber-600 focus:ring-amber-500"
                  />
                </label>
              );
            }

            const strVal =
              typeof parsed.data[f.key] === "string"
                ? (parsed.data[f.key] as string)
                : parsed.data[f.key] == null
                  ? ""
                  : String(parsed.data[f.key]);

            return (
              <label
                key={f.key}
                className="flex flex-col gap-1.5 border-b border-stone-200/80 pb-4 last:border-0 last:pb-0"
              >
                <span className="text-xs font-semibold text-stone-800">{f.label}</span>
                {f.hint ? <span className="text-[11px] text-stone-500">{f.hint}</span> : null}
                {f.multiline ? (
                  <textarea
                    value={strVal}
                    onChange={(e) => patch({ [f.key]: e.target.value })}
                    rows={f.key === "governmentWarning" ? 6 : 3}
                    spellCheck={false}
                    className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                  />
                ) : (
                  <input
                    type="text"
                    value={strVal}
                    onChange={(e) => patch({ [f.key]: e.target.value })}
                    spellCheck={false}
                    className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                  />
                )}
              </label>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-medium text-amber-950">Cannot show formatted view</p>
          <p className="text-xs leading-relaxed text-amber-900">{parsed.message}</p>
          <button
            type="button"
            onClick={() => setMode("json")}
            className="self-start rounded-md bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
          >
            Switch to JSON view to fix
          </button>
        </div>
      )}
    </div>
  );
}
