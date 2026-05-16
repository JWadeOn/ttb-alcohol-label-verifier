# Evaluator Start Here

Use this short path to review the submission without internal planning noise.

## Architecture diagram

- In-depth evaluator diagram: `docs/ARCHITECTURE_DIAGRAM.md`
- The diagram includes API boundaries, pipeline internals, OCR/LLM fallback decision points, and output/evidence flow.

## 1) Run and try the app

- Public prototype URL: [https://ttb-alcohol-label-verifier-production.up.railway.app](https://ttb-alcohol-label-verifier-production.up.railway.app)
- Main flow: upload label image + application JSON, then review per-field `pass`/`fail`/`manual_review` outcomes.
- **Demo fixtures:** use **Load an existing eval fixture** (preset pass/stress cases with thumbnails) to load paired image + application JSON without uploading files.

## 2) Understand scope and boundaries

- `README.md` - project objective, scope, technical approach, and deployment.
- `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` - what counts as source of truth in this prototype and where checks are implemented.

## 3) Review architecture and implementation split

- `docs/ARCHITECTURE.md` - system flow and module map.
- `docs/modules/README.md` - module-level docs for route, handler, pipeline, extraction, and validator.

## 4) Review rubric alignment

- `docs/CORE_REQUIREMENTS_SCORECARD.md` - requirement-by-requirement status, evidence, and known gaps.

## 5) Review measured evidence

- `docs/evals/suite-plan.json` - tiered eval suite (L0/L1/L2/L3) and stakeholder coverage matrix.
- `docs/evals/README.md` - canonical eval artifact index.
- `docs/evals/fixture-correctness-production-2026-05-13.json` - full production fixture correctness + latency run.
- `docs/evals/fixture-correctness-st-petersburg-production-2026-05-13.json` - focused difficult-label subset run.
- `docs/evals/fixture-correctness-synthetic-eval-full-2026-05-15-production-v2.json` - latest full `synthetic_eval` Railway run (recommended).
- `docs/evals/fixture-correctness-synthetic-eval-full-2026-05-15.json` - local hybrid `synthetic_eval` run for comparison.
- `docs/evals/fixture-correctness-synthetic-eval-llm-only-2026-05-15.json` - local `llm_only` `synthetic_eval` run.
- `docs/evals/CORRECTNESS_THRESHOLDS.md` - thresholds used to interpret eval outputs.

## Notes

- `docs/internal/` contains planning/history artifacts intentionally excluded from evaluator-first review.
