/**
 * Batch fixture verify eval: POST /api/verify/batch for manifest fixtures in one request.
 * Reuses fixtures/manifest.json, per-fixture application JSON, and the same correctness
 * expectations profiles as evals/run-fixture-verify.mjs.
 *
 * Requires OPENAI_API_KEY and a running app on BASE_URL (or playwright webServer).
 *
 * Usage:
 *   EVAL_FIXTURE_SET=llm_smoke OPENAI_API_KEY=sk-... BASE_URL=http://127.0.0.1:3000 node evals/run-batch-fixture-verify.mjs
 *   EVAL_FIXTURE_IDS=synthetic_eval_vodka_import_baseline_front,synthetic_eval_whiskey_cream_baseline_front ...
 *
 * EVAL_EXPECTATIONS: same JSON paths as single-label eval (optional batch.* thresholds).
 * EVAL_OUT: optional; default docs/evals/fixture-batch-correctness-<scope>-YYYY-MM-DD.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNOWN_FIXTURE_SETS,
  deriveBatchItemOutcome,
  falsyEnv,
  fieldStatusMap,
  latencySummary,
  loadFixturePayloads,
  mimeForFixturePath,
  normalizeExpectations,
  resolveFixtureIds,
  resolveOutputPathRaw,
  scoreBatchTransport,
  scoreResults,
  summarizeValidation,
  truthyEnv,
} from "./fixture-eval-shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/**
 * @param {string} base
 * @param {Awaited<ReturnType<typeof loadFixturePayloads>>} payloads
 */
