/**
 * Run fixture-verify for a tier defined in docs/evals/suite-plan.json.
 *
 * Usage:
 *   node evals/run-suite-tier.mjs L0_sanity
 *   node evals/run-suite-tier.mjs L1_core_gate
 *   node evals/run-suite-tier.mjs L2_extended_diagnostics
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const tierKey = process.argv[2]?.trim();
if (!tierKey) {
  console.error("Usage: node evals/run-suite-tier.mjs <tierKey>");
  console.error("Example: node evals/run-suite-tier.mjs L1_core_gate");
  process.exit(1);
}

const plan = JSON.parse(await readFile(path.join(root, "docs/evals/suite-plan.json"), "utf8"));
const tier = plan.tiers?.[tierKey];
if (!tier) {
  console.error(`Unknown tier key: ${tierKey}`);
  console.error("Known tiers:", Object.keys(plan.tiers ?? {}).join(", "));
  process.exit(1);
}

/** @type {NodeJS.ProcessEnv} */
const env = { ...process.env };

if (tier.expectationsProfile) {
  env.EVAL_EXPECTATIONS = tier.expectationsProfile;
}

if (tier.failOnCorrectness === true) {
  env.EVAL_FAIL_ON_CORRECTNESS = "true";
} else if (!env.EVAL_FAIL_ON_CORRECTNESS) {
  env.EVAL_FAIL_ON_CORRECTNESS = "false";
}

if (Array.isArray(tier.fixtureIds) && tier.fixtureIds.length > 0) {
  env.EVAL_FIXTURE_IDS = tier.fixtureIds.join(",");
  delete env.EVAL_FIXTURE_SET;
} else if (Array.isArray(tier.fixtureSets) && tier.fixtureSets.length > 0) {
  env.EVAL_FIXTURE_SET = tier.fixtureSets.join(",");
  delete env.EVAL_FIXTURE_IDS;
} else {
  console.error(`Tier ${tierKey} has no fixtureIds or fixtureSets configured.`);
  process.exit(1);
}

const runner = tier.runner === "batch-fixture-verify" ? "run-batch-fixture-verify.mjs" : "run-fixture-verify.mjs";

console.error(
  `[run-suite-tier] tier=${tierKey} runner=${runner} expectations=${env.EVAL_EXPECTATIONS ?? "(default)"} failOnCorrectness=${env.EVAL_FAIL_ON_CORRECTNESS}`,
);

const child = spawn("node", [path.join(__dirname, runner)], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
