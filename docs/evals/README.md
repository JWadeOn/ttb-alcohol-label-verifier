# Eval artifacts

Committed outputs from **optional** eval scripts (see `README.md` → fixtures / eval scaffold).

| File | What it is |
|------|----------------|
| [`primary-latency-production-2026-05-11.json`](./primary-latency-production-2026-05-11.json) | `npm run eval:primary-latency` against the **Railway** production `BASE_URL` (fixtures with `includeInPrimaryLatencyEval`). Latest: **HTTP 200**, **`unavailable`** extraction on seed textures (~3.7–4.1s). Regenerate after changing secrets, timeouts, or manifest flags. |
| *(ad hoc)* | **`npm run eval:primary-latency:bench`** — multi-iteration JSON with **min / max / mean / P95** per fixture and overall (`EVAL_ITERATIONS`, `EVAL_COOLDOWN_MS`, `EVAL_WARMUP` — see `README.md`). |
