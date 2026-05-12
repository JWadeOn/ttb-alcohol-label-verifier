# Comprehensive Implementation Plan (canonical)

**Project:** AI-powered TTB alcohol label verification prototype (distilled spirits first)  
**Purpose:** One **final, complete** plan: product intent, scope, architecture, phases, execution status, evals, acceptance, remaining work, and where every detail lives.  
**Audience:** Builders, reviewers, and future you.

**Last updated:** 2026-05-12

---

## How to use this document

| If you need… | Read first… | Then… |
|--------------|---------------|--------|
| **What shipped and what is next** | [`docs/PROGRESS.md`](./PROGRESS.md) | This doc §8–9 |
| **HTTP contracts, schemas, F-* mapping** | [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) | `lib/schemas.ts`, `lib/verify-handler.ts` |
| **Evaluator: regulatory vs product truth** | [`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`](./REQUIREMENTS_SOURCE_OF_TRUTH.md) | [`docs/CORE_REQUIREMENTS_SCORECARD.md`](./CORE_REQUIREMENTS_SCORECARD.md) |
| **System flow and modules** | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) | [`docs/modules/README.md`](./modules/README.md) |
| **Day-by-day runbooks** | [`docs/WEEK_EXECUTION_OVERVIEW.md`](./WEEK_EXECUTION_OVERVIEW.md) | `DAY1`–`DAY3` checklists + completion records |
| **Deploy** | [`README.md`](../README.md) | [`docs/RENDER_DEPLOY.md`](./RENDER_DEPLOY.md) (alternate host) |
| **Eval artifacts** | [`docs/evals/README.md`](./evals/README.md) | [`docs/evals/PRIMARY_LATENCY_RUNS.md`](./evals/PRIMARY_LATENCY_RUNS.md) |

This file **does not replace** deep specs in `IMPLEMENTATION_PLAN.md`; it **binds them together** and records **as-built** vs **planned** where they differ.

---

## 1. Product definition (what we are building)

**In one sentence:** A standalone web prototype where a reviewer uploads **label artwork** plus **application JSON**, the server runs **image quality → vision extraction (OpenAI) → deterministic validation**, and the UI shows **per-field pass / fail / manual_review / not_applicable** with enough context to support a human decision.

**Explicit non-goals (prototype):**

- Not COLA integration, not full 27 CFR automation, not legal sign-off as “compliant.”
- No persistence of uploads, outcomes, or footer **Approve / Reject** (browser-only disposition).
- Wine/beer rule matrices deferred after distilled-spirits slice (see [`docs/PRD.md`](./PRD.md)).

Stakeholder-aligned priorities (take-home narrative): **~5s perceived usefulness**, **obvious UX**, **routine field matching**, **strict government-warning handling when comparing to submitted text**, **safe handling of bad images and ambiguous OCR** via `manual_review` and image gate.

---

## 2. Scope lock (vertical, fields, out-of-scope)

