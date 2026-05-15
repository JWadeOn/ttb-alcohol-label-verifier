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
| [`fixture-correctness-expectations-real-photo-pack-v1.json`](./fixture-correctness-expectations-real-photo-pack-v1.json) | Expectations profile for curated on-bottle real-photo pack (`EVAL_FIXTURE_SET=real_photo_curated`). |
| [`REAL_PHOTO_PACK.md`](./REAL_PHOTO_PACK.md) | Rationale per fixture adversity type and run command. |
| [`PRIMARY_LATENCY_RUNS.md`](./PRIMARY_LATENCY_RUNS.md) | Chronological index of production latency snapshots. |

### Real-photo vs synthetic deltas (production snapshots)

| Artifact | Fixtures | `correctness.totals.overallScore` | `thresholdsPass` | Routing note |
|----------|----------|-----------------------------------|------------------|--------------|
| [`fixture-correctness-synthetic-eval-full-2026-05-15-production-v2.json`](./fixture-correctness-synthetic-eval-full-2026-05-15-production-v2.json) | 20 scripted `synthetic_eval_*` | 0.995 | true | Controlled left-to-right layouts; strong pass rates on applicable fields. |
| [`fixture-correctness-st-petersburg-production-2026-05-13.json`](./fixture-correctness-st-petersburg-production-2026-05-13.json) | 18 on-bottle St. Petersburg captures | 0.912 | false* | More `manual_review` / `fail` on angle, glare, blur, and crop stress; aligns with evaluator concern on real photos. |

\*`thresholdsPass` false on the St. Petersburg subset run because the expectations file still lists global `requiredFixtureIds` from the full manifest; per-fixture scores pass. Use [`fixture-correctness-expectations-real-photo-pack-v1.json`](./fixture-correctness-expectations-real-photo-pack-v1.json) for curated-pack thresholds.

## Regenerating artifacts (manual only)

- Full production fixture eval: `npm run eval:fixture-verify:prod`
- Generic fixture eval: `npm run eval:fixture-verify`
- `on_bottle` subset: `EVAL_FIXTURE_SET=on_bottle npm run eval:fixture-verify`
- `off_bottle` synthetic subset: `EVAL_FIXTURE_SET=off_bottle EVAL_EXPECTATIONS=docs/evals/fixture-correctness-expectations-synthetic-eval.json npm run eval:fixture-verify`
- Latency-only snapshot: `npm run eval:primary-latency`

Model-backed evals are intentionally run manually to avoid cost and drift from unattended scheduled jobs.
