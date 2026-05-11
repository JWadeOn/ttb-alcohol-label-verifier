# Module: `lib/levenshtein-distance.ts`

## Responsibility

Compute **Levenshtein edit distance** between two strings for use in normalized fuzzy matching (`validator.ts` → `fuzzyRatio`).

## Decisions

- Small, pure utility — no I/O; easy to unit test indirectly via validator tests.

## Dependencies

None (stdlib only).

## Related tests

- `tests/validator.test.ts` (behavioral coverage of fuzzy fields)
