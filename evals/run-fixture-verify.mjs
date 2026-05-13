/**
 * Fixture verify eval: POST /api/verify for selected manifest fixtures (by id).
 * Use for stress labels, regression checks, committed logs under docs/evals/,
 * and one-pass correctness + latency evidence (per-fixture timings plus suite summary).
 *
 * Requires OPENAI_API_KEY on the **client** (this script), like primary-latency.
 * Without OPENAI_API_KEY: prints skip JSON and exits 0 (CI-friendly).
 *
 * Usage:
 *   EVAL_FIXTURE_IDS=difficult-synthetic-label-photo OPENAI_API_KEY=sk-... BASE_URL=http://127.0.0.1:3000 node evals/run-fixture-verify.mjs
 *   EVAL_FIXTURE_SET=st_petersburg OPENAI_API_KEY=sk-... BASE_URL=http://127.0.0.1:3000 node evals/run-fixture-verify.mjs
 *   # same + write copy to disk:
 *   EVAL_OUT=docs/evals/fixture-verify-difficult-local.json ... node evals/run-fixture-verify.mjs
 *
 * EVAL_FIXTURE_IDS: comma-separated manifest `id` values (exact selection).
 * EVAL_FIXTURE_SET: comma-separated fixture presets (when EVAL_FIXTURE_IDS is unset):
 *   - st_petersburg    => ids starting with `st_petersburg_`
 *   - edge_synthetic   => ids starting with `edge-synthetic-`
 *   - seed_textures    => ids starting with `seed-texture-`
 *   - llm_smoke        => representative low-cost subset for quick iteration
 *   - all_manifest     => all manifest fixture ids
 * Default when both are unset: `all_manifest` (all fixtures in manifest).
 * EVAL_EXPECTATIONS: optional JSON path for fixture correctness scoring
 *   (default: docs/evals/fixture-correctness-expectations.json).
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

function parseCsv(raw) {
  return (raw ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * @param {string[]} manifestIds
 * @param {string | undefined} idsRaw
 * @param {string | undefined} setRaw
 */
function resolveFixtureIds(manifestIds, idsRaw, setRaw) {
  const explicitIds = parseCsv(idsRaw);
  if (explicitIds.length > 0) return { ids: explicitIds, unknownSets: [] };

  const requestedSets = parseCsv(setRaw).map((x) => x.toLowerCase());
  if (requestedSets.length === 0) return { ids: [...manifestIds], unknownSets: [] };

  const buckets = {
    st_petersburg: manifestIds.filter((id) => id.startsWith("st_petersburg_")),
    edge_synthetic: manifestIds.filter((id) => id.startsWith("edge-synthetic-")),
    seed_textures: manifestIds.filter((id) => id.startsWith("seed-texture-")),
    llm_smoke: [
      "happy-path-synthetic-label",
      "difficult-synthetic-label-photo",
      "edge-synthetic-glare-label",
      "edge-synthetic-blur-label",
      "seed-texture-01",
      "st_petersburg_whiskey_label_dark_baseline",
    ].filter((id) => manifestIds.includes(id)),
    all_manifest: manifestIds,
  };

  const unknownSets = requestedSets.filter((name) => !(name in buckets));
  /** @type {string[]} */
  const out = [];
  for (const name of requestedSets) {
    const ids = buckets[name] ?? [];
    for (const id of ids) {
      if (!out.includes(id)) out.push(id);
    }
  }
  return { ids: out, unknownSets };
}

/**
 * @param {unknown} body
 * @returns {Record<string, string> | null}
 */
function fieldStatusMap(body) {
  const rows = body?.validation?.fields;
  if (!Array.isArray(rows)) return null;
  /** @type {Record<string, string>} */
  const out = {};
  for (const row of rows) {
    if (typeof row?.fieldId === "string" && typeof row?.status === "string") {
      out[row.fieldId] = row.status;
    }
  }
  return out;
}

/**
 * @param {number[]} values
 * @param {number} p
 */
function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

/**
 * @param {number[]} values
 */
function summarizeDurations(values) {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
    meanMs: total / values.length,
    medianMs: percentile(values, 50),
    p95Ms: percentile(values, 95),
  };
}

/**
 * @param {Array<Record<string, unknown>>} results
 */
function latencySummary(results) {
  const requestDurations = results
    .map((row) => row.durationMs)
    .filter((value) => typeof value === "number");
  const extractionDurations = results
    .map((row) => row.extractionDurationMs)
    .filter((value) => typeof value === "number");

  return {
    request: summarizeDurations(requestDurations),
    extraction: summarizeDurations(extractionDurations),
  };
}

/**
 * @param {unknown} expectations
 * @returns {{
 *   thresholds: {
 *     minOverallScore?: number;
 *     minFixturePassRate?: number;
 *     requiredFixtureIds?: string[];
 *   };
 *   fixtures: Record<string, {
 *     expectedFieldStatuses?: Record<string, string[]>;
 *     allowedExtractionProviders?: string[];
 *     requireImageQualityOk?: boolean;
 *     minManualReviewCount?: number;
 *     maxDurationMs?: number;
 *     minScore?: number;
 *   }>;
 * } | null}
 */
