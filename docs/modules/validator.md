# Module: `lib/validator.ts`

## Responsibility

**Deterministic** comparison of model extraction vs submitted application JSON:

- Per-field **`FieldValidationRow`**: `status` (`pass` | `fail` | `manual_review` | `not_applicable`), message, extracted/application values, evidence.
- **Confidence gate** — below `CONFIDENCE_MANUAL_REVIEW` ⇒ `manual_review` (do not auto-pass/fail on noisy reads).
- **Government warning** — **exact** string equality vs application (case-sensitive); regulatory text is treated strictly (`validator.test.ts` “Jenny” case for wrong heading casing).
- **Brand, class, name, origin** — fuzzy match via `fuzzyRatio` + `levenshteinDistance` on normalized alphanumeric keys; each field has its own similarity threshold constant in source.
- **Alcohol** — parse approximate ABV from label and application; compare within `ABV_TOLERANCE` (% points).
- **Net contents** — parse approximate ml; compare within max of absolute ml tolerance and ratio tolerance (see constants in source).
- **`countryOfOrigin`** — `not_applicable` when `isImport` is not true; otherwise fuzzy vs application when present.

## Decisions

- **`manual_review`** preferred over guessing when extraction is empty, low confidence, or parsing fails.
- Fuzzy thresholds live next to the logic; tune with tests when changing behavior.

## Dependencies

- `@/lib/extraction/types`
- `@/lib/levenshtein-distance`
- `@/lib/schemas`

## Related tests

- `tests/validator.test.ts` — unit cases (fuzzy brand, strict warning, confidence gate, import `not_applicable`).
- `tests/golden-default-application.test.ts` — **golden path** against committed **`fixtures/default-application.json`** + synthetic matching extraction (no OpenAI).

## See also

- [levenshtein-distance.md](./levenshtein-distance.md)
