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

## Application-data mismatch payloads (demo + QA eval)

Same label image, intentionally wrong application field:

- `synthetic_eval_whiskey_cream_obvious_fail_brand.json` — application brand `Stone's Throw Distilling Co` vs label `Cinder Ridge`

Paired with `labels/synthetic_eval_whiskey_cream_baseline_front.jpg`. Run expectations: `npm run eval:synthetic-app-mismatch`

Legacy on-bottle mismatch JSON files (`on_bottle_obvious_fail_*.json`) remain for reference but are not in the active manifest.

## Legacy / manual payloads

- `smirnoff_vodka_happy_path.json` (currently not referenced by `fixtures/manifest.json`)
- `on_bottle_happy_path_prime_distillery.json` (used by first Demo run preset for corrected name/address pairing)

If you reintroduce a payload into active evaluators, add/update the corresponding `applicationPath` entries in `fixtures/manifest.json` and confirm it is included intentionally in `docs/evals/suite-plan.json`.
