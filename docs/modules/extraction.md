# Module: `lib/extraction/*` (vision extraction)

**Evaluator — where “requirements” are *not*:** Extraction only supplies text + confidence for **`lib/validator.ts`**. It does not encode 27 CFR. See **[`../REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md)**.

## Responsibility

Pluggable **extraction** from label image bytes → structured per-field values with confidence, plus **failover orchestration** when the primary provider is slow or errors.

| File | Role |
|------|------|
| `types.ts` | `ExtractedField`, `ExtractionResult`, `emptyExtractedField` / `emptyExtractionFields`. |
| `provider.ts` | `ExtractionProvider` interface; **`extractWithFailover`** (soft timeout starts fallback in parallel, hard timeout aborts primary). |
| `openai-provider.ts` | **`createOpenAIProvider`**: OpenAI chat completions with vision (`gpt-4o-mini`), `response_format: json_object`, Zod parse of returned fields. |
| `unavailable-fallback-provider.ts` | **`createUnavailableFallbackProvider`**: Phase 1 placeholder — returns empty fields with a fixed `reason` (Phase 2: Tesseract or other OCR here). |

## Decisions

- **Server logging** — `extractWithFailover` logs a structured warning when the primary provider throws (includes optional `requestId`, `primaryAborted`, timeout budgets). Never logs API keys or image bytes.
- **Failover without real OCR** — proves timeout and response assembly before investing in Tesseract; README and fallback `reason` set expectations.
- **JSON-only** model output reduces parsing brittleness; still validated with Zod before use.
- **Primary obeys `AbortSignal`** from failover’s hard timeout so in-flight work can be cancelled.

## Dependencies

- `openai` SDK (OpenAI provider).
- `@/lib/schemas` (`FieldId`).

## Related tests

- `tests/extract-failover.test.ts`

## Maintenance

When Tesseract (or another) replaces `unavailable-fallback-provider`, update this doc and `docs/ARCHITECTURE.md` snapshot.
