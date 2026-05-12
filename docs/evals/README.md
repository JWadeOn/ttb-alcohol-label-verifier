# Eval artifacts

Committed outputs from **optional** eval scripts (see `README.md` → fixtures / eval scaffold).

**Triggering:** regenerating these artifacts (or running latency scripts against **Railway** with **`OPENAI_API_KEY`**) is **intentionally manual** — no scheduled or CI-automated production model runs. That avoids surprise cost and flaky comparisons when the model changes. **`npm run test`** remains the default always-on check.

| File | What it is |
|------|----------------|
| [`primary-latency-production-2026-05-11.json`](./primary-latency-production-2026-05-11.json) | `npm run eval:primary-latency` against the **Railway** production `BASE_URL` (fixtures with `includeInPrimaryLatencyEval`: happy-path label + two seeds). Latest snapshot: **HTTP 200**, **`openai`** extraction on all three (~3.5–6.5s round-trip). Regenerate after changing secrets, timeouts, or manifest flags. |
| *(ad hoc)* | **`npm run eval:primary-latency:bench`** — multi-iteration JSON with **min / max / mean / P95** per fixture and overall (`EVAL_ITERATIONS`, `EVAL_COOLDOWN_MS`, `EVAL_WARMUP` — see `README.md`). |
