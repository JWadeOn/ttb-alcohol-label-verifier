# Fixture Correctness Thresholds

This file defines the current correctness-evidence bar for `npm run eval:fixture-verify`.

## Inputs

- Expectations profile: `docs/evals/fixture-correctness-expectations.json`
- Default application: `fixtures/default-application.json`
- Target fixtures for sign-off:
  - `happy-path-synthetic-label`
  - `difficult-synthetic-label-photo`
  - `seed-texture-01`
  - `seed-texture-02`
  - `edge-synthetic-glare-label`
  - `edge-synthetic-blur-label`
  - `edge-synthetic-angle-label`

## Thresholds

- `minOverallScore`: `0.70`
  - Aggregate pass ratio across all scored checks in the run.
- `minFixturePassRate`: `0.50`
  - At least half of scored fixtures must meet their fixture-level `minScore`.
- `requiredFixtureIds`
  - All listed sign-off fixture ids must be present in the run output.

## Fixture rules

- **Happy path fixture (`happy-path-synthetic-label`)**
  - Allows provider `openai` or **`unavailable`** (honest failover when primary extraction does not return in time).
  - Requires `imageQuality.ok = true`.
  - Requires `durationMs <= 12000`.
  - Requires `minScore >= 0.85`.
  - Expects each MVP field as **`pass` or `manual_review`** (placeholder extraction is all `manual_review`), `countryOfOrigin = not_applicable`, and `nameAddress` as `manual_review` or `pass`.

- **Difficult fixture (`difficult-synthetic-label-photo`)**
  - Allows provider `openai` or `unavailable`.
  - Requires `imageQuality.ok = true`.
  - Requires `durationMs <= 20000`.
  - Requires at least 1 `manual_review` field.
  - Requires `minScore >= 0.50`.
  - Constrains `governmentWarning` to `manual_review` or an explicit decision (`fail`/`pass`) and `countryOfOrigin = not_applicable`.

- **Seed texture fixtures (`seed-texture-01`, `seed-texture-02`)**
  - Allow provider `openai` or `unavailable`.
  - Require `imageQuality.ok = true`.
  - Require `durationMs <= 12000`.
  - Require at least 5 `manual_review` fields.
  - Require `minScore >= 0.85`.
  - Expect all MVP/P1 comparison fields to stay `manual_review`, with `countryOfOrigin = not_applicable`.

- **Non-seed edge fixtures (`edge-synthetic-glare-label`, `edge-synthetic-blur-label`, `edge-synthetic-angle-label`)**
  - Derived from `liquor_label_happy_path.png` via `npm run fixtures:edge-labels` (glare overlay, moderate blur still above the Laplacian gate, ~22° tilt).
  - Allow provider `openai` or `unavailable`.
  - Require `imageQuality.ok = true`.
  - Require `durationMs <= 20000`.
  - Require `minScore >= 0.50`.
  - Constrain `governmentWarning` to `manual_review`, `fail`, or `pass`, and `countryOfOrigin = not_applicable` (same default application as other fixtures).

## Run command

```bash
set -a && source .env && set +a && EVAL_FIXTURE_IDS=happy-path-synthetic-label,difficult-synthetic-label-photo,seed-texture-01,seed-texture-02,edge-synthetic-glare-label,edge-synthetic-blur-label,edge-synthetic-angle-label EVAL_OUT=docs/evals/fixture-correctness-$(date +%F).json npm run eval:fixture-verify
```

If `OPENAI_API_KEY` is not present in the environment, the eval script intentionally prints a skip payload and exits `0`.
