# Evaluation Artifacts

This folder contains committed evidence for correctness and latency in the prototype.

## Recommended evaluator files

| File | Purpose |
|---|---|
| [`fixture-correctness-production-2026-05-13.json`](./fixture-correctness-production-2026-05-13.json) | Full `on_bottle` production fixture run with correctness scoring and latency summary. |
| [`fixture-correctness-st-petersburg-production-2026-05-13.json`](./fixture-correctness-st-petersburg-production-2026-05-13.json) | Focused difficult-label fixture run (St. Petersburg subset). |
| [`fixture-correctness-synthetic-eval-full-2026-05-15-production-v2.json`](./fixture-correctness-synthetic-eval-full-2026-05-15-production-v2.json) | **Latest** full `synthetic_eval` run on Railway (post timeout-cap deploy): 20/20 HTTP 200, thresholds pass. |
| [`fixture-correctness-synthetic-eval-full-2026-05-15.json`](./fixture-correctness-synthetic-eval-full-2026-05-15.json) | Full `synthetic_eval` local hybrid run (`BASE_URL` localhost). |
| [`fixture-correctness-synthetic-eval-llm-only-2026-05-15.json`](./fixture-correctness-synthetic-eval-llm-only-2026-05-15.json) | Full `synthetic_eval` local run with `VERIFY_EXTRACTION_MODE=llm_only` for latency/correctness comparison. |
| [`fixture-correctness-synthetic-eval-full-2026-05-14.json`](./fixture-correctness-synthetic-eval-full-2026-05-14.json) | Earlier full `synthetic_eval` production run (pre–PR #2 hybrid tuning; OpenAI-only providers). |
| [`fixture-correctness-expectations-synthetic-eval.json`](./fixture-correctness-expectations-synthetic-eval.json) | Dedicated expectations profile for the synthetic batch so top-level thresholds reflect that subset only. |
| [`CORRECTNESS_THRESHOLDS.md`](./CORRECTNESS_THRESHOLDS.md) | Threshold definitions used to interpret eval outputs. |
| [`PRIMARY_LATENCY_RUNS.md`](./PRIMARY_LATENCY_RUNS.md) | Chronological index of production latency snapshots. |

## Regenerating artifacts (manual only)

- Full production fixture eval: `npm run eval:fixture-verify:prod`
- Generic fixture eval: `npm run eval:fixture-verify`
- `on_bottle` subset: `EVAL_FIXTURE_SET=on_bottle npm run eval:fixture-verify`
- `off_bottle` synthetic subset: `EVAL_FIXTURE_SET=off_bottle EVAL_EXPECTATIONS=docs/evals/fixture-correctness-expectations-synthetic-eval.json npm run eval:fixture-verify`
- Latency-only snapshot: `npm run eval:primary-latency`

Model-backed evals are intentionally run manually to avoid cost and drift from unattended scheduled jobs.
