# Module: `lib/extraction/*` (vision extraction)

**Evaluator — where “requirements” are *not*:** Extraction only supplies text + confidence for **`lib/validator.ts`**. It does not encode 27 CFR. See **[`../REQUIREMENTS_SOURCE_OF_TRUTH.md`](../REQUIREMENTS_SOURCE_OF_TRUTH.md)**.

## Responsibility

Pluggable **extraction** from label image bytes → structured per-field values with confidence, plus **failover orchestration** when the primary provider is slow or errors.

| File | Role |
|------|------|
| `types.ts` | `ExtractedField`, `ExtractionResult`, `emptyExtractedField` / `emptyExtractionFields`. |
| `provider.ts` | `ExtractionProvider` interface; **`extractWithFailover`** for LLM failover (`openai` → `unavailable`) with optional soft/hard timers. |
| `openai-provider.ts` | **`createOpenAIProvider`**: OpenAI chat completions with vision (`gpt-4o-mini`), `response_format: json_object`, Zod parse of returned fields. Supports env tuning via `OPENAI_VISION_DETAIL` (`low`/`auto`/`high`) and `OPENAI_MAX_OUTPUT_TOKENS` (`200..4096`, default `500`). |
| `tesseract-provider.ts` | **`createTesseractProvider`**: OCR-first provider (`tesseract.js`) with layout-aware parsing (left/right panel split from OCR word boxes) plus defensive quality scoring for brand and government-warning candidates (reject punctuation/noise-heavy brand lines; reduce warning confidence when OCR only captures a fragmented warning block). |
| `hybrid-routing.ts` | Hybrid escalation policy: field-aware routing (required fields: class/alcohol/net) decides when OCR is sufficient vs escalate to LLM. |
| `unavailable-fallback-provider.ts` | Last-resort placeholder when no extraction path yields usable fields. |

## Decisions

- **Server logging** — `extractWithFailover` logs a structured warning when the primary provider throws (includes optional `requestId`, `primaryAborted`, timeout budgets). Never logs API keys or image bytes.
- **Hybrid by default** — OCR-first is favored for latency, with configurable escalation to LLM for quality-sensitive cases.
- **Brand extraction is intentionally conservative** — when OCR top lines look noisy (symbol-heavy / low alphabetic ratio / class-type-only lines), brand is left null so validation lands in manual review instead of deterministic false-fail on junk text.
- **Brand extraction ignores warning-body phrases** — lines containing canonical warning sentence fragments (e.g., “consumption of alcoholic beverages”, “surgeon general”, “operate machinery”) are excluded from brand candidates so warning text is not mistaken for the brand.
- **Brand selection is class-aware** — when OCR finds a class/type line (e.g., `Rum`), brand selection first prioritizes plausible lines immediately above it before falling back to global top-line scoring.
- **Low-confidence brand text is still surfaced** — when strict brand detection fails, OCR keeps a tentative candidate with confidence below the validator gate so Results can show what text was read while still routing the row to manual review.
- **Brand post-cleanup trims spillover** — OCR brand candidates are clipped at separators and stop hints (`country-of-origin`, warning phrases, bottler text) so the displayed extracted brand is a short probable brand phrase instead of concatenated neighboring blocks.
- **Noisy pseudo-brands are suppressed** — very short/gibberish token patterns (for example OCR like `J EF \J`) are rejected instead of surfaced as brand text, preventing deterministic brand fails on obvious OCR garbage.
- **Address-aware brand fallback** — when headline brand OCR is too noisy, extraction can infer a low-confidence brand from `Bottled/Distilled/... by <brand> ...` phrasing (for example stripping trailing `Spirits`), preserving useful review context without forcing auto-pass.
- **Two-panel parsing is gated by warning-side evidence** — left-panel-only classification text is used only when warning language is strongly right-sided; when both halves contain warning phrases (common in centered vertical layouts), extraction falls back to full-text parsing so brand/class do not drop or fragment.
- **Class/type display is normalized for readability** — OCR class/type matches are returned in title case (for example, `spiced Rum` → `Spiced Rum`) so the Results table mirrors typical label casing even when OCR casing is inconsistent.
- **Warning confidence uses quality signals** — OCR warning text is scored by length and phrase coverage (`surgeon general`, `pregnancy`, `(1)/(2)`, etc.); partial/garbled blocks are still surfaced as extracted text but with confidence below auto-compare threshold so they default to manual review.
- **JSON-only** model output reduces parsing brittleness; still validated with Zod before use.
- **Primary obeys `AbortSignal`** from failover’s hard timeout so in-flight work can be cancelled.

## Dependencies

- `openai` SDK (LLM provider).
- `tesseract.js` (OCR provider).
- `@/lib/schemas` (`FieldId`).

## Related tests

- `tests/extract-failover.test.ts`
- `tests/hybrid-routing.test.ts`
- `tests/tesseract-provider.test.ts`

## Maintenance

If escalation thresholds or provider routing change, update this doc and `docs/ARCHITECTURE.md` snapshot.
