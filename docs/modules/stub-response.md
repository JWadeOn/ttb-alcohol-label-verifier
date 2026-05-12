# Module: `lib/stub-response.ts`

## Responsibility

**Phase 0 artifact:** `buildStubVerifyResponse(requestId, application)` returns a **`VerifySuccessResponse`** that satisfies `VerifySuccessResponseSchema`, with per-field **`manual_review`** (and `countryOfOrigin` **`not_applicable`** when non-import) and `extraction.provider` of **`stub`**. Field **`message`** matches **`MANUAL_REVIEW_LOW_CONFIDENCE_MESSAGE`** from `lib/validator.ts` (same copy as low-confidence validation). **`extraction.fields`** uses **`emptyExtractionFields`** from `lib/extraction/types.ts` (same placeholder **`reason`** as the `unavailable` fallback provider) so the Results UI shows the same subtext as a no-OCR run.

## Decisions

- **Not used in production pipeline** — the live app runs `verify-pipeline.ts`. The stub builder is used in tests and when **`VERIFY_DEV_STUB`** is enabled in non-production (see `docs/modules/verify-handler.md`).

## Dependencies

- `@/lib/schemas`
- `@/lib/extraction/types` (`emptyExtractionFields`)
- `@/lib/validator` (`MANUAL_REVIEW_LOW_CONFIDENCE_MESSAGE`)

## Related tests

- `tests/stub-response.test.ts`
- `tests/verify-handler.test.ts`
