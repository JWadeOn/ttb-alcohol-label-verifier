# Module: `lib/stub-response.ts`

## Responsibility

**Phase 0 artifact:** `buildStubVerifyResponse(requestId, application)` returns a **`VerifySuccessResponse`** that satisfies `VerifySuccessResponseSchema`, with per-field **`manual_review`** (and `countryOfOrigin` **`not_applicable`** when non-import) and `extraction.provider` of **`stub`**.

## Decisions

- **Not used in production** — the live app runs `verify-pipeline.ts`. The stub remains so tests can assert handler wiring and response shape **without OpenAI** (`tests/verify-handler.test.ts`).

## Dependencies

- `@/lib/schemas`

## Related tests

- `tests/stub-response.test.ts`
- `tests/verify-handler.test.ts`
