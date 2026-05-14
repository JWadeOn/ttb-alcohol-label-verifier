# Evaluation Artifacts

This folder contains committed evidence for correctness and latency in the prototype.

## Recommended evaluator files

| File | Purpose |
|---|---|
| [`fixture-correctness-production-2026-05-13.json`](./fixture-correctness-production-2026-05-13.json) | Full `on_bottle` production fixture run with correctness scoring and latency summary. |
| [`fixture-correctness-st-petersburg-production-2026-05-13.json`](./fixture-correctness-st-petersburg-production-2026-05-13.json) | Focused difficult-label fixture run (St. Petersburg subset). |
| [`fixture-correctness-synthetic-eval-full-2026-05-14.json`](./fixture-correctness-synthetic-eval-full-2026-05-14.json) | Full `off_bottle` scripted synthetic run (4 families x 5 stress variants) with per-fixture correctness and latency. |
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
