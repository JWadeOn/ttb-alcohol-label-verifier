/**
 * Fixture verify eval: POST /api/verify for selected manifest fixtures (by id).
 * See evals/fixture-eval-shared.mjs for fixture sets and scoring helpers.
 *
 * Batch equivalent: evals/run-batch-fixture-verify.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNOWN_FIXTURE_SETS,
  falsyEnv,
  fieldStatusMap,
  latencySummary,
  normalizeExpectations,
  resolveFixtureIds,
  resolveOutputPathRaw,
  scoreResults,
  summarizeValidation,
  truthyEnv,
} from "./fixture-eval-shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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
  const failOnCorrectness = truthyEnv("EVAL_FAIL_ON_CORRECTNESS");
  const expectationsPathRaw =
    process.env.EVAL_EXPECTATIONS?.trim() || "docs/evals/fixture-correctness-expectations-synthetic-eval.json";

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
    "fixture-correctness",
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

  const results = [];
  for (const id of ids) {
    const f = byId.get(id);
    const imagePath = path.join(root, "fixtures", f.relativePath);
    const bytes = await readFile(imagePath);
    const fileName = path.basename(f.relativePath);
    const applicationPath =
      typeof f.applicationPath === "string" && f.applicationPath.trim().length > 0
        ? path.join(root, "fixtures", f.applicationPath.trim())
        : null;
    const application = applicationPath ? await readFile(applicationPath, "utf8") : defaultApplication;
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
      applicationPath: applicationPath ? path.relative(root, applicationPath) : "fixtures/default-application.json",
      httpStatus,
      durationMs,
      extractionProvider: body?.extraction?.provider ?? null,
      extractionDurationMs: body?.extraction?.durationMs ?? null,
      validationSummary: summarizeValidation(body),
      fieldStatuses: fieldStatusMap(body),
      code: body?.code ?? null,
      message: typeof body?.message === "string" ? body.message : undefined,
    };

    if (httpStatus >= 200 && httpStatus < 300) {
      row.imageQualityOk = body?.imageQuality?.ok ?? null;
    }

    results.push(row);
  }

  const correctness = scoreResults(results, expectations);
  const payload = {
    eval: "fixture-verify",
    generatedAt: new Date().toISOString(),
    base,
    fixtureIds: ids,
    expectationsPath:
      expectations !== null ? path.relative(root, expectationsPath) : null,
    results,
    latency: latencySummary(results),
    correctness,
  };

  const text = JSON.stringify(payload, null, 2);
  console.log(text);

  const abs = path.isAbsolute(outPathRaw) ? outPathRaw : path.join(root, outPathRaw);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, text, "utf8");
  console.error(`[fixture-verify] wrote ${path.relative(root, abs)}`);

  const transportFail = results.some((x) => x.ok === false);
  const httpFail = results.some((x) => typeof x.httpStatus === "number" && x.httpStatus >= 400);
  if (exitOnHttpError && (transportFail || httpFail)) {
    process.exit(1);
  }
  if (failOnCorrectness) {
    if (!expectations) {
      console.error(
        "[fixture-verify] EVAL_FAIL_ON_CORRECTNESS is set but expectations file could not be loaded.",
      );
      process.exit(1);
    }
    if (correctness?.thresholdsPass !== true) {
      console.error("[fixture-verify] correctness thresholds failed (EVAL_FAIL_ON_CORRECTNESS).");
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
