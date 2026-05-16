# Fixture application payloads

These JSON files are optional per-fixture application payloads used by `evals/run-fixture-verify.mjs` when a `fixtures/manifest.json` row sets `applicationPath`.

## Active synthetic-eval payloads

- `synthetic_eval_vodka_import.json`
- `synthetic_eval_whiskey_cream.json`
- `synthetic_eval_whiskey_dark.json`
- `synthetic_eval_spiced_rum.json`

## Obvious-fail contradiction payloads (L1)

Reuse `labels/synthetic_eval_vodka_import_baseline_front.jpg` with intentionally wrong application fields:

- `synthetic_eval_vodka_import_obvious_fail_brand.json`
- `synthetic_eval_vodka_import_obvious_fail_alcohol.json`
- `synthetic_eval_vodka_import_obvious_fail_net_contents.json`
- `synthetic_eval_vodka_import_obvious_fail_country_of_origin.json`

## Mandatory-field-missing payload (L1)

- `synthetic_eval_vodka_import_missing_name_address.json` — blank `nameAddress` must yield validator `fail` on `nameAddress`

## Legacy / manual payloads

- `smirnoff_vodka_happy_path.json` (currently not referenced by `fixtures/manifest.json`)

If you reintroduce a payload into active evaluators, add/update the corresponding `applicationPath` entries in `fixtures/manifest.json` and confirm it is included intentionally in `docs/evals/suite-plan.json`.
