/**
 * Build docs/evals/fixture-correctness-expectations-l0.json and -l1.json
 * from suite-plan tier fixture lists + synthetic-eval base rules.
 *
 * Run: node scripts/build-tier-expectations.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const OBVIOUS_FAIL_RULES = {
  synthetic_eval_vodka_import_obvious_fail_brand: {
    expectedFieldStatuses: {
      brandName: ["fail"],
      classType: ["pass", "manual_review"],
      alcoholContent: ["pass", "manual_review"],
      netContents: ["pass", "manual_review"],
      governmentWarning: ["pass", "manual_review", "fail"],
      nameAddress: ["pass", "manual_review", "fail"],
      countryOfOrigin: ["pass", "manual_review", "fail"],
    },
    minScore: 0.5,
  },
  synthetic_eval_vodka_import_obvious_fail_alcohol: {
    expectedFieldStatuses: {
      brandName: ["pass", "manual_review"],
      classType: ["pass", "manual_review"],
      alcoholContent: ["fail"],
      netContents: ["pass", "manual_review"],
      governmentWarning: ["pass", "manual_review", "fail"],
      nameAddress: ["pass", "manual_review", "fail"],
      countryOfOrigin: ["pass", "manual_review", "fail"],
    },
    minScore: 0.5,
  },
  synthetic_eval_vodka_import_obvious_fail_net_contents: {
    expectedFieldStatuses: {
      brandName: ["pass", "manual_review"],
      classType: ["pass", "manual_review"],
      alcoholContent: ["pass", "manual_review"],
      netContents: ["fail"],
      governmentWarning: ["pass", "manual_review", "fail"],
      nameAddress: ["pass", "manual_review", "fail"],
      countryOfOrigin: ["pass", "manual_review", "fail"],
    },
    minScore: 0.5,
  },
  synthetic_eval_vodka_import_obvious_fail_country_of_origin: {
    expectedFieldStatuses: {
      brandName: ["pass", "manual_review"],
      classType: ["pass", "manual_review"],
      alcoholContent: ["pass", "manual_review"],
      netContents: ["pass", "manual_review"],
      governmentWarning: ["pass", "manual_review", "fail"],
      nameAddress: ["pass", "manual_review", "fail"],
      countryOfOrigin: ["fail"],
    },
    minScore: 0.5,
  },
};

const SYNTHETIC_APP_MISMATCH_RULES = {
  synthetic_eval_whiskey_cream_obvious_fail_brand: {
    expectedFieldStatuses: {
      brandName: ["fail"],
      classType: ["pass", "manual_review"],
      alcoholContent: ["pass", "manual_review"],
      netContents: ["pass", "manual_review"],
      governmentWarning: ["pass", "manual_review"],
      nameAddress: ["pass", "manual_review"],
      countryOfOrigin: ["not_applicable"],
    },
    minScore: 0.5,
  },
};

const MANDATORY_MISSING_RULES = {
  synthetic_eval_vodka_import_missing_name_address: {
    expectedFieldStatuses: {
      brandName: ["pass", "manual_review"],
      classType: ["pass", "manual_review"],
      alcoholContent: ["pass", "manual_review"],
      netContents: ["pass", "manual_review"],
      governmentWarning: ["pass", "manual_review", "fail"],
      nameAddress: ["fail"],
      countryOfOrigin: ["pass", "manual_review", "fail"],
    },
    minScore: 0.5,
  },
};

function baseRuleFrom(sourceRule) {
  if (!sourceRule) {
    return {
      allowedExtractionProviders: ["openai", "unavailable"],
      requireImageQualityOk: true,
      maxDurationMs: 20000,
      minScore: 0.6,
      expectedFieldStatuses: {},
    };
  }
  return JSON.parse(JSON.stringify(sourceRule));
}

function mergeRule(sourceRule, override) {
  const rule = baseRuleFrom(sourceRule);
  if (override.minScore !== undefined) rule.minScore = override.minScore;
  if (override.expectedFieldStatuses) {
    rule.expectedFieldStatuses = {
      ...rule.expectedFieldStatuses,
      ...override.expectedFieldStatuses,
    };
  }
  return rule;
}

async function buildTierExpectations(tierKey, profileName, outFile) {
  const plan = JSON.parse(
    await readFile(path.join(root, "docs/evals/suite-plan.json"), "utf8"),
  );
  const base = JSON.parse(
    await readFile(
      path.join(root, "docs/evals/fixture-correctness-expectations-synthetic-eval.json"),
      "utf8",
    ),
  );
  const ids = plan.tiers[tierKey].fixtureIds;
  const fixtures = {};
  for (const id of ids) {
    const override =
      OBVIOUS_FAIL_RULES[id] ??
      SYNTHETIC_APP_MISMATCH_RULES[id] ??
      MANDATORY_MISSING_RULES[id];
    if (override) {
      const source = base.fixtures.synthetic_eval_vodka_import_baseline_front;
      fixtures[id] = mergeRule(source, override);
      continue;
    }
    if (base.fixtures[id]) {
      fixtures[id] = baseRuleFrom(base.fixtures[id]);
    } else {
      fixtures[id] = baseRuleFrom(base.fixtures.synthetic_eval_vodka_import_baseline_front);
    }
  }

  const out = {
    version: 1,
    profile: profileName,
    thresholds: {
      minOverallScore: tierKey === "L0_sanity" ? 0.6 : 0.7,
      minFixturePassRate: tierKey === "L0_sanity" ? 0.5 : 0.5,
      requiredFixtureIds: [...ids],
    },
    fixtures,
  };

  const outPath = path.join(root, "docs/evals", outFile);
  await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log("wrote", path.relative(root, outPath), `(${ids.length} fixtures)`);
}

await buildTierExpectations("L0_sanity", "l0-sanity-v1", "fixture-correctness-expectations-l0.json");
await buildTierExpectations("L1_core_gate", "l1-core-gate-v1", "fixture-correctness-expectations-l1.json");
