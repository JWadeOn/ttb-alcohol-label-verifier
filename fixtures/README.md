# Fixtures

- **`manifest.json`** — list of label images and flags (e.g. which entries default into `npm run eval:primary-latency`: happy-path synthetic label plus two seed textures).
- **`default-application.json`** — application JSON string body used by the eval script (matches the UI default shape; strict schema). **`tests/golden-default-application.test.ts`** asserts the validator outcome when extraction text **matches** this file (plus one strict-warning failure case).
- **`labels/`** — PNGs. `liquor_label_happy_path.png` is the synthetic reference label. `liquor_label_difficult.png` is a **stress-case photo** (glare, small type, anomalies) for manual or scripted `POST /api/verify` — see manifest id **`difficult-synthetic-label-photo`**; keep **`includeInPrimaryLatencyEval`** false unless you intentionally want it in the latency harness. `seed-texture-*.png` files are **deterministic noise** from `npm run fixtures:generate` (pipeline / image-gate smoke, not OCR-quality text).

Regenerate noise fixtures after changing the generator:

```bash
npm run fixtures:generate
```
