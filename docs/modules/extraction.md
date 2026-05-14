# Module: `lib/extraction/*` (vision extraction)

**Evaluator — where “requirements” are *not*:** Extraction only supplies text + confidence for **`lib/validator.ts`**. It does not encode 27 CFR. See **[`../REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md)**.

## Responsibility

Pluggable **extraction** from label image bytes → structured per-field values with confidence, plus **failover orchestration** when the primary provider is slow or errors.

| File | Role |
|------|------|
| `types.ts` | `ExtractedField`, `ExtractionResult`, `emptyExtractedField` / `emptyExtractionFields`. |
| `provider.ts` | `ExtractionProvider` interface; **`extractWithFailover`** for LLM failover (`openai` → `unavailable`) with optional soft/hard timers. |
| `openai-provider.ts` | **`createOpenAIProvider`**: OpenAI chat completions with vision (`gpt-4o-mini`), `response_format: json_object`, Zod parse of returned fields. Supports env tuning via `OPENAI_VISION_DETAIL` (`low`/`auto`/`high`) and `OPENAI_MAX_OUTPUT_TOKENS` (`200..4096`, default `500`). |
| `tesseract-provider.ts` | **`createTesseractProvider`**: OCR-first provider (`tesseract.js`) with pragmatic field-pattern extraction and confidence estimates. |
| `hybrid-routing.ts` | Hybrid escalation policy: field-aware routing (required fields: class/alcohol/net) decides when OCR is sufficient vs escalate to LLM. |
| `unavailable-fallback-provider.ts` | Last-resort placeholder when no extraction path yields usable fields. |

## Decisions

- **Server logging** — `extractWithFailover` logs a structured warning when the primary provider throws (includes optional `requestId`, `primaryAborted`, timeout budgets). Never logs API keys or image bytes.
- **Hybrid by default** — OCR-first is favored for latency, with configurable escalation to LLM for quality-sensitive cases.
- **JSON-only** model output reduces parsing brittleness; still validated with Zod before use.
- **Primary obeys `AbortSignal`** from failover’s hard timeout so in-flight work can be cancelled.

## Dependencies

- `openai` SDK (LLM provider).
- `tesseract.js` (OCR provider).
- `@/lib/schemas` (`FieldId`).

## Related tests

- `tests/extract-failover.test.ts`
- `tests/hybrid-routing.test.ts`

## Maintenance

If escalation thresholds or provider routing change, update this doc and `docs/ARCHITECTURE.md` snapshot.
