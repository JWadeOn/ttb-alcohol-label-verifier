"use client";

import { useMemo, useState } from "react";
import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import { VERIFY_FORM_FIELDS } from "@/lib/schemas";

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

export default function HomePage() {
  const [applicationJson, setApplicationJson] = useState(DEFAULT_APPLICATION);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setErrorText(null);
    setResponseJson(null);

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

      setResponseJson(JSON.stringify(parsed, null, 2));
      if (!res.ok) {
        setErrorText(`HTTP ${res.status}`);
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2 border-b border-stone-800 pb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-500/90">
          Phase 1 · Primary extraction path
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-50">
          Label verification
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-400">
          Upload a label image and paste application JSON. The API runs image
          quality checks, OpenAI vision extraction, and deterministic field
          validation (fallback OCR lands in Phase 2).
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-stone-300">Label image</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-stone-200 file:mr-3 file:rounded-md file:border-0 file:bg-stone-700 file:px-3 file:py-1.5 file:text-sm file:text-stone-100 hover:border-stone-600"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              setFile(f ?? null);
            }}
          />
          <span className="text-xs text-stone-500">JPEG or PNG</span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-stone-300">
            Application JSON (<code className="text-amber-200/90">application</code>{" "}
            part)
          </span>
          <textarea
            value={applicationJson}
            onChange={(ev) => setApplicationJson(ev.target.value)}
            spellCheck={false}
            rows={14}
            className="font-mono text-xs leading-relaxed rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-stone-200 outline-none focus:border-amber-700/80 focus:ring-1 focus:ring-amber-700/40"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-stone-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Running…" : "Verify label"}
        </button>
      </form>

      {errorText ? (
        <section className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {errorText}
        </section>
      ) : null}

      {responseJson ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-stone-300">Response</h2>
          <pre className="max-h-[480px] overflow-auto rounded-lg border border-stone-800 bg-stone-900/80 p-4 font-mono text-xs leading-relaxed text-emerald-100/90">
            {responseJson}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
