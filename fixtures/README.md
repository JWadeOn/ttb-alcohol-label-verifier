# Fixtures

- **`manifest.json`** — list of label images and flags (e.g. which entries default into `npm run eval:primary-latency`: happy-path synthetic label plus two seed textures).
- **`default-application.json`** — application JSON string body used by the eval script (matches the UI default shape; strict schema). **`tests/golden-default-application.test.ts`** asserts the validator outcome when extraction text **matches** this file (plus one strict-warning failure case).
- **`labels/`** — PNGs. `liquor_label_happy_path.png` is the synthetic reference label. `liquor_label_difficult.png` is a **stress-case photo** (glare, small type, anomalies) for manual or scripted `POST /api/verify` — see manifest id **`difficult-synthetic-label-photo`**; keep **`includeInPrimaryLatencyEval`** false unless you intentionally want it in the latency harness. `seed-texture-*.png` files are **deterministic noise** from `npm run fixtures:generate` (pipeline / image-gate smoke, not OCR-quality text).

Regenerate noise fixtures after changing the generator:

```bash
npm run fixtures:generate
```

**Programmatic verify (stress / regression):** `npm run eval:fixture-verify` with **`OPENAI_API_KEY`**, **`BASE_URL`**, and optional **`EVAL_FIXTURE_IDS`** (comma-separated manifest `id` values; defaults to **`difficult-synthetic-label-photo`**). Set **`EVAL_OUT=docs/evals/…json`** to log a copy. See **`evals/run-fixture-verify.mjs`**.
