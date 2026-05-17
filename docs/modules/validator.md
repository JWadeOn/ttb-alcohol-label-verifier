# Module: `lib/validator.ts`

**Source-of-truth context (evaluators):** This file is the **implementation source** for deterministic pass/fail/manual_review/not_applicable. It is **not** a dump of 27 CFR. Read **[`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md)** for how PRD, this module, extraction, and UI copy relate.

## Responsibility

**Deterministic** comparison of model extraction vs submitted application JSON:

- Per-field **`FieldValidationRow`**: `status` (`pass` | `fail` | `manual_review` | `not_applicable`), message, extracted/application values, evidence.
- **Confidence gate** — below `CONFIDENCE_MANUAL_REVIEW` (exported, **0.65**) generally routes to `manual_review`; **exception:** government warning can still return `fail` when a low-confidence extraction is materially contradictory to the submitted warning text.
- **Government warning** — exact text auto-passes; non-exact uses fuzzy triage with **`GOVERNMENT_WARNING_SIMILARITY_FAIL_BELOW`** (exported, **0.55**): at or above → `manual_review`, below → `fail` (normal and low-confidence paths).
- **Brand, class, name, origin** — fuzzy match via `fuzzyRatio` + `levenshteinDistance` on normalized alphanumeric keys; thresholds **`BRAND_SIMILARITY`**, **`CLASS_SIMILARITY`**, **`NAME_SIMILARITY`**, **`ORIGIN_SIMILARITY`** are exported for UI parity with code.
- **Name/address** — compares the **full** printed line (including `Distilled by`, `Bottled by`, or `Imported by` when present); qualifiers are not stripped before fuzzy match.
- **Class/type modifier policy** — when extracted and application class/type share the same base spirit token (`rum`, `vodka`, `gin`, etc.) but modifiers differ (for example `Rum` vs `Spiced Rum`), validator returns `manual_review` instead of hard fail; contradictory base spirits still fail.
- **Alcohol** — parse approximate ABV from label and application; compare within **`ABV_TOLERANCE`** (% points; exported).
- **Net contents** — parse approximate ml; compare within max of **`VOLUME_TOLERANCE_ML`** and **`VOLUME_TOLERANCE_RATIO`** of the larger volume (both exported).
- **`countryOfOrigin`** — `not_applicable` when `isImport` is not true; otherwise fuzzy vs application when present.

## Decisions

- **Missing mandatory application values** — `fail` immediately via `lib/application-compliance.ts` helpers (always: brand, class, alcohol, net contents, name/address, government warning; `countryOfOrigin` when `isImport`). See **`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`**.
- **`manual_review`** preferred over guessing when extraction is empty, low confidence, or parsing fails (after mandatory application checks pass).
- Fuzzy thresholds are **exported constants** (same values the UI “Coded match thresholds” panel reads) — tune with tests when changing behavior.

## Dependencies

- `@/lib/extraction/types`
- `@/lib/levenshtein-distance`
- `@/lib/schemas`

## Related tests

- `tests/validator.test.ts` — unit cases (fuzzy brand, warning triage, confidence gate, import `not_applicable`).
- `tests/golden-default-application.test.ts` — **golden path** against committed **`fixtures/default-application.json`** + synthetic matching extraction (no OpenAI).

## See also

- [`../REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md) — evaluator trace (PRD vs this file vs regulatory reality)
- [levenshtein-distance.md](./levenshtein-distance.md)
