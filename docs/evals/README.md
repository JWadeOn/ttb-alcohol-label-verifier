# Evaluation Artifacts

This folder contains committed evidence for correctness and latency in the prototype.

## Canonical suite (start here)

| File | Purpose |
|------|---------|
| [`suite-plan.json`](./suite-plan.json) | **Source of truth** for L0/L1/L2/L3 tiers, coverage matrix, and gate policy |
| [`fixture-correctness-expectations-l0.json`](./fixture-correctness-expectations-l0.json) | L0 sanity expectations |
| [`fixture-correctness-expectations-l1.json`](./fixture-correctness-expectations-l1.json) | L1 core gate expectations (blocking) |
| [`fixture-correctness-expectations-synthetic-eval.json`](./fixture-correctness-expectations-synthetic-eval.json) | L2 full synthetic pack expectations |
| [`CORRECTNESS_THRESHOLDS.md`](./CORRECTNESS_THRESHOLDS.md) | How to interpret thresholds and run tiers |

Cross-links: [`docs/CORE_REQUIREMENTS_SCORECARD.md`](../CORE_REQUIREMENTS_SCORECARD.md), [`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md), [`docs/EVALUATOR_START_HERE.md`](../EVALUATOR_START_HERE.md).

## Coverage matrix (L1)

| Class | Count | Role |
|-------|-------|------|
| Obvious pass | 3 | Baseline readability + match |
| Obvious fail | 4 | Application contradiction on clean label |
| Tricky pass | 6 | Glare + angle stress |
| Tricky fail / manual_review | 3 | Partial warning crop |
| Routing / fallback | 3 | Same crop fixtures; manual_review over auto-guess |

Details and fixture IDs: [`suite-plan.json`](./suite-plan.json) → `coverageMatrix`.

## Historical artifacts (archived reference)

| File | Purpose |
|------|---------|
| [`fixture-correctness-production-2026-05-13.json`](./fixture-correctness-production-2026-05-13.json) | Historical full `on_bottle` production run |
| [`fixture-correctness-st-petersburg-production-2026-05-13.json`](./fixture-correctness-st-petersburg-production-2026-05-13.json) | Historical St. Petersburg subset |
| [`fixture-correctness-synthetic-eval-full-2026-05-15-production-v2.json`](./fixture-correctness-synthetic-eval-full-2026-05-15-production-v2.json) | Latest full `synthetic_eval` production snapshot |
| [`fixture-correctness-synthetic-eval-full-2026-05-15.json`](./fixture-correctness-synthetic-eval-full-2026-05-15.json) | Full `synthetic_eval` local hybrid run |
| [`fixture-correctness-expectations-real-photo-pack-v1.json`](./fixture-correctness-expectations-real-photo-pack-v1.json) | Legacy real-photo expectations (inactive) |
| [`REAL_PHOTO_PACK.md`](./REAL_PHOTO_PACK.md) | Archived real-photo pack rationale |

## Regenerating artifacts (manual only)

```bash
npm run eval:validate-suite-plan   # drift check (no API)
npm run eval:l0                    # 3 fixtures, non-blocking correctness
npm run eval:l1                    # 16 fixtures, blocking correctness
npm run eval:l2                    # full synthetic_eval, non-blocking
npm run eval:on-bottle:candidates  # L3 manual lane
npm run eval:fixture-verify:prod   # production BASE_URL
npm run eval:primary-latency       # latency-only
```

Model-backed evals are intentionally run manually to avoid cost and drift from unattended scheduled jobs.

## Pre-PR checklist

1. `npm run eval:validate-suite-plan`
2. `npm run eval:l1` (with app running and `OPENAI_API_KEY` set)
3. Confirm `correctness.thresholdsPass` is true in output (or process exits 0 only when thresholds pass)