Aligned with [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §1 and [`docs/PRD.md`](./PRD.md):

| Dimension | Decision |
|-----------|----------|
| **Beverage vertical** | Distilled spirits first; wine second; beer third. |
| **MVP comparison fields** | Brand, class/type, alcohol content, net contents, government warning (vs application JSON). |
| **P1 fields** | Name/address, country of origin (import conditional + `not_applicable`). |
| **Deferred / not built** | Batch upload workflow (F-14); in-app Tesseract OCR path (policy in [`docs/POC1_FALLBACK.md`](./POC1_FALLBACK.md)); `force_fallback` / `USE_LOCAL_OCR` routing as described in older plan text — **not** wired unless added later. |

---

## 3. As-built technical summary

### 3.1 Runtime pipeline

1. **`POST /api/verify`** (`multipart/form-data`: `image`, `application` JSON string).  
2. **`lib/verify-handler.ts`** — auth / dev stub / disabled key gates; delegates to pipeline.  
3. **`lib/verify-pipeline.ts`** — `assessImageQuality` → `extractWithFailover` (OpenAI primary + `unavailable` placeholder fallback) → `validateLabelFields` → typed success body.  
4. **`app/page.tsx`** — workbench UI, results, expandable guidance, non-persisted disposition controls.

**Architecture diagram and module index:** [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).

### 3.2 Extraction timeouts (as-shipped vs older plan text)

| Source | Soft / hard (ms) | Notes |
|--------|------------------|--------|
| **Shipped defaults** (`lib/verify-pipeline.ts`, `lib/extraction/provider.ts`) | **8000 / 20000** | Chosen so typical `gpt-4o-mini` vision completes on Railway without falling through to `unavailable` on common fixtures. |
| **Environment override** | `VERIFY_EXTRACT_SOFT_TIMEOUT_MS`, `VERIFY_EXTRACT_HARD_TIMEOUT_MS` | See [`README.md`](../README.md), [`.env.example`](../.env.example). |
| **Older narrative** in `IMPLEMENTATION_PLAN.md` §2.3 / F-5 | 3000 / 3500 | **Historical PRD only** — §2.3 now lists **8000 / 20000** as authoritative (2026-05-12 doc sync). |

### 3.3 Fallback OCR

- **Implemented:** timeout orchestration + **`unavailable`** placeholder provider (Phase 1 honesty path).  
- **Not implemented:** Tesseract provider; POC-1 **go/no-go not run** on real OCR (no OCR in container).  
- **Policy / thresholds / prototype defer:** [`docs/POC1_FALLBACK.md`](./POC1_FALLBACK.md) (formal **defer** for this deliverable, 2026-05-12).

### 3.4 Deployment

- **Primary public URL (Railway):** [https://ttb-alcohol-label-verifier-production.up.railway.app](https://ttb-alcohol-label-verifier-production.up.railway.app)  
- **Build:** root `Dockerfile` (Next standalone).  
- **Alternate host:** [`docs/RENDER_DEPLOY.md`](./RENDER_DEPLOY.md).  
- **Secrets:** `OPENAI_API_KEY` on platform; never in git.

---

## 4. Phases and exit gates (plan vs actual)

| Phase | Plan intent | Actual status (2026-05-12) | Evidence |
|-------|-------------|----------------------------|----------|
| **Phase 0** | Thin vertical, contracts, baseline tests | **Done** | Day 1 completion record, handler + schema tests |
| **Phase 1** | OpenAI extraction + validator + failover shell | **Done** | `lib/extraction/*`, `lib/validator.ts`, `lib/verify-pipeline.ts`, Day 2 completion record |
| **Phase 2** | Tesseract fallback + full failover productization | **Deferred (prototype)** | Failover **framework** + **`unavailable`** placeholder; Tesseract **not** in app — formal decision + reopen criteria: **[`POC1_FALLBACK.md`](./POC1_FALLBACK.md)** (2026-05-12). |
| **Phase 3** | Evals, deploy, docs, reviewer-ready | **Near complete (prototype)** | Railway + latency timeline + scored fixture-verify + thresholds doc + **§16 signed**; optional Day 3 UX polish + broader real-photo fixtures remain non-blocking. |

---

## 5. PRD F-* requirement map (condensed)

Full table: [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §5. Snapshot:

| ID | Topic | Status |
|----|--------|--------|
| F-1–F-3, F-6–F-13 | Core path: API, extraction, validator, image quality, UI, deploy, README | **Done** (within prototype scope) |
| F-4, F-16 | Tesseract fallback + env toggle to force local OCR | **Deferred** (policy + thresholds in [`POC1_FALLBACK.md`](./POC1_FALLBACK.md); not wired) |
| F-5 | Soft/hard failover | **Done** (values: see §3.2) |
| F-14 | Batch UI / batch route | **Out of scope** (single-label prototype — see §2 scope lock) |
| F-15 | Confidence surfaced prominently | **Partial** (fields carry confidence; polish optional) |
| F-17, F-18 | P1 fields + import semantics | **Done** with `manual_review` / `not_applicable` paths |

---

## 6. Workstreams (lanes)

From [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §8:

| WS | Scope | Owner docs |
|----|--------|------------|
| WS-A | API routes, multipart, errors | [`docs/modules/verify-handler.md`](./modules/verify-handler.md) |
| WS-B | Providers + failover | [`docs/modules/extraction.md`](./modules/extraction.md), [`verify-pipeline.md`](./modules/verify-pipeline.md) |
| WS-C | Validator + unit tests | [`docs/modules/validator.md`](./modules/validator.md) |
| WS-D | UI | [`docs/modules/app-page.md`](./modules/app-page.md) |
| WS-E | Fixtures + eval scripts | [`fixtures/README.md`](../fixtures/README.md), [`docs/evals/README.md`](./evals/README.md) |
| WS-F | Docker + deploy | [`README.md`](../README.md), [`docs/modules/dockerfile.md`](./modules/dockerfile.md) |

---

## 7. Evaluation and correctness strategy

### 7.1 What is automated today (CI)

- **`npm run test`** — validator golden path vs `fixtures/default-application.json`, validator edge cases, failover mocks, handler wiring, image-quality smoke on synthetic PNG, fixture manifest file presence.  
- **`npm run lint`**, **`npm run build`** — quality gates.

**Limitation:** CI does **not** prove OpenAI reads real bottles correctly; it proves **rules and plumbing**.

### 7.2 What is manual / on-demand (live API + key)

| Script | Purpose |
|--------|---------|
| `npm run eval:primary-latency` | Latency + `extraction.provider` for `includeInPrimaryLatencyEval` fixtures |
| `npm run eval:primary-latency:bench` | Same with iterations + P95-style stats |
| `npm run eval:fixture-verify` | Full `POST /api/verify` for selected manifest ids; optional `EVAL_OUT` for committed logs; supports `EVAL_FIXTURE_SET` presets (`st_petersburg`, `edge_synthetic`, `seed_textures`, `all_manifest`) to run full suites without manual id lists |

**Timeline:** [`docs/evals/PRIMARY_LATENCY_RUNS.md`](./evals/PRIMARY_LATENCY_RUNS.md).

### 7.3 Planned eval depth (gap closure)

From [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §10 and [`docs/CORE_REQUIREMENTS_SCORECARD.md`](./CORE_REQUIREMENTS_SCORECARD.md):

- **Shipped (2026-05-12):** scored **`eval:fixture-verify`** + `docs/evals/fixture-correctness-expectations.json` + [`CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) + committed artifacts (happy, difficult, seeds, synthetic glare/blur/tilt) plus **St. Petersburg Track A real-photo suite** (whiskey + vodka baseline/angle/glare/blur/low-light/crop taxonomy).  
- **Still open:** expand **Track B** alternate-label-stock set (dark/kraft contrast variants), and keep **latency P95** bench rows current as deploy/model changes.

---

## 8. Execution checklist alignment (Day 1–3)

| Track | Doc | Status |
|-------|-----|--------|
| Day 1 | [`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md) | **Closed** |
| Day 2 | [`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md) | **Closed** |
| Day 3 runbook | [`DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md) | **In progress** — eval depth, fallback decision, UX polish, final stabilization |
| Living index | [`PROGRESS.md`](./PROGRESS.md) | Day 3 rows **Partial** / **Not started** where applicable |

Day 3 optional follow-ups from Day 2 record still apply (mocked OpenAI SDK tests, soft-parallel assertion, client error UX pass, committed full fixture matrix) — see [`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md).

---

## 9. Remaining work plan (ordered)

This is the **implementation backlog** for optional depth after **§16 sign-off (2026-05-12)** in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md):

1. ~~**Correctness evidence**~~ — **Done:** scored `eval:fixture-verify` + expectations + committed artifacts under `docs/evals/`.  
2. ~~**Explicit thresholds doc**~~ — **Done:** [`docs/evals/CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) + `fixture-correctness-expectations.json`.  
3. **Day 3 UX polish** — image-quality reject copy, provider/`manual_review` clarity, client error shapes ([`DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md) §5:00–6:00).  
4. **Track B fixture depth** — **B1** `st_petersburg_whiskey_label_dark_baseline` shipped; remaining alternate label-stock variants (`label_dark_glare`, `label_kraft`, optional vodka dark) for contrast/segmentation coverage (see [`docs/fixtures/st-petersburg-golden-next.md`](./fixtures/st-petersburg-golden-next.md)).  
5. ~~**Fallback decision**~~ — **Done (2026-05-12):** Tesseract / local OCR **deferred**; [`docs/POC1_FALLBACK.md`](./POC1_FALLBACK.md).  
6. ~~**Batch uploads**~~ — **Out of scope** for this deliverable (single-label prototype); see scope lock §2 + `IMPLEMENTATION_PLAN.md` §5 F-14.  
7. ~~**Acceptance sign-off**~~ — **Done (2026-05-12):** `IMPLEMENTATION_PLAN.md` §16 all items checked with evidence.  
8. ~~**Doc drift cleanup**~~ — **Done (2026-05-12)** for §2.3/F-5 timeout narrative.

---

## 10. Final acceptance checklist (deliverable)

Mirror of [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §16 with **current honesty**:

- [x] **Contracts unambiguous** — engineer can implement from `IMPLEMENTATION_PLAN` §3 + `lib/schemas.ts` without reopening PRD for status enums; unwired multipart keys documented in §3.1.  
- [x] **F-* ownership mapped** — §5 table + module docs; **F-4 / F-16** deferred (Phase 2, [`POC1_FALLBACK.md`](./POC1_FALLBACK.md)); **F-14** out of prototype scope (single-label workbench, §5 row).  
- [x] **Eval methods + thresholds explicit and measured** — latency timeline + scored fixture artifacts + [`CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) + `fixture-correctness-expectations.json` (`docs/evals/`).  
- [x] **Manual-review paths** — validator + UI; per-field in [`REQUIREMENTS_SOURCE_OF_TRUTH.md`](./REQUIREMENTS_SOURCE_OF_TRUTH.md).  
- [x] **Deployment** — Railway live URL + README; Render runbook alternate.  
- [x] **Fallback policy consistent** — Phase 1 ships **`unavailable`** placeholder only; Tesseract **deferred** with logged criteria in [`POC1_FALLBACK.md`](./POC1_FALLBACK.md); README + `IMPLEMENTATION_PLAN.md` §2.2–§2.3 aligned (2026-05-12).

---

## 11. Governance and hygiene

- **Agent rules:** [`AGENTS.md`](../AGENTS.md) — small commits, green tests, update `docs/modules/*.md` + `ARCHITECTURE.md` / `PROGRESS.md` when behavior shifts.  
- **Design principles:** [`docs/SOFTWARE_DESIGN_PRINCIPLES.md`](./SOFTWARE_DESIGN_PRINCIPLES.md), [`docs/REPOSITORY_HYGIENE.md`](./REPOSITORY_HYGIENE.md).  
- **Take-home rubric snapshot:** [`docs/CORE_REQUIREMENTS_SCORECARD.md`](./CORE_REQUIREMENTS_SCORECARD.md).

---

## 12. Changelog (this master plan)

| Date | Change |
|------|--------|
| 2026-05-12 | Eval ergonomics + fixture depth sync: `eval:fixture-verify` now supports `EVAL_FIXTURE_SET` presets; §7.3/§9 updated to reflect **St. Petersburg Track A** shipped and **Track B** as the remaining optional fixture expansion. |
| 2026-05-12 | **`IMPLEMENTATION_PLAN.md` §16** acceptance signed (all items checked + §10.6 eval evidence); **`docs/CORE_REQUIREMENTS_SCORECARD.md`** + §9 backlog updated; F-14 marked out of scope in §5. |
| 2026-05-12 | Initial **Comprehensive Implementation Plan** — consolidates IMPLEMENTATION_PLAN, ARCHITECTURE, week/day execution, evals, scorecard, and as-built timeouts/deploy. |

---

*End of comprehensive implementation plan.*
