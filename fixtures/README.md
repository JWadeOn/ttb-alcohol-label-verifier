# Fixtures

- **`manifest.json`** — list of label images and flags (e.g. which entries default into `npm run eval:primary-latency`: happy-path synthetic label plus two seed textures).
- **`default-application.json`** — application JSON string body used by the eval script (matches the UI default shape; strict schema). **`tests/golden-default-application.test.ts`** asserts the validator outcome when extraction text **matches** this file (plus one strict-warning failure case).
- **`labels/`** — PNGs. `liquor_label_happy_path.png` is the synthetic reference label. `liquor_label_difficult.png` is a **stress-case photo** (glare, small type, anomalies) for manual or scripted `POST /api/verify` — see manifest id **`difficult-synthetic-label-photo`**; keep **`includeInPrimaryLatencyEval`** false unless you intentionally want it in the latency harness. `st_petersburg_whiskey_baseline.png` is a **real-photo baseline anchor** with additional clean baselines in `st_petersburg_whiskey_baseline_02.png` through `st_petersburg_whiskey_baseline_05.png`; `st_petersburg_whiskey_glare_brand.png` is a **real-photo glare variant** where brand text can degrade; `st_petersburg_whiskey_glare_warning_02.png` stresses **shoulder/label hotspot glare** (government warning and mid-label legibility); `st_petersburg_whiskey_glare_warning_harsh.png` is a **stronger warning-band glare** stress capture (centered label hotspot through ABV and warning); `st_petersburg_whiskey_angle_28.png` is a **real-photo ~28° yaw** whiskey perspective variant; `st_petersburg_vodka_baseline.png` is a **real-photo front-on vodka** baseline (pairs with the 45° angle variant); `st_petersburg_vodka_angle_45.png` is a **real-photo 45° angle** variant for perspective-skew stress; `st_petersburg_whiskey_blur_moderate.png` is a **real-photo moderate blur** variant; and `st_petersburg_whiskey_distance_crop_warning.png` is a **real-photo distance/small-text** variant focused on warning readability risk. `seed-texture-*.png` files are **deterministic noise** from `npm run fixtures:generate` (pipeline / image-gate smoke, not OCR-quality text). **`edge-synthetic-*.png`** are **non-seed edge variants** (glare, moderate blur, tilt) derived from the happy-path label for correctness eval — regenerate with **`npm run fixtures:edge-labels`** (requires `liquor_label_happy_path.png`).

Regenerate noise fixtures after changing the generator:

```bash
npm run fixtures:generate
```

Regenerate edge-case label derivatives after changing the edge generator or base label:

```bash
npm run fixtures:edge-labels
```

**Programmatic verify (stress / regression):** `npm run eval:fixture-verify` with **`OPENAI_API_KEY`**, **`BASE_URL`**, and optional **`EVAL_FIXTURE_IDS`** (comma-separated manifest `id` values; defaults to **`difficult-synthetic-label-photo`**). Set **`EVAL_OUT=docs/evals/…json`** to log a copy. See **`evals/run-fixture-verify.mjs`**.

**St. Petersburg real-photo expansion:** suggested next captures (Track A + **Track B alternate label stock**), prompts, and wiring checklist — **`docs/fixtures/st-petersburg-golden-next.md`**.
