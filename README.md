# TTB Alcohol Label Verifier Prototype

AI-powered prototype for validating alcohol label fields against submitted application data.

This project is intentionally scoped as a take-home evaluation build: working core flow, clear trade-offs, and explicit compliance boundaries.

Evaluator quick path: [`docs/EVALUATOR_START_HERE.md`](docs/EVALUATOR_START_HERE.md)

## Known limitations

- Prototype scope only: not a full 27 CFR / COLA rule engine; deterministic checks live in `lib/validator.ts`.
- Distilled-spirits-first field set; wine/beer verticals deferred.
- Batch verify is **synchronous** (max 20 images per request, bounded concurrency); no background job queue yet.
- Extraction depends on hybrid OCR + vision LLM; low-confidence rows route to **manual review** (government warning can still fail when clearly inconsistent).
- Real-photo evidence is growing; see [`docs/evals/REAL_PHOTO_PACK.md`](docs/evals/REAL_PHOTO_PACK.md) and committed eval JSON under `docs/evals/`.

## Evaluator repro (local)

```bash
npm ci
npm run test:e2e:install   # first time only (Playwright Chromium)
npm test
npm run test:e2e           # browser workflow (starts dev server with VERIFY_DEV_STUB)
npm run dev                # in another terminal if not using test:e2e webServer
open http://localhost:3000
```

Set `OPENAI_API_KEY` in `.env.local` for non-stub verify runs. See [`docs/EVALUATOR_START_HERE.md`](docs/EVALUATOR_START_HERE.md).

## Project Objective

Help TTB compliance agents reduce repetitive manual matching work by:

- extracting key fields from a label image,
- comparing extracted values against application JSON, and
- returning per-field pass/fail/manual-review results quickly enough to fit agent workflow.

Target latency is approximately 5 seconds per label on average for production-style fixture runs, with tail latency explicitly tracked in committed eval artifacts.

## Assignment-Aligned Scope

The take-home instructions note that exact requirements vary by beverage type, but common label elements include:

- Brand name
- Class/type designation
- Alcohol content
- Net contents
- Name/address of bottler or producer
- Country of origin for imports
- Government Health Warning Statement

### MVP (core-first)

The MVP implements common cross-beverage fields most critical to review throughput:

- Brand name
- Class/type
- Alcohol content (ABV/proof text)
- Net contents
- Government warning
- Name/address of bottler or producer
- Country of origin for imports (conditional on application import flag)

Comparison logic is deterministic (fuzzy normalization where appropriate; government warning uses exact auto-pass with similarity triage for non-exact text).

### Vertical Rollout Strategy

After core checks are stable, implementation expands by beverage vertical in this order:

- Distilled spirits first (most complex rule shape and sample anchor)
- Wine second (higher expected review volume)
- Beer third

### High-value follow-ons

- Name/address and country-of-origin robustness polish (edge-case phrasing/format variants)
- Batch upload/reporting polish (MVP batch verify panel now available; advanced job orchestration remains future work)
- Provider confidence indicators and manual fallback toggle

## Compliance Boundaries

This prototype is decision support, not legal automation.

**Evaluator:** For a single trace of **what is (and is not) “real” regulatory source of truth**, where checks run, and how PRD maps to code, read **[`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`](docs/REQUIREMENTS_SOURCE_OF_TRUTH.md)** first.

- It does not claim full 27 CFR rule coverage.
- It prioritizes common cross-beverage checks first.
- It rolls out vertical coverage in this order: distilled spirits, then wine, then beer.
- Commodity-specific and conditional disclosures (for example age statements, additive disclosures, state-of-distillation details) are deferred unless explicitly implemented and tested.
- Ambiguous or low-confidence extractions route to manual review.
- Required application fields (brand, class, alcohol, net contents, name/address, government warning; country of origin when import) must be present — the UI blocks verify until they are filled, and the API returns **400** when they are missing (validator **`fail`** if a request still reaches comparison with blanks).

## Technical Approach

- **Primary extraction (hybrid default):** OCR-first (`tesseract.js`) for latency, with vision LLM (`gpt-4o-mini`) fallback when OCR misses critical fields or confidence is too low.
- **Last-resort fallback:** If OCR/LLM both fail, the pipeline returns an **`unavailable`** placeholder provider (typed empty fields + reasons) so responses stay schema-valid and route to **`manual_review`** in the validator.
- **Failover orchestration:** Soft timeout starts fallback **in parallel** with primary; hard timeout **aborts** primary and returns fallback (`lib/extraction/provider.ts`).
- **Validation engine:** Deterministic regex + normalized fuzzy comparison, with per-field evidence in results.
- **Image quality gate:** Rejects unreadable images with a clear resubmission message.

## OCR and Fallback (shipped vs research)

- **What ships in this repo:** hybrid extraction is implemented in runtime code. OCR (`tesseract.js`) runs first in `hybrid` mode, then escalates to OpenAI vision when OCR misses required coverage/confidence thresholds. If both OCR and LLM fail, runtime returns an `unavailable` placeholder extraction that routes fields to manual review.
- **What remains for tuning:** OCR routing thresholds and latency/correctness trade-offs are tuned using committed eval artifacts in `docs/evals/`.

## UX Principles

- Single-page, obvious upload flow
- Minimal clicks and clear statuses
- Results table designed for fast scan/review
- Error messages that tell users exactly what to fix

## Data and Security Assumptions

