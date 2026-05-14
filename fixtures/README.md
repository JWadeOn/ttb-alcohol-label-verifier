# Fixtures

- **`manifest.json`** — list of label images and flags (e.g. which entries default into `npm run eval:primary-latency`: happy-path synthetic label plus two seed textures).
- **`default-application.json`** — application JSON string body used by the eval script (matches the UI default shape; strict schema). **`tests/golden-default-application.test.ts`** asserts the validator outcome when extraction text **matches** this file (plus one strict-warning failure case).
- **`applications/`** — optional fixture-specific application payloads. When a manifest row sets `applicationPath`, `evals/run-fixture-verify.mjs` uses that file instead of `default-application.json`.
- **`labels/`** — generated synthetic-eval JPEGs live directly under this folder. Legacy happy-path, difficult, St. Petersburg, and edge-case PNG/JPG fixtures live under **`labels/on-bottle/`**. Seed noise fixtures live under **`labels/seed-textures/`**. `liquor_label_happy_path.png` is the synthetic reference label. `liquor_label_difficult.jpg` is a **stress-case photo** (glare, small type, anomalies) for manual or scripted `POST /api/verify` — stored as a compressed JPEG to keep full-eval latency realistic; see manifest id **`difficult-synthetic-label-photo`**; keep **`includeInPrimaryLatencyEval`** false unless you intentionally want it in the latency harness. `st_petersburg_whiskey_baseline.png` is a **real-photo baseline anchor** with additional clean baselines in `st_petersburg_whiskey_baseline_02.png` through `st_petersburg_whiskey_baseline_05.png`; `st_petersburg_whiskey_glare_brand.png` is a **real-photo glare variant** where brand text can degrade; `st_petersburg_whiskey_glare_warning_02.png` stresses **shoulder/label hotspot glare** (government warning and mid-label legibility); `st_petersburg_whiskey_glare_warning_harsh.png` is a **stronger warning-band glare** stress capture (centered label hotspot through ABV and warning); `st_petersburg_whiskey_angle_28.png` is a **real-photo ~28° yaw** whiskey perspective variant; `st_petersburg_vodka_baseline.png` is a **real-photo front-on vodka** baseline (pairs with the 45° angle variant); `st_petersburg_vodka_angle_45.png` is a **real-photo 45° angle** variant for perspective-skew stress; `st_petersburg_vodka_glare_brand.png` is a **real-photo vodka brand-glare** variant (vertical specular on brand lines); `st_petersburg_whiskey_blur_moderate.png` is a **real-photo moderate blur** variant; `st_petersburg_whiskey_blur_strong.png` is a **strong shallow depth-of-field** shot (sharp label, heavy background bokeh); `st_petersburg_whiskey_low_light_grain.png` is a **dim, grain-forward** library shot (noise stress on fine type); `st_petersburg_whiskey_distance_crop_warning.png` is a **real-photo distance/small-text** variant focused on warning readability risk; `st_petersburg_whiskey_crop_missing_warning.png` is a **tight crop** with the **government warning absent or clipped** (missing-field stress); `st_petersburg_whiskey_label_dark_baseline.png` is **Track B** front-on **dark-label** whiskey (contrast / alternate stock). `seed-texture-*.png` files are **deterministic noise** from `npm run fixtures:generate` (pipeline / image-gate smoke, not OCR-quality text). **`edge-synthetic-*.png`** are **non-seed edge variants** (glare, moderate blur, tilt) derived from the happy-path label for correctness eval — regenerate with **`npm run fixtures:edge-labels`** (requires `labels/on-bottle/liquor_label_happy_path.png`).

## Fixture policy

- Generated synthetic eval fixtures are **JPEG-only** to keep transformed assets small and API-friendly after rotation, glare, crop, and grain effects.
- The working upload / fixture ceiling is **1.5 MB per image** based on current TTB guidance. Older COLA attachment references that mention **750 KB** are treated as superseded for this prototype policy.

Regenerate noise fixtures after changing the generator:

```bash
npm run fixtures:generate
```

Regenerate edge-case label derivatives after changing the edge generator or base label:

```bash
npm run fixtures:edge-labels
```

Generate the canonical 20-image scripted synthetic batch (4 families x 5 variants, plus application payloads). This uses the Gemini-backed generator in `scripts/generate-synthetic-eval-fixtures-gemini.mjs`, so set `GEMINI_API_KEY` first:

```bash
npm run fixtures:synthetic-eval
```

**Programmatic verify (stress / regression):** `npm run eval:fixture-verify` with **`OPENAI_API_KEY`**, **`BASE_URL`**, and optional **`EVAL_FIXTURE_IDS`** (comma-separated manifest `id` values for exact selection) or **`EVAL_FIXTURE_SET`** presets (`st_petersburg`, `edge_synthetic`, `synthetic_eval`, `on_bottle`, `off_bottle`, `seed_textures`, `all_manifest`). Default is the full manifest set (`all_manifest`). `on_bottle` selects the moved legacy/photo fixtures under `labels/on-bottle/`; `off_bottle` selects the scripted synthetic JPEG set under `labels/`. Output includes per-fixture request/extraction timings and a top-level latency summary, so one run covers correctness plus latency signal. Set **`EVAL_OUT=docs/evals/…json`** to log a copy. See **`evals/run-fixture-verify.mjs`**.

**St. Petersburg real-photo expansion:** suggested next captures (Track A + **Track B alternate label stock**), prompts, and wiring checklist — **`docs/fixtures/st-petersburg-golden-next.md`**.
