/**
 * Fixture verify eval: POST /api/verify for selected manifest fixtures (by id).
 * Use for stress labels, regression checks, and committed logs under docs/evals/.
 *
 * Requires OPENAI_API_KEY on the **client** (this script), like primary-latency.
 * Without OPENAI_API_KEY: prints skip JSON and exits 0 (CI-friendly).
 *
 * Usage:
 *   EVAL_FIXTURE_IDS=difficult-synthetic-label-photo OPENAI_API_KEY=sk-... BASE_URL=http://127.0.0.1:3000 node evals/run-fixture-verify.mjs
 *   # same + write copy to disk:
 *   EVAL_OUT=docs/evals/fixture-verify-difficult-local.json ... node evals/run-fixture-verify.mjs
 *
 * EVAL_FIXTURE_IDS: comma-separated manifest `id` values (required unless using default).
 * Default when unset: `difficult-synthetic-label-photo` (single stress fixture).
 *
 * EVAL_OUT: optional path (repo-relative or absolute); writes the same JSON object as stdout.
 * EVAL_EXIT_ON_HTTP_ERROR: if `0`/`false`/`no`, exit 0 even when any response has HTTP >= 400
 *   (still records status in JSON). Default: exit 1 on any HTTP >= 400 or transport error.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function truthyEnv(name) {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function falsyEnv(name) {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "0" || v === "false" || v === "no";
}

/** @param {unknown} body */
function summarizeValidation(body) {
  const rows = body?.validation?.fields;
  if (!Array.isArray(rows)) return null;
  const out = { pass: 0, fail: 0, manual_review: 0, not_applicable: 0 };
  for (const row of rows) {
    const s = row?.status;
    if (s && typeof s === "string" && s in out) out[s]++;
  }
  return out;
}

/**
 * @param {string} base
 * @param {string} fileName
 * @param {Buffer} bytes
 * @param {string} applicationJson
 */
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
    body = { raw: text.slice(0, 500) };
  }
  return {
    ok: true,
    httpStatus: res.status,
    durationMs,
    body,
  };
}

function parseFixtureIds(raw) {
  const s = raw?.trim();
  if (!s) return ["difficult-synthetic-label-photo"];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const skip = {
      skipped: true,
      reason: "OPENAI_API_KEY not set; no requests sent (eval scaffold).",
    };
    console.log(JSON.stringify(skip, null, 2));
    process.exit(0);
    return;
  }

  const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const exitOnHttpError = !falsyEnv("EVAL_EXIT_ON_HTTP_ERROR");
  const outPathRaw = process.env.EVAL_OUT?.trim();

  const manifest = JSON.parse(await readFile(path.join(root, "fixtures", "manifest.json"), "utf8"));
  const application = await readFile(path.join(root, "fixtures", "default-application.json"), "utf8");
  const ids = parseFixtureIds(process.env.EVAL_FIXTURE_IDS);

  const byId = new Map(manifest.fixtures.map((f) => [f.id, f]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    console.log(
      JSON.stringify({
        error: "Unknown fixture id(s) in EVAL_FIXTURE_IDS",
        missing,
        knownIds: manifest.fixtures.map((f) => f.id),
      }),
      null,
      2,
    );
    process.exit(1);
    return;
  }

  const results = [];
  for (const id of ids) {
    const f = byId.get(id);
    const imagePath = path.join(root, "fixtures", f.relativePath);
    const bytes = await readFile(imagePath);
    const fileName = path.basename(f.relativePath);
    const r = await postVerify(base, fileName, bytes, application);

    if (!r.ok) {
      results.push({
        id,
        relativePath: f.relativePath,
        ok: false,
        durationMs: r.durationMs,
        error: r.error,
        hint: r.hint,
      });
      continue;
    }

    const { httpStatus, durationMs, body } = r;
    const row = {
      id,
      relativePath: f.relativePath,
      httpStatus,
      durationMs,
      extractionProvider: body?.extraction?.provider ?? null,
      extractionDurationMs: body?.extraction?.durationMs ?? null,
      validationSummary: summarizeValidation(body),
      code: body?.code ?? null,
      message: typeof body?.message === "string" ? body.message : undefined,
    };

    if (httpStatus >= 200 && httpStatus < 300) {
      row.imageQualityOk = body?.imageQuality?.ok ?? null;
    }

    results.push(row);
  }

  const payload = {
    eval: "fixture-verify",
    generatedAt: new Date().toISOString(),
    base,
    fixtureIds: ids,
    results,
  };

  const text = JSON.stringify(payload, null, 2);
  console.log(text);

  if (outPathRaw) {
    const abs = path.isAbsolute(outPathRaw) ? outPathRaw : path.join(root, outPathRaw);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, text, "utf8");
    console.error(`[fixture-verify] wrote ${path.relative(root, abs)}`);
  }

  const transportFail = results.some((x) => x.ok === false);
  const httpFail = results.some((x) => typeof x.httpStatus === "number" && x.httpStatus >= 400);
  if (exitOnHttpError && (transportFail || httpFail)) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