- Synthetic/fictitious sample labels only
- No persistent storage of uploaded label data in prototype flow
- API keys are environment variables only (never committed)
- Public prototype deployment is acceptable for this exercise; production path would move to Azure OpenAI private endpoints
- Upload and eval fixture policy uses the current TTB guidance ceiling of **1.5 MB per image**; older COLA attachment references that mention **750 KB** are treated as superseded for this prototype.

## Local development (Phase 1)

After cloning:

```bash
npm install
```

Set **`OPENAI_API_KEY`** (for example in `.env.local` at the project root). Next.js loads that file automatically in dev.

```bash
npm run dev
```

Use **`npm run dev:clean`** (`rm -rf .next && next dev`) if the dev overlay throws transient manifest/cache errors.

Then open the app URL printed by Next.js (default **http://localhost:3000**). Upload a label image and application JSON — **`POST /api/verify`** runs **image quality → hybrid extraction (OCR-first, LLM fallback) → deterministic validation**.

```bash
npm run test    # Vitest (validator, golden default-application, failover, image-quality, handler wiring)
npm run lint    # ESLint (Next core-web-vitals + TS)
npm run build   # Production build
```

Without `OPENAI_API_KEY`, the API responds with **503** and code **`OPENAI_NOT_CONFIGURED`** unless `VERIFY_DEV_STUB=true` is set in non-production.

**Extraction timeouts:** by default there is **no forced soft/hard extraction timeout**; primary extraction can run to completion. For experiments (or cheaper/faster failover), set explicit budgets in `.env` / `.env.local` (then restart dev), e.g. **`3000`** / **`3500`**:

- `VERIFY_EXTRACT_SOFT_TIMEOUT_MS`
- `VERIFY_EXTRACT_HARD_TIMEOUT_MS`

**OpenAI vision tuning (LLM-only):** you can reduce extraction latency/cost without enabling fallback OCR via:

- `OPENAI_VISION_DETAIL` (`low` default, or `auto` / `high`)
- `OPENAI_MAX_OUTPUT_TOKENS` (default `500`, accepted `200..4096`)

**Hybrid routing controls:** adjust when OCR should escalate to LLM:

- `VERIFY_EXTRACTION_MODE` (`hybrid` default, or `llm_only` / `ocr_only`)
- `VERIFY_OCR_MIN_CRITICAL_FIELDS_PRESENT` (default `3`)
- `VERIFY_OCR_MIN_MEAN_CONFIDENCE` (default `0.58`)
- `VERIFY_OCR_MIN_REQUIRED_FIELD_CONFIDENCE` (default `0.52` for class/alcohol/net)

The dev server logs **`[verify-pipeline] pipeline completed`** (`pipelineMs`, active timeouts) and **`[verify] request completed`** (`totalMs` from handler start through success).

## Evaluation Artifacts

- Canonical eval index: [`docs/evals/README.md`](docs/evals/README.md)
- Latest full production fixture run (`on_bottle` / default manifest story): [`docs/evals/fixture-correctness-production-2026-05-13.json`](docs/evals/fixture-correctness-production-2026-05-13.json)
- Focused difficult subset run: [`docs/evals/fixture-correctness-st-petersburg-production-2026-05-13.json`](docs/evals/fixture-correctness-st-petersburg-production-2026-05-13.json)
- Latest scripted synthetic fixture run (`off_bottle` / `synthetic_eval` set): [`docs/evals/fixture-correctness-synthetic-eval-full-2026-05-14.json`](docs/evals/fixture-correctness-synthetic-eval-full-2026-05-14.json)

## Deployment

- **Host:** [Railway](https://railway.app) — service builds from this repo’s `Dockerfile` (Next.js standalone).
- **Public URL:** [https://ttb-alcohol-label-verifier-production.up.railway.app](https://ttb-alcohol-label-verifier-production.up.railway.app)
- **Deploy flow:** push to the connected branch (typically `main`); Railway rebuilds and redeploys automatically.
- **Required service variable:** `OPENAI_API_KEY` — without it, `POST /api/verify` returns 503 (see `lib/verify-handler.ts`).
- **Request budget:** Railway terminates requests at ~**300s** (HTTP **499** if the client/proxy closes first). Hybrid mode defaults to **90s OCR cap** plus **8s / 20s** LLM soft/hard failover — override via `VERIFY_OCR_TIMEOUT_MS`, `VERIFY_EXTRACT_SOFT_TIMEOUT_MS`, `VERIFY_EXTRACT_HARD_TIMEOUT_MS` if needed.
- **Production evals:** `npm run eval:fixture-verify:prod` defaults `BASE_URL` to the Railway URL above; override with `BASE_URL=...` when testing another environment. Run `EVAL_FIXTURE_SET=synthetic_eval` (20 fixtures) serially; expect several minutes total, not one long request.
- **Container details:** [`docs/modules/dockerfile.md`](docs/modules/dockerfile.md)

## Repository Deliverables

- Source code for UI, API, extraction, and validation
- Public deployment URL for evaluator testing
- Tests for core validator logic and timeout behavior
- Documentation of design decisions, assumptions, and known limitations

## Sources and Regulatory Mapping

Regulatory references used for framing are documented in project docs and should be treated as source material for prototype checks, not as exhaustive legal implementation.

- `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` — scope boundaries and field-to-rule traceability.
- `docs/ARCHITECTURE.md` — system flow and module boundaries.
- `docs/CORE_REQUIREMENTS_SCORECARD.md` — rubric-aligned status with evidence links.
- `docs/evals/README.md` — entry point for committed correctness and latency artifacts.

