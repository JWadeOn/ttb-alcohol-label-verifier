# Module: `lib/verify-pipeline.ts`

## Responsibility

Orchestrate the verify **business flow** (no `Request` / Next types):

1. `assessImageQuality(imageBytes)` — reject early if not ok (`VerifyFailedError` **422** / `IMAGE_QUALITY_REJECTED`).
2. Build primary OpenAI provider + `unavailable` fallback; `extractWithFailover` on **processed** buffer from step 1.
3. On extraction throw → **502** / `EXTRACTION_FAILED`.
4. `validateLabelFields(extraction, application)`.
5. Assemble `VerifySuccessResponse`, `VerifySuccessResponseSchema.safeParse`; schema failure → **500** / `INTERNAL_ERROR`.

## Decisions

- Lives in **`lib/`** (not the API route) for unit testing without Next mocks; matches AGENTS.md “deep modules, thin routes.”
- **Image quality before LLM** — saves cost and gives clearer rejection than a failed model call on unusable images.
- Final **Zod parse** of the assembled success body catches internal drift before returning to the client.

## Dependencies

- `@/lib/image-quality`
- `@/lib/extraction/*` (providers + `extractWithFailover`)
- `@/lib/validator`
- `@/lib/schemas`

## Related tests

- Indirectly via `tests/verify-handler.test.ts` with mocked pipeline; add dedicated pipeline tests if orchestration grows.

## Types

- **`VerifyFailedError`** — carries `httpStatus`, `code`, and message for the handler to map to JSON.
