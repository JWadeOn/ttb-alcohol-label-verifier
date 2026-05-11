# Module: `lib/canonical-warning.ts`

## Responsibility

Export **`CANONICAL_GOVERNMENT_WARNING`**: the standard distilled-spirits government warning paragraph used as:

- Default text in the UI’s example application JSON (`app/page.tsx`).
- Reference for validator tests and manual “happy path” label QA (must match **exactly** for `governmentWarning` pass when application uses this string).

## Decisions

- Single source of truth in code avoids drift between textarea defaults and test fixtures.

## Dependencies

None.

## Related tests

- `tests/validator.test.ts` (imports canonical string)
