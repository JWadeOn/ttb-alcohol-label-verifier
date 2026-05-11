# Eval artifacts

Committed outputs from **optional** eval scripts (see `README.md` → fixtures / eval scaffold).

| File | What it is |
|------|----------------|
| [`primary-latency-production-2026-05-11.json`](./primary-latency-production-2026-05-11.json) | `npm run eval:primary-latency` against the **Railway** production `BASE_URL` (fixtures with `includeInPrimaryLatencyEval`). Latest: **HTTP 200**, **`unavailable`** extraction on seed textures (~3.7–4.1s). Regenerate after changing secrets, timeouts, or manifest flags. |
