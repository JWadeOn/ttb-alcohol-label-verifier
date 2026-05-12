# Eval artifacts

Committed outputs from **optional** eval scripts (see `README.md` → fixtures / eval scaffold).

**Triggering:** regenerating these artifacts (or running latency scripts against **Railway** with **`OPENAI_API_KEY`**) is **intentionally manual** — no scheduled or CI-automated production model runs. That avoids surprise cost and flaky comparisons when the model changes. **`npm run test`** remains the default always-on check.

**Timeline (production primary-latency):** **[`PRIMARY_LATENCY_RUNS.md`](./PRIMARY_LATENCY_RUNS.md)** — table of runs with links to each committed JSON (append a new dated file per run; do not overwrite history).

| File | What it is |
|------|----------------|
| [`PRIMARY_LATENCY_RUNS.md`](./PRIMARY_LATENCY_RUNS.md) | Chronological index of production **`eval:primary-latency`** snapshots + how to add the next run. |
| [`CORRECTNESS_THRESHOLDS.md`](./CORRECTNESS_THRESHOLDS.md) | Current sign-off thresholds and fixture set for correctness evidence. |
| [`fixture-correctness-expectations.json`](./fixture-correctness-expectations.json) | Machine-readable expectations profile used by `eval:fixture-verify` scoring output. |
| [`fixture-correctness-2026-05-12.json`](./fixture-correctness-2026-05-12.json) | First scored fixture-verify artifact (happy path + difficult fixture) with threshold checks and per-check scoring. |
| [`fixture-correctness-expanded-2026-05-12.json`](./fixture-correctness-expanded-2026-05-12.json) | Expanded scored matrix adding `seed-texture-01/02`; all configured threshold checks pass. |
| [`fixture-correctness-non-seed-edge-2026-05-12.json`](./fixture-correctness-non-seed-edge-2026-05-12.json) | Full seven-fixture scored matrix: seeds + happy/difficult + **glare / moderate blur / tilt** derivatives (`npm run fixtures:edge-labels`); `thresholdsPass: true` on 2026-05-12 Railway run. |
| [`primary-latency-production-2026-05-11.json`](./primary-latency-production-2026-05-11.json) | Railway snapshot — **2** seed fixtures; **`unavailable`** (tight default timeouts). |
| [`primary-latency-production-2026-05-12.json`](./primary-latency-production-2026-05-12.json) | Railway snapshot — **3** fixtures (happy path + seeds); **`openai`** on all. |
| *(ad hoc)* | **`npm run eval:primary-latency:bench`** — multi-iteration JSON with **min / max / mean / P95** per fixture and overall (`EVAL_ITERATIONS`, `EVAL_COOLDOWN_MS`, `EVAL_WARMUP` — see `README.md`). |
| *(ad hoc)* | **`npm run eval:fixture-verify`** — `POST /api/verify` for manifest fixture ids (`EVAL_FIXTURE_IDS`, comma-separated; default stress fixture). Optional **`EVAL_OUT`** writes JSON and optional **`EVAL_EXPECTATIONS`** controls scoring profile; see script header in **`evals/run-fixture-verify.mjs`**. |
