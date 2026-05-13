# Evaluation Artifacts

This folder contains committed evidence for correctness and latency in the prototype.

## Recommended evaluator files

| File | Purpose |
|---|---|
| [`fixture-correctness-production-2026-05-13.json`](./fixture-correctness-production-2026-05-13.json) | Full production fixture run with correctness scoring and latency summary. |
| [`fixture-correctness-st-petersburg-production-2026-05-13.json`](./fixture-correctness-st-petersburg-production-2026-05-13.json) | Focused difficult-label fixture run (St. Petersburg subset). |
| [`CORRECTNESS_THRESHOLDS.md`](./CORRECTNESS_THRESHOLDS.md) | Threshold definitions used to interpret eval outputs. |
| [`PRIMARY_LATENCY_RUNS.md`](./PRIMARY_LATENCY_RUNS.md) | Chronological index of production latency snapshots. |

## Regenerating artifacts (manual only)

- Full production fixture eval: `npm run eval:fixture-verify:prod`
- Generic fixture eval: `npm run eval:fixture-verify`
- Latency-only snapshot: `npm run eval:primary-latency`

Model-backed evals are intentionally run manually to avoid cost and drift from unattended scheduled jobs.
