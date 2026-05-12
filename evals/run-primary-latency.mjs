/**
 * Primary-path latency: POST /api/verify for each manifest fixture with
 * `includeInPrimaryLatencyEval === true` (default: happy-path label + two seed textures).
 *
 * Requires a running server and OPENAI_API_KEY on the **client** (this script).
 * Without OPENAI_API_KEY: prints skip and exits 0 (CI-friendly scaffold).
 *
 * Committed production snapshots: save stdout to a **new dated** file under
 * `docs/evals/` and append a row to `docs/evals/PRIMARY_LATENCY_RUNS.md` (see that doc).
 *
 * Usage (single pass — default):
 *   OPENAI_API_KEY=sk-... BASE_URL=http://127.0.0.1:3000 node evals/run-primary-latency.mjs
 *
 * Benchmark mode (per-fixture stats):
 *   EVAL_ITERATIONS=5 EVAL_COOLDOWN_MS=300 OPENAI_API_KEY=... BASE_URL=... node evals/run-primary-latency.mjs
 *
 * Optional:
 *   EVAL_WARMUP=1 — one throwaway POST per fixture before measured iterations (not in stats).
 *
 * Output: JSON to stdout. Exit 1 if any HTTP status >= 400 or network error.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parsePositiveInt(raw, fallback) {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 500);
}

function truthyEnv(name) {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Nearest-rank P95 on sorted ascending milliseconds. */
function p95Ms(sortedAsc) {
  if (sortedAsc.length === 0) return null;
  const rank = Math.ceil(0.95 * sortedAsc.length);
  return sortedAsc[Math.min(sortedAsc.length, rank) - 1];
}

function summarizeDurations(msList) {
  const sorted = [...msList].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    n,
    minMs: sorted[0],
    maxMs: sorted[n - 1],
    meanMs: Math.round((sum / n) * 100) / 100,
    p95Ms: p95Ms(sorted),
  };
}

async function postVerify(base, fileName, bytes, applicationJson) {
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/png" }), fileName);
  form.append("application", applicationJson);

  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${base}/api/verify`, { method: "POST", body: form });
  } catch (e) {
    return {
      ok: false,
      durationMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
      hint: "Is the app running on BASE_URL?",
    };
  }
  const durationMs = Date.now() - t0;
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return {
    ok: true,
    httpStatus: res.status,
    durationMs,
    extractionProvider: body?.extraction?.provider ?? null,
    code: body?.code ?? null,
  };
}

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.log(
      JSON.stringify({
        skipped: true,
        reason: "OPENAI_API_KEY not set; no requests sent (eval scaffold).",
      }),
    );
    process.exit(0);
  }

  const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const iterations = parsePositiveInt(process.env.EVAL_ITERATIONS, 1);
  const cooldownMs = Math.max(0, Number.parseInt(process.env.EVAL_COOLDOWN_MS ?? "0", 10) || 0);
  const warmup = truthyEnv("EVAL_WARMUP");
  const benchmarkMode = iterations > 1 || warmup;

  const manifest = JSON.parse(
    await readFile(path.join(root, "fixtures", "manifest.json"), "utf8"),
  );
  const application = await readFile(
    path.join(root, "fixtures", "default-application.json"),
    "utf8",
  );

  const targets = manifest.fixtures.filter((f) => f.includeInPrimaryLatencyEval === true);
  if (targets.length === 0) {
    console.log(JSON.stringify({ error: "No fixtures flagged includeInPrimaryLatencyEval in manifest." }));
    process.exit(1);
  }

  if (!benchmarkMode) {
    const results = [];
    for (const f of targets) {
      const imagePath = path.join(root, "fixtures", f.relativePath);
      const bytes = await readFile(imagePath);
      const fileName = path.basename(f.relativePath);
      const r = await postVerify(base, fileName, bytes, application);
      if (!r.ok) {
        results.push({ id: f.id, ...r });
        continue;
      }
      results.push({
        id: f.id,
        httpStatus: r.httpStatus,
        durationMs: r.durationMs,
        extractionProvider: r.extractionProvider,
        code: r.code,
      });
    }
    console.log(JSON.stringify({ base, results }, null, 2));
    const failed = results.some(
      (row) => row.ok === false || (typeof row.httpStatus === "number" && row.httpStatus >= 400),
    );
    process.exit(failed ? 1 : 0);
    return;
  }

  const fixturesOut = [];
  const allDurationsOk = [];

  for (const f of targets) {
    const imagePath = path.join(root, "fixtures", f.relativePath);
    const bytes = await readFile(imagePath);
    const fileName = path.basename(f.relativePath);
    const runs = [];

    if (warmup) {
      await postVerify(base, fileName, bytes, application);
      if (cooldownMs > 0) await sleep(cooldownMs);
    }

    for (let i = 0; i < iterations; i++) {
      const r = await postVerify(base, fileName, bytes, application);
      runs.push({
        iteration: i + 1,
        durationMs: r.durationMs,
        httpStatus: r.httpStatus ?? null,
        extractionProvider: r.extractionProvider ?? null,
        code: r.code ?? null,
        ok: r.ok,
        error: r.error ?? null,
      });
      if (cooldownMs > 0 && i < iterations - 1) await sleep(cooldownMs);
    }

    const okRuns = runs.filter((x) => x.ok !== false && typeof x.httpStatus === "number" && x.httpStatus < 400);
    const durations = okRuns.map((x) => x.durationMs);
    for (const d of durations) allDurationsOk.push(d);

    fixturesOut.push({
      id: f.id,
      relativePath: f.relativePath,
      summary: durations.length > 0 ? summarizeDurations(durations) : null,
      runs,
    });
  }

  const overall =
    allDurationsOk.length > 0
      ? {
          ...summarizeDurations(allDurationsOk),
          totalRequests: allDurationsOk.length,
        }
      : null;

  const out = {
    base,
    benchmark: {
      iterationsPerFixture: iterations,
      cooldownMs,
      warmupPerFixture: warmup,
    },
    fixtures: fixturesOut,
    overall,
  };
  console.log(JSON.stringify(out, null, 2));

  const failed = fixturesOut.some((fx) =>
    fx.runs.some((r) => r.ok === false || (typeof r.httpStatus === "number" && r.httpStatus >= 400)),
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
