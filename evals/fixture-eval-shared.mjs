/**
 * Shared helpers for fixture-based eval runners (single-label and batch).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

export const KNOWN_FIXTURE_SETS = [
  "st_petersburg",
  "edge_synthetic",
  "synthetic_eval",
  "on_bottle",
  "off_bottle",
  "seed_textures",
  "llm_smoke",
  "real_photo_curated",
  "name_address_candidates",
  "synthetic_app_mismatch",
  "on_bottle_subtle_fail",
  "all_manifest",
];

export function truthyEnv(name) {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function falsyEnv(name) {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "0" || v === "false" || v === "no";
}

/** @param {unknown} body */
export function summarizeValidation(body) {
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
 * @param {unknown} body
 * @returns {Record<string, string> | null}
 */
export function fieldStatusMap(body) {
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

export function parseCsv(raw) {
  return (raw ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {string} prefix e.g. "fixture-correctness" or "fixture-batch-correctness"
 * @param {string[]} ids
 * @param {string | undefined} idsRaw
 * @param {string | undefined} setRaw
 * @returns {string}
 */
export function resolveOutputPathRaw(prefix, ids, idsRaw, setRaw) {
  const explicit = process.env.EVAL_OUT?.trim();
  const date = todayIsoDate();
  if (explicit) return explicit.replaceAll("{date}", date);

  const requestedSets = parseCsv(setRaw).map((x) => slugify(x)).filter(Boolean);
  let scope = "all-manifest";
  if (requestedSets.length > 0) {
    scope = requestedSets.join("-");
  } else if (parseCsv(idsRaw).length > 0) {
    const first = ids[0] ? slugify(ids[0]) : "custom";
    scope = ids.length === 1 ? first : `custom-${ids.length}`;
  }
  return `docs/evals/${prefix}-${scope}-${date}.json`;
}

/**
 * @param {{id: string, relativePath: string}[]} manifestFixtures
 * @param {string | undefined} idsRaw
 * @param {string | undefined} setRaw
 */
export function resolveFixtureIds(manifestFixtures, idsRaw, setRaw) {
  const manifestIds = manifestFixtures.map((f) => f.id);
  const defaultIds = manifestIds.filter((id) => !id.startsWith("name_address_candidate_"));
  const explicitIds = parseCsv(idsRaw);
  if (explicitIds.length > 0) return { ids: explicitIds, unknownSets: [] };

  const requestedSets = parseCsv(setRaw).map((x) => x.toLowerCase());
  if (requestedSets.length === 0) return { ids: [...defaultIds], unknownSets: [] };

  const buckets = {
    st_petersburg: manifestIds.filter((id) => id.startsWith("st_petersburg_")),
    edge_synthetic: manifestIds.filter((id) => id.startsWith("edge-synthetic-")),
    synthetic_eval: manifestIds.filter((id) => id.startsWith("synthetic_eval_")),
    on_bottle: manifestFixtures
      .filter(
        (f) =>
          typeof f.relativePath === "string" &&
          (f.relativePath.startsWith("labels/curated/on-bottle/") ||
            f.relativePath.startsWith("labels/on-bottle/")),
      )
      .map((f) => f.id),
    off_bottle: manifestFixtures
      .filter(
        (f) =>
          typeof f.relativePath === "string" &&
          (f.relativePath.startsWith("labels/synthetic_eval_") || f.id.startsWith("synthetic_eval_")),
      )
      .map((f) => f.id),
    seed_textures: manifestIds.filter((id) => id.startsWith("seed-texture-")),
    llm_smoke: [
      "synthetic_eval_vodka_import_baseline_front",
      "synthetic_eval_whiskey_cream_baseline_front",
      "synthetic_eval_spiced_rum_baseline_front",
      "seed-texture-01",
      "happy-path-synthetic-label",
    ].filter((id) => manifestIds.includes(id)),
    real_photo_curated: [
      "happy-path-synthetic-label",
      "name_address_candidate_liquor_label_happy_path",
      "name_address_candidate_st_petersburg_vodka_glare_brand",
    ].filter((id) => manifestIds.includes(id)),
    name_address_candidates: manifestIds.filter((id) => id.startsWith("name_address_candidate_")),
    synthetic_app_mismatch: ["synthetic_eval_whiskey_cream_obvious_fail_brand"].filter((id) =>
      manifestIds.includes(id),
    ),
    on_bottle_subtle_fail: ["synthetic_eval_whiskey_cream_obvious_fail_brand"].filter((id) =>
      manifestIds.includes(id),
    ),
    all_manifest: defaultIds,
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
 * @param {number[]} values
 * @param {number} p
 */
export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

/**
 * @param {number[]} values
 */
export function summarizeDurations(values) {
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
export function latencySummary(results) {
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
 */
export function normalizeExpectations(expectations) {
  if (!expectations || typeof expectations !== "object") return null;
  const fixtures = expectations.fixtures;
  if (!fixtures || typeof fixtures !== "object") return null;
  return {
    thresholds:
      expectations.thresholds && typeof expectations.thresholds === "object"
        ? expectations.thresholds
        : {},
    fixtures,
    batch:
      expectations.batch && typeof expectations.batch === "object" ? expectations.batch : null,
  };
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {ReturnType<typeof normalizeExpectations>} expectations
 */
export function scoreResults(results, expectations) {
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

/** @param {string} relativePath */
export function mimeForFixturePath(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

/**
 * Load manifest fixture rows for eval (image bytes + application JSON string).
 * @param {string} root repo root
 * @param {Map<string, {id: string, relativePath: string, applicationPath?: string}>} byId
 * @param {string[]} ids
 * @param {string} defaultApplication
 */
export async function loadFixturePayloads(root, byId, ids, defaultApplication) {
  /** @type {Array<{id: string, relativePath: string, applicationPath: string | null, fileName: string, bytes: Buffer, applicationJson: string, applicationObject: object}>} */
  const payloads = [];
  for (const id of ids) {
    const f = byId.get(id);
    if (!f) continue;
    const imagePath = path.join(root, "fixtures", f.relativePath);
    const bytes = await readFile(imagePath);
    const ext = path.extname(f.relativePath) || ".png";
    const fileName = `${id}${ext}`;
    const applicationPath =
      typeof f.applicationPath === "string" && f.applicationPath.trim().length > 0
        ? path.join(root, "fixtures", f.applicationPath.trim())
        : null;
    const applicationJson = applicationPath
      ? await readFile(applicationPath, "utf8")
      : defaultApplication;
    payloads.push({
      id,
      relativePath: f.relativePath,
      applicationPath: applicationPath ? path.relative(root, applicationPath) : null,
      fileName,
      bytes,
      applicationJson,
      applicationObject: JSON.parse(applicationJson),
    });
  }
  return payloads;
}

/** Mirrors lib/batch-results.ts deriveBatchItemOutcome */
export function deriveBatchItemOutcome(item) {
  if (!item?.ok) return "error";
  const fields = item.result?.validation?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return "manual_review";
  if (fields.some((f) => f?.status === "fail")) return "fail";
  if (fields.some((f) => f?.status === "manual_review")) return "manual_review";
  return "pass";
}

/**
 * @param {unknown} body batch response
 * @param {string[]} fixtureIds
 * @param {ReturnType<typeof normalizeExpectations>} expectations
 */
export function scoreBatchTransport(body, fixtureIds, expectations) {
  const items = Array.isArray(body?.items) ? body.items : [];
  const summary = body?.summary && typeof body.summary === "object" ? body.summary : null;
  /** @type {Array<Record<string, unknown>>} */
  const checks = [];
  const pushCheck = (name, pass, expected, actual) => checks.push({ name, pass, expected, actual });

  pushCheck("itemCount", items.length === fixtureIds.length, fixtureIds.length, items.length);
  if (summary) {
    pushCheck("summaryTotal", summary.total === fixtureIds.length, fixtureIds.length, summary.total ?? null);
    pushCheck(
      "summarySuccess",
      summary.success === fixtureIds.length,
      fixtureIds.length,
      summary.success ?? null,
    );
  }

  const errorItems = items.filter((item) => !item?.ok);
  const maxErrorItems =
    typeof expectations?.batch?.maxErrorItems === "number"
      ? expectations.batch.maxErrorItems
      : 0;
  pushCheck("errorItemCount", errorItems.length <= maxErrorItems, { maxErrorItems }, errorItems.length);

  if (typeof expectations?.batch?.maxWallMs === "number" && typeof summary?.totalMs === "number") {
    pushCheck(
      "batchWallMs",
      summary.totalMs <= expectations.batch.maxWallMs,
      { maxWallMs: expectations.batch.maxWallMs },
      summary.totalMs,
    );
  }

  const outcomeCounts = { pass: 0, fail: 0, manual_review: 0, error: 0 };
  for (const item of items) {
    const outcome = deriveBatchItemOutcome(item);
    outcomeCounts[outcome] += 1;
  }

  return {
    checks,
    pass: checks.every((c) => c.pass === true),
    outcomeCounts,
    summary,
  };
}
