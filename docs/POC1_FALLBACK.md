# POC-1: Fallback OCR go/no-go (status and thresholds)

## Current implementation status (Day 1 closeout)

- **Tesseract (or other OCR) fallback is not wired** in the application yet. The extraction layer uses an **`unavailable`** placeholder after primary timeout/failure (`docs/modules/extraction.md`).
- **Primary-path latency** can still be measured today using `npm run eval:primary-latency` against a running server (see `evals/run-primary-latency.mjs`). Fixtures and manifest live under **`fixtures/`**.

This document records **locked thresholds from research** so POC-1 can be executed when OCR lands, without reopening PRD for numbers.

## Thresholds (from `docs/PRESEARCH.md` / PRD framing)

| Metric | Target (recalled for POC-1) | Notes |
|--------|-------------------------------|--------|
| Fallback inference latency | **~≤1.5s P95** (after hard timeout budget context) | Measured on a set of **≥10** representative labels once Tesseract runs in-container. |
| Structured-field coverage (fallback) | **≥80%** field-level accuracy on warning / ABV / net contents | Regex over concatenated OCR text; brand/class remain manual on fallback per product intent. |
| Docker / host | Image size and build time within **Render free-tier** practical limits | Slim base image, multi-stage build; validate with `docker build`. |

## Measurement inputs / outputs (contract)

**Inputs**

- Container image with Node + app + **Tesseract packages** (when implemented).
- Fixture set (manifest-driven) of label PNGs.
- Frozen `fixtures/default-application.json` or per-fixture overrides if added later.

**Outputs (suggested JSON summary)**

- Per-fixture: `durationMs`, `fieldsExtracted`, `warningAbvNetMatchRate`, `errors`.
- Aggregate: `p95LatencyMs`, `meanStructuredFieldAccuracy`, `go` / `no-go` recommendation.

## First measurement

- **Primary path:** run `eval:primary-latency` with `OPENAI_API_KEY` and `BASE_URL` (documented in README). A **single captured dev observation** (timings + provider) is recorded in **[`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md)** (Day 1 sign-off).
- **Fallback OCR path:** *deferred* — run the same shape of harness once `tesseract-provider` (or chosen path) exists; record results here or in `docs/PROGRESS.md`.

## Decision log

| Date | Outcome |
|------|---------|
| 2026-05-11 | OCR POC **not run** in code (no Tesseract). Thresholds **recorded**; primary latency **scaffold** added for evidence collection. |
| 2026-05-11 | **Day 1 closed:** primary-path **first data point** (single dev request, ~6.0s extraction, `openai` provider) + **documented blocker** for OCR metrics → [`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md). |
