# Fixtures

- **`manifest.json`** — list of label images and flags (e.g. which entries default into `npm run eval:primary-latency`: happy-path synthetic label plus two seed textures).
- **`default-application.json`** — application JSON string body used by the eval script (matches the UI default shape; strict schema). **`tests/golden-default-application.test.ts`** asserts the validator outcome when extraction text **matches** this file (plus one strict-warning failure case).
- **`applications/`** — optional fixture-specific application payloads. When a manifest row sets `applicationPath`, `evals/run-fixture-verify.mjs` uses that file instead of `default-application.json`.
- **`labels/`** — active eval assets currently focus on synthetic-eval JPEGs that live directly under this folder (`labels/synthetic_eval_*`). Seed noise fixtures live under **`labels/seed-textures/`**. Curated on-bottle candidates are kept under **`labels/curated/on-bottle/`** as a manual lane and are intentionally excluded from active L0/L1/L2 gates until handpicked reintroduction.

## Fixture policy

- Generated synthetic eval fixtures are **JPEG-only** to keep transformed assets small and API-friendly after rotation, glare, crop, and grain effects.
- The working upload / fixture ceiling is **1.5 MB per image** based on current TTB guidance. Older COLA attachment references that mention **750 KB** are treated as superseded for this prototype policy.

Regenerate noise fixtures after changing the generator:

```bash
npm run fixtures:generate
```

Generate the canonical 20-image scripted synthetic batch (4 families x 5 variants, plus application payloads). This uses the Gemini-backed generator in `scripts/generate-synthetic-eval-fixtures-gemini.mjs`, so set `GEMINI_API_KEY` first:

```bash
npm run fixtures:synthetic-eval
```

**Programmatic verify (stress / regression):** `npm run eval:fixture-verify` with **`OPENAI_API_KEY`**, **`BASE_URL`**, and optional **`EVAL_FIXTURE_IDS`** (comma-separated manifest `id` values for exact selection) or **`EVAL_FIXTURE_SET`** presets (`synthetic_eval`, `off_bottle`, `seed_textures`, `name_address_candidates`, `all_manifest`, plus legacy presets retained for compatibility). Output includes per-fixture request/extraction timings and a top-level latency summary. Set **`EVAL_OUT=docs/evals/…json`** to log a copy. See **`evals/run-fixture-verify.mjs`** and **`docs/evals/suite-plan.json`** for active suite membership.
