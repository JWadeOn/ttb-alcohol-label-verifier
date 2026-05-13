# Module: `lib/verify-pipeline.ts`

## Responsibility

Orchestrate the verify **business flow** (no `Request` / Next types):

1. `assessImageQuality(imageBytes)` — reject early if not ok (`VerifyFailedError` **422** / `IMAGE_QUALITY_REJECTED`).
2. Build extraction providers and route by mode: default **hybrid** runs OCR-first (`tesseract`) and escalates to OpenAI when required fields (class/alcohol/net) are missing/low-confidence or critical-field quality is insufficient; `llm_only` and `ocr_only` are available via env.
3. When LLM path is used, call `extractWithFailover` (`openai` primary + `unavailable` fallback) on the processed buffer from step 1 (no forced timeout by default; optionally set **`VERIFY_EXTRACT_SOFT_TIMEOUT_MS`** / **`VERIFY_EXTRACT_HARD_TIMEOUT_MS`**).
4. On extraction throw → **502** / `EXTRACTION_FAILED`.
5. `validateLabelFields(extraction, application)`.
6. Assemble `VerifySuccessResponse`, `VerifySuccessResponseSchema.safeParse`; schema failure → **500** / `INTERNAL_ERROR`.

## Decisions

- Lives in **`lib/`** (not the API route) for unit testing without Next mocks; matches AGENTS.md “deep modules, thin routes.”
- **Image quality before extraction** — saves cost and gives clearer rejection than attempting OCR/LLM on unusable images.
- Final **Zod parse** of the assembled success body catches internal drift before returning to the client.
- **`[verify-pipeline]` logs** — include extraction mode, OCR escalation decisions (reason + confidence/coverage), selected provider, and pipeline timings.
- **Timing** — on successful assembly, logs **`pipelineMs`** (image quality → extraction → validation) plus active soft/hard timeout values. **`[verify] request completed`** in `verify-handler.ts` logs **`totalMs`** from handler entry through successful pipeline return (includes multipart parse and image buffer read).

## Dependencies

- `@/lib/image-quality`
- `@/lib/extraction/*` (providers + `extractWithFailover`)
- `@/lib/validator`
- `@/lib/schemas`

## Related tests

- Indirectly via `tests/verify-handler.test.ts` with mocked pipeline; add dedicated pipeline tests if orchestration grows.

## Types

- **`VerifyFailedError`** — carries `httpStatus`, `code`, and message for the handler to map to JSON.