async function postBatchVerify(base, payloads) {
  const form = new FormData();
  for (const row of payloads) {
    form.append(
      "images",
      new Blob([row.bytes], { type: mimeForFixturePath(row.relativePath) }),
      row.fileName,
    );
  }
  form.append(
    "applications",
    JSON.stringify(payloads.map((row) => row.applicationObject)),
  );

  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${base}/api/verify/batch`, { method: "POST", body: form });
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

/**
 * @param {string} id
 * @param {Awaited<ReturnType<typeof loadFixturePayloads>>[number]} payload
 * @param {unknown} item
 */
function rowFromBatchItem(id, payload, item) {
  const httpStatus = typeof item?.status === "number" ? item.status : null;
  const body = item?.ok ? item.result : null;
  return {
    id,
    relativePath: payload.relativePath,
    applicationPath: payload.applicationPath ?? "fixtures/default-application.json",
    batchIndex: item?.index ?? null,
    batchFileName: item?.fileName ?? payload.fileName,
    batchOutcome: deriveBatchItemOutcome(item),
    httpStatus,
    durationMs: item?.durationMs ?? null,
    extractionProvider: body?.extraction?.provider ?? null,
    extractionDurationMs: body?.extraction?.durationMs ?? null,
    validationSummary: summarizeValidation(body),
    fieldStatuses: fieldStatusMap(body),
    code: item?.error?.code ?? body?.code ?? null,
    message: item?.error?.message ?? (typeof body?.message === "string" ? body.message : undefined),
    imageQualityOk: body?.imageQuality?.ok ?? null,
  };
}

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const skip = {
      skipped: true,
      reason: "OPENAI_API_KEY not set; no batch requests sent (eval scaffold).",
    };
    console.log(JSON.stringify(skip, null, 2));
    process.exit(0);
    return;
  }

  const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const exitOnHttpError = !falsyEnv("EVAL_EXIT_ON_HTTP_ERROR");
  const failOnCorrectness = truthyEnv("EVAL_FAIL_ON_CORRECTNESS");
  const expectationsPathRaw =
    process.env.EVAL_EXPECTATIONS?.trim() || "docs/evals/fixture-correctness-expectations-l0.json";

  const manifest = JSON.parse(await readFile(path.join(root, "fixtures", "manifest.json"), "utf8"));
  const defaultApplication = await readFile(
    path.join(root, "fixtures", "default-application.json"),
    "utf8",
  );
  const manifestIds = manifest.fixtures.map((f) => f.id);
  const { ids, unknownSets } = resolveFixtureIds(
    manifest.fixtures,
    process.env.EVAL_FIXTURE_IDS,
    process.env.EVAL_FIXTURE_SET,
  );
  const outPathRaw = resolveOutputPathRaw(
    "fixture-batch-correctness",
    ids,
    process.env.EVAL_FIXTURE_IDS,
    process.env.EVAL_FIXTURE_SET,
  );

  if (unknownSets.length > 0) {
    console.log(
      JSON.stringify(
        {
          error: "Unknown fixture set(s) in EVAL_FIXTURE_SET",
          unknownSets,
          knownSets: KNOWN_FIXTURE_SETS,
        },
        null,
        2,
      ),
    );
    process.exit(1);
    return;
  }

  const expectationsPath = path.isAbsolute(expectationsPathRaw)
    ? expectationsPathRaw
    : path.join(root, expectationsPathRaw);
  let expectations = null;
  try {
    const raw = await readFile(expectationsPath, "utf8");
    expectations = normalizeExpectations(JSON.parse(raw));
  } catch {
    expectations = null;
  }

  const byId = new Map(manifest.fixtures.map((f) => [f.id, f]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    console.log(
      JSON.stringify({
        error: "Unknown fixture id(s) in EVAL_FIXTURE_IDS",
        missing,
        knownIds: manifestIds,
      }),
      null,
      2,
    );
    process.exit(1);
    return;
  }

  if (ids.length === 0) {
    console.log(JSON.stringify({ error: "No fixtures selected for batch eval." }, null, 2));
    process.exit(1);
    return;
  }

  const payloads = await loadFixturePayloads(root, byId, ids, defaultApplication);
  const batchCall = await postBatchVerify(base, payloads);

  /** @type {Array<Record<string, unknown>>} */
  let results = [];
  let batchTransport = null;
  let batchHttpStatus = null;
  let batchWallMs = batchCall.durationMs;

  if (!batchCall.ok) {
    results = ids.map((id, index) => ({
      id,
      relativePath: payloads[index]?.relativePath ?? null,
      ok: false,
      error: batchCall.error,
      hint: batchCall.hint,
    }));
  } else {
    batchHttpStatus = batchCall.httpStatus;
    const body = batchCall.body;
    if (batchCall.httpStatus >= 200 && batchCall.httpStatus < 300 && Array.isArray(body?.items)) {
      const itemsByIndex = new Map(body.items.map((item) => [item.index, item]));
      results = ids.map((id, index) =>
        rowFromBatchItem(
          id,
          payloads[index],
          itemsByIndex.get(index) ?? {
            index,
            fileName: payloads[index].fileName,
            ok: false,
            status: 500,
            durationMs: 0,
            error: { code: "BATCH_ITEM_MISSING", message: "No batch item returned for this index." },
          },
        ),
      );
      batchTransport = scoreBatchTransport(body, ids, expectations);
    } else {
      results = ids.map((id, index) => ({
        id,
        relativePath: payloads[index]?.relativePath ?? null,
        httpStatus: batchCall.httpStatus,
        code: body?.code ?? null,
        message: typeof body?.message === "string" ? body.message : undefined,
      }));
    }
  }

  const correctness = scoreResults(results, expectations);
  const thresholdsPass =
    correctness?.thresholdsPass === true && (batchTransport === null || batchTransport.pass === true);

  const payload = {
    eval: "batch-fixture-verify",
    generatedAt: new Date().toISOString(),
    base,
    fixtureIds: ids,
    expectationsPath:
      expectations !== null ? path.relative(root, expectationsPath) : null,
    batch: {
      httpStatus: batchHttpStatus,
      wallMs: batchWallMs,
      transport: batchTransport,
      summary: batchTransport?.summary ?? null,
    },
    results,
    latency: latencySummary(results),
    correctness: correctness
      ? { ...correctness, thresholdsPass }
      : batchTransport
        ? {
            thresholdsPass,
            batchTransport,
          }
        : null,
  };

  const text = JSON.stringify(payload, null, 2);
  console.log(text);

  const abs = path.isAbsolute(outPathRaw) ? outPathRaw : path.join(root, outPathRaw);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, text, "utf8");
  console.error(`[batch-fixture-verify] wrote ${path.relative(root, abs)}`);

  const transportFail = !batchCall.ok;
  const httpFail = typeof batchHttpStatus === "number" && batchHttpStatus >= 400;
  if (exitOnHttpError && (transportFail || httpFail)) {
    process.exit(1);
  }
  if (failOnCorrectness) {
    if (!expectations) {
      console.error(
        "[batch-fixture-verify] EVAL_FAIL_ON_CORRECTNESS is set but expectations file could not be loaded.",
      );
      process.exit(1);
    }
    if (thresholdsPass !== true) {
      console.error("[batch-fixture-verify] correctness thresholds failed (EVAL_FAIL_ON_CORRECTNESS).");
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
