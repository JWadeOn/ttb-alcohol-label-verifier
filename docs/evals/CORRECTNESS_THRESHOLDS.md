# Fixture Correctness Thresholds

This file defines the current correctness-evidence bar for synthetic-first eval runs (`eval:l0`, `eval:l1`, `eval:l2`). The same run also records latency (`durationMs`, `extractionDurationMs`, and a top-level latency summary), so a separate latency-only run is optional rather than required.

Canonical tier membership and stakeholder coverage classes: [`suite-plan.json`](./suite-plan.json).

## Inputs

| Tier | Expectations profile | Blocking on correctness failure |
|------|----------------------|----------------------------------|
| L0 | `docs/evals/fixture-correctness-expectations-l0.json` | No |
| L1 | `docs/evals/fixture-correctness-expectations-l1.json` | **Yes** (`EVAL_FAIL_ON_CORRECTNESS=true`) |
| L2 | `docs/evals/fixture-correctness-expectations-synthetic-eval.json` | No (diagnostics) |

- Default application: `fixtures/default-application.json`
- Per-fixture applications: `fixtures/applications/*` (including obvious-fail contradiction payloads)

## Stakeholder coverage classes (L1)

| Class | Purpose | Example fixture IDs |
|-------|---------|---------------------|
| Obvious pass | Clean label matches application | `synthetic_eval_*_baseline_front` |
| Obvious fail | Clear application contradiction | `synthetic_eval_vodka_import_obvious_fail_*` |
| Tricky pass | Image stress, still matchable | `*_glare_brand`, `*_angle_30` |
| Tricky fail / manual_review | Ambiguous or partial evidence | `*_crop_warning_partial` |
| Routing / fallback safety | Prefer manual_review over guessing | `*_crop_warning_partial` |

See also: [`docs/CORE_REQUIREMENTS_SCORECARD.md`](../CORE_REQUIREMENTS_SCORECARD.md), [`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md).

## Thresholds (per tier profile)

- `minOverallScore`: aggregate pass ratio across scored checks (typically `0.6` L0, `0.7` L1/L2).
- `minFixturePassRate`: share of fixtures meeting fixture-level `minScore`.
- `requiredFixtureIds`: must match that tier’s `fixtureIds` exactly (enforced by `npm run eval:validate-suite-plan`).

Per-fixture rules include provider allow-list, `imageQuality.ok`, `maxDurationMs`, `minScore`, and `expectedFieldStatuses` per field.

## Run commands

```bash
# Drift check (run before changing tiers or expectations)
npm run eval:validate-suite-plan

# Tier runs (require OPENAI_API_KEY and running app on BASE_URL)
npm run eval:l0
npm run eval:l1   # exits non-zero if correctness thresholds fail
npm run eval:l2
```

With environment loaded:

```bash
set -a && source .env && set +a && npm run eval:l1
```

## Strict gate policy

- **Mandatory:** CI / merge gate / explicit `npm run eval:l1`
- **Optional:** local iteration with `eval:l0` or `eval:l2` (HTTP errors still fail unless `EVAL_EXIT_ON_HTTP_ERROR=false`)

If `OPENAI_API_KEY` is not present, the eval script prints a skip payload and exits `0`.

## Regenerating tier expectations

After changing `suite-plan.json` L0/L1 fixture lists:

```bash
npm run eval:build-tier-expectations
npm run eval:validate-suite-plan
```
