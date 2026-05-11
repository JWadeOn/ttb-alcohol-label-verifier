# Module: `app/api/verify/route.ts`

## Responsibility

Expose `POST /api/verify` by delegating the incoming `Request` to `handleVerifyPost` from `lib/verify-handler.ts`.

## Decisions

- Route stays **thin** (one line of business logic) so HTTP parsing, validation, and pipeline orchestration remain testable in `lib/` without importing Next route types in deep modules.

## Dependencies

- `@/lib/verify-handler`

## Related tests

- `tests/verify-handler.test.ts` (indirectly, via `handleVerifyPost`)
