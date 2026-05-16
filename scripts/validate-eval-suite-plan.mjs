/**
 * Validate docs/evals/suite-plan.json against manifest and tier expectations files.
 *
 * Run: npm run eval:validate-suite-plan
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** @type {string[]} */
const errors = [];

function err(msg) {
  errors.push(msg);
}

/**
 * @param {string} filePath
 */
async function loadJson(filePath) {
  const raw = await readFile(path.join(root, filePath), "utf8");
  return JSON.parse(raw);
}

const plan = await loadJson("docs/evals/suite-plan.json");
const manifest = await loadJson("fixtures/manifest.json");
const manifestIds = new Set(manifest.fixtures.map((f) => f.id));

function assertManifestIds(ids, label) {
  for (const id of ids) {
    if (!manifestIds.has(id)) {
      err(`${label}: fixture id not in manifest: ${id}`);
    }
  }
}

function assertExpectationsSync(tierKey, expectationsPath) {
  const tier = plan.tiers[tierKey];
  const expectations = /** @type {any} */ (loadJson(expectationsPath));
  return expectations.then((exp) => {
    const tierIds = tier.fixtureIds ?? [];
    const required = exp.thresholds?.requiredFixtureIds ?? [];
    const tierSet = new Set(tierIds);
    const requiredSet = new Set(required);

    for (const id of tierIds) {
      if (!requiredSet.has(id)) {
        err(`${tierKey}: missing requiredFixtureIds entry for ${id} in ${expectationsPath}`);
      }
      if (!exp.fixtures?.[id]) {
        err(`${tierKey}: missing fixtures rule for ${id} in ${expectationsPath}`);
      }
    }
    for (const id of required) {
      if (!tierSet.has(id)) {
        err(`${tierKey}: requiredFixtureIds includes ${id} but not in tier fixtureIds`);
      }
    }
  });
}

// L0 / L1 manifest + expectations sync
assertManifestIds(plan.tiers.L0_sanity.fixtureIds, "L0");
assertManifestIds(plan.tiers.L1_core_gate.fixtureIds, "L1");

const l1Count = plan.tiers.L1_core_gate.fixtureIds.length;
const maxCore = plan.policy?.maxCoreFixtures;
if (typeof maxCore === "number" && l1Count > maxCore) {
  err(`L1 has ${l1Count} fixtures but policy.maxCoreFixtures is ${maxCore}`);
}

await assertExpectationsSync("L0_sanity", plan.tiers.L0_sanity.expectationsProfile);
await assertExpectationsSync("L1_core_gate", plan.tiers.L1_core_gate.expectationsProfile);

// Coverage matrix ids exist in manifest
const matrix = plan.coverageMatrix ?? {};
for (const [cls, ids] of Object.entries(matrix)) {
  if (cls === "description" || !Array.isArray(ids)) continue;
  assertManifestIds(ids, `coverageMatrix.${cls}`);
}

// All coverage matrix ids should be represented in L1 (union check)
const matrixIds = new Set();
for (const [cls, ids] of Object.entries(matrix)) {
  if (!Array.isArray(ids)) continue;
  for (const id of ids) ids.forEach((x) => matrixIds.add(x));
}
const l1Set = new Set(plan.tiers.L1_core_gate.fixtureIds);
for (const id of matrixIds) {
  if (!l1Set.has(id)) {
    err(`coverage matrix id ${id} is not in L1_core_gate.fixtureIds`);
  }
}

// L2 expectations profile exists
try {
  await readFile(path.join(root, plan.tiers.L2_extended_diagnostics.expectationsProfile), "utf8");
} catch {
  err(`L2 expectations profile missing: ${plan.tiers.L2_extended_diagnostics.expectationsProfile}`);
}

if (errors.length > 0) {
  console.error("eval suite plan validation failed:\n");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log("eval suite plan validation passed.");
console.log(`L0=${plan.tiers.L0_sanity.fixtureIds.length} L1=${l1Count} L2=synthetic_eval (full pack)`);
