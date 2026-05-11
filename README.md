# TTB Alcohol Label Verifier Prototype

AI-powered prototype for validating alcohol label fields against submitted application data.

This project is intentionally scoped as a take-home evaluation build: working core flow, clear trade-offs, and explicit compliance boundaries.

## Project Objective

Help TTB compliance agents reduce repetitive manual matching work by:

- extracting key fields from a label image,
- comparing extracted values against application JSON, and
- returning per-field pass/fail/manual-review results quickly enough to fit agent workflow.

Target latency is sub-5-second P95 per label, including failover conditions.

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

The MVP prioritizes common cross-beverage fields most critical to review throughput:

- Brand name
- Class/type
- Alcohol content (ABV/proof text)
- Net contents
- Government warning

Comparison logic is deterministic (fuzzy normalization where appropriate, strict matching where required).

### Vertical Rollout Strategy

After core checks are stable, implementation expands by beverage vertical in this order:

- Distilled spirits first (most complex rule shape and sample anchor)
- Wine second (higher expected review volume)
- Beer third

### High-value follow-ons

- Name/address extraction and comparison
- Country of origin extraction and conditional validation for imports
- Batch upload/reporting polish
- Provider confidence indicators and manual fallback toggle

## Compliance Boundaries

This prototype is decision support, not legal automation.

- It does not claim full 27 CFR rule coverage.
- It prioritizes common cross-beverage checks first.
- It rolls out vertical coverage in this order: distilled spirits, then wine, then beer.
- Commodity-specific and conditional disclosures (for example age statements, additive disclosures, state-of-distillation details) are deferred unless explicitly implemented and tested.
- Ambiguous or low-confidence extractions route to manual review.

## Technical Approach

- **Primary extraction:** Vision LLM (`gpt-4o-mini`) with structured JSON output.
- **Fallback extraction:** Local OCR path (`tesseract.js`) for resilience and network-restricted environments.
- **Failover orchestration:** Soft timeout starts fallback in parallel; hard timeout cancels primary and returns fallback.
- **Validation engine:** Deterministic regex + normalized fuzzy comparison, with per-field evidence in results.
- **Image quality gate:** Rejects unreadable images with a clear resubmission message.

## Fallback OCR Decision Policy

- Default fallback is **Tesseract-first** to keep the prototype Node-native and simple.
- A go/no-go POC runs early in implementation.
- Keep Tesseract only if both are true:
  - fallback OCR latency stays within target budget on fixtures,
  - structured-field fallback extraction (warning/ABV/net contents) meets minimum coverage threshold.
- If thresholds are missed, pivot behind the same provider interface:
  1. worker-thread and Node-native OCR tuning,
  2. ONNX-based OCR path,
  3. PaddleOCR sidecar/service as a final fallback option.

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

## Local development (Phase 1)

After cloning:

```bash
npm install
```

Set **`OPENAI_API_KEY`** (for example in `.env.local` at the project root). Next.js loads that file automatically in dev.

```bash
npm run dev
```

Then open the app URL printed by Next.js (default **http://localhost:3000**). Upload a label image and application JSON — **`POST /api/verify`** runs **image quality → OpenAI vision extraction (`gpt-4o-mini`) → deterministic validation**. If the primary path errors after retries, an **`unavailable`** fallback placeholder is returned until Phase 2 wires Tesseract.

```bash
npm run test    # Vitest (validator, failover, image-quality, handler wiring)
npm run lint    # ESLint (Next core-web-vitals + TS)
npm run build   # Production build
```

Without `OPENAI_API_KEY`, the API responds with **503** and code **`OPENAI_NOT_CONFIGURED`**.

### Dev server issues (500 / ENOENT under `.next`)

If you see **`ENOENT`** for `app-build-manifest.json`, **`_buildManifest.js.tmp.*`**, or flaky **500**s right after HMR:

1. Stop **all** `next dev` processes (only one instance should own the project directory).
2. Delete the cache and restart:

   ```bash
   rm -rf .next && npm run dev
   ```

3. Default **`npm run dev`** uses the **Webpack** dev server (most stable here). To try **Turbopack** instead: `npm run dev:turbo` — if it misbehaves, fall back to `npm run dev`.

### Fixtures and eval scaffold (Day 1)

- **`fixtures/manifest.json`** — catalog of label PNGs under `fixtures/labels/` (synthetic reference + deterministic noise seeds).
- **Regenerate noise PNGs** (optional, after editing `scripts/generate-fixture-pngs.mjs`): `npm run fixtures:generate`
- **Primary-path latency eval** (calls OpenAI; requires running app + key): start `npm run dev` in another terminal, then  
  `OPENAI_API_KEY=... npm run eval:primary-latency`  
  (override base URL with `BASE_URL=http://127.0.0.1:3000`). Without `OPENAI_API_KEY`, the script exits 0 and prints a skip JSON line (CI-safe scaffold).
- **Docker production image:** `npm run docker:build` then run as in `docs/modules/dockerfile.md`. POC-1 OCR thresholds and measurement contract are documented in **`docs/POC1_FALLBACK.md`** (OCR path still deferred in code).

## Deployment Decision

- Default deployment target: **Render** using the project Dockerfile.
- Fallback targets if blocked by platform limits: **Fly.io** or **Hugging Face Spaces (Docker mode)**.
- Deployment objective: stable public HTTPS URL for evaluator testing with `OPENAI_API_KEY` managed as a platform secret.

## Repository Deliverables

- Source code for UI, API, extraction, and validation
- Public deployment URL for evaluator testing
- Tests for core validator logic and timeout behavior
- Documentation of design decisions, assumptions, and known limitations

## Sources and Regulatory Mapping

Regulatory references used for framing are documented in project docs and should be treated as source material for prototype checks, not as exhaustive legal implementation.

- `docs/PROGRESS.md` — **living** short status: done recently, next steps, blockers (update as you ship)
- `docs/ARCHITECTURE.md` — **living** system overview (data flow, phase snapshot, links to module docs)
- `docs/modules/README.md` — index of **per-module** living docs (`docs/modules/*.md`: responsibilities, decisions, tests for each unit)
- `docs/PRD.md`
- `docs/PRESEARCH.md`
- `docs/IMPLEMENTATION_PLAN.md` — technical contracts, phases, evals, and PRD traceability for implementation
- `docs/POC1_FALLBACK.md` — OCR fallback go/no-go thresholds and measurement contract (OCR still deferred in code)

