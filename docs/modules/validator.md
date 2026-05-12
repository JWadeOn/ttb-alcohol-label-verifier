# Module: `lib/validator.ts`

**Source-of-truth context (evaluators):** This file is the **implementation source** for deterministic pass/fail/manual_review/not_applicable. It is **not** a dump of 27 CFR. Read **[`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md)** for how PRD, this module, extraction, and UI copy relate.

## Responsibility

**Deterministic** comparison of model extraction vs submitted application JSON:

- Per-field **`FieldValidationRow`**: `status` (`pass` | `fail` | `manual_review` | `not_applicable`), message, extracted/application values, evidence.
- **Confidence gate** — below `CONFIDENCE_MANUAL_REVIEW` (exported, **0.65**) ⇒ `manual_review` (do not auto-pass/fail on noisy reads).
- **Government warning** — **exact** string equality vs application (case-sensitive); regulatory text is treated strictly (`validator.test.ts` “Jenny” case for wrong heading casing).
- **Brand, class, name, origin** — fuzzy match via `fuzzyRatio` + `levenshteinDistance` on normalized alphanumeric keys; thresholds **`BRAND_SIMILARITY`**, **`CLASS_SIMILARITY`**, **`NAME_SIMILARITY`**, **`ORIGIN_SIMILARITY`** are exported for UI parity with code.
- **Alcohol** — parse approximate ABV from label and application; compare within **`ABV_TOLERANCE`** (% points; exported).
- **Net contents** — parse approximate ml; compare within max of **`VOLUME_TOLERANCE_ML`** and **`VOLUME_TOLERANCE_RATIO`** of the larger volume (both exported).
- **`countryOfOrigin`** — `not_applicable` when `isImport` is not true; otherwise fuzzy vs application when present.

## Decisions

- **`manual_review`** preferred over guessing when extraction is empty, low confidence, or parsing fails.
- Fuzzy thresholds are **exported constants** (same values the UI “Coded match thresholds” panel reads) — tune with tests when changing behavior.

## Dependencies

- `@/lib/extraction/types`
- `@/lib/levenshtein-distance`
- `@/lib/schemas`

## Related tests

- `tests/validator.test.ts` — unit cases (fuzzy brand, strict warning, confidence gate, import `not_applicable`).
- `tests/golden-default-application.test.ts` — **golden path** against committed **`fixtures/default-application.json`** + synthetic matching extraction (no OpenAI).

## See also

- [`../REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md) — evaluator trace (PRD vs this file vs regulatory reality)
- [levenshtein-distance.md](./levenshtein-distance.md)