function normalizeExpectations(expectations) {
  if (!expectations || typeof expectations !== "object") return null;
  const fixtures = expectations.fixtures;
  if (!fixtures || typeof fixtures !== "object") return null;
  return {
    thresholds:
      expectations.thresholds && typeof expectations.thresholds === "object"
        ? expectations.thresholds
        : {},
    fixtures,
  };
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {ReturnType<typeof normalizeExpectations>} expectations
 */
function scoreResults(results, expectations) {
  if (!expectations) return null;

  /** @type {Array<Record<string, unknown>>} */
  const fixtureScores = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let fixturesPassed = 0;

  for (const row of results) {
    const id = typeof row.id === "string" ? row.id : null;
    if (!id) continue;
    const rule = expectations.fixtures[id];
    if (!rule || typeof rule !== "object") {
      fixtureScores.push({
        id,
        scored: false,
        reason: "No expectation rule found for fixture.",
      });
      continue;
    }

    /** @type {Array<Record<string, unknown>>} */
    const checks = [];
    const pushCheck = (name, pass, expected, actual) =>
      checks.push({ name, pass, expected, actual });

    if (Array.isArray(rule.allowedExtractionProviders) && rule.allowedExtractionProviders.length > 0) {
      pushCheck(
        "allowedExtractionProvider",
        rule.allowedExtractionProviders.includes(row.extractionProvider),
        rule.allowedExtractionProviders,
        row.extractionProvider ?? null,
      );
    }

    if (rule.requireImageQualityOk === true) {
      pushCheck("imageQualityOk", row.imageQualityOk === true, true, row.imageQualityOk ?? null);
    }

    if (typeof rule.maxDurationMs === "number") {
      pushCheck(
        "durationMs",
        typeof row.durationMs === "number" && row.durationMs <= rule.maxDurationMs,
        { maxDurationMs: rule.maxDurationMs },
        row.durationMs ?? null,
      );
    }

    if (typeof rule.minManualReviewCount === "number") {
      const manualReviewCount = row.validationSummary?.manual_review ?? null;
      pushCheck(
        "manualReviewCount",
        typeof manualReviewCount === "number" && manualReviewCount >= rule.minManualReviewCount,
        { minManualReviewCount: rule.minManualReviewCount },
        manualReviewCount,
      );
    }

    if (rule.expectedFieldStatuses && typeof rule.expectedFieldStatuses === "object") {
      for (const [fieldId, allowed] of Object.entries(rule.expectedFieldStatuses)) {
        const actual = row.fieldStatuses?.[fieldId] ?? null;
        const allowList = Array.isArray(allowed) ? allowed : [];
        pushCheck(
          `fieldStatus:${fieldId}`,
          actual !== null && allowList.includes(actual),
          allowList,
          actual,
        );
      }
    }

    const fixtureTotal = checks.length;
    const fixturePassed = checks.filter((c) => c.pass === true).length;
    const score = fixtureTotal > 0 ? fixturePassed / fixtureTotal : null;
    const minScore = typeof rule.minScore === "number" ? rule.minScore : 1;
    const pass = score !== null && score >= minScore;
    if (pass) fixturesPassed += 1;
    totalChecks += fixtureTotal;
    passedChecks += fixturePassed;

    fixtureScores.push({
      id,
      scored: true,
      checks,
      score,
      minScore,
      pass,
    });
  }

  const scoredFixtures = fixtureScores.filter((x) => x.scored === true);
  const scoredCount = scoredFixtures.length;
  const overallScore = totalChecks > 0 ? passedChecks / totalChecks : null;
  const fixturePassRate = scoredCount > 0 ? fixturesPassed / scoredCount : null;
  const requiredFixtureIds = Array.isArray(expectations.thresholds.requiredFixtureIds)
    ? expectations.thresholds.requiredFixtureIds
    : [];
  const missingRequiredFixtureIds = requiredFixtureIds.filter(
    (id) => !results.some((row) => row.id === id),
  );

  const thresholdChecks = [];
  if (typeof expectations.thresholds.minOverallScore === "number" && overallScore !== null) {
    thresholdChecks.push({
      name: "minOverallScore",
      pass: overallScore >= expectations.thresholds.minOverallScore,
      expected: expectations.thresholds.minOverallScore,
      actual: overallScore,
    });
  }
  if (typeof expectations.thresholds.minFixturePassRate === "number" && fixturePassRate !== null) {
    thresholdChecks.push({
      name: "minFixturePassRate",
      pass: fixturePassRate >= expectations.thresholds.minFixturePassRate,
      expected: expectations.thresholds.minFixturePassRate,
      actual: fixturePassRate,
    });
  }
  if (requiredFixtureIds.length > 0) {
    thresholdChecks.push({
      name: "requiredFixtureIdsPresent",
      pass: missingRequiredFixtureIds.length === 0,
      expected: requiredFixtureIds,
      actual: requiredFixtureIds.filter((id) => !missingRequiredFixtureIds.includes(id)),
      missing: missingRequiredFixtureIds,
    });
  }

  return {
    fixtureScores,
    totals: {
      totalChecks,
      passedChecks,
      overallScore,
      scoredFixtures: scoredCount,
      fixturesPassed,
      fixturePassRate,
    },
    thresholdChecks,
    thresholdsPass: thresholdChecks.every((x) => x.pass === true),
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
  const outPathRaw = process.env.EVAL_OUT?.trim();
  const expectationsPathRaw =
    process.env.EVAL_EXPECTATIONS?.trim() || "docs/evals/fixture-correctness-expectations.json";

  const manifest = JSON.parse(await readFile(path.join(root, "fixtures", "manifest.json"), "utf8"));
  const application = await readFile(path.join(root, "fixtures", "default-application.json"), "utf8");
  const manifestIds = manifest.fixtures.map((f) => f.id);
  const { ids, unknownSets } = resolveFixtureIds(
    manifestIds,
    process.env.EVAL_FIXTURE_IDS,
    process.env.EVAL_FIXTURE_SET,
  );
  if (unknownSets.length > 0) {
    console.log(
      JSON.stringify(
        {
          error: "Unknown fixture set(s) in EVAL_FIXTURE_SET",
          unknownSets,
          knownSets: [
            "st_petersburg",
            "edge_synthetic",
            "seed_textures",
            "llm_smoke",
            "all_manifest",
          ],
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
