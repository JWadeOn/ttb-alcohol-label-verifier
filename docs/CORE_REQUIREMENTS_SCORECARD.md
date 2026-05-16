# Core Requirements Scorecard (take-home alignment)

Evaluator-facing snapshot of **correctness** and **completeness** for the AI-powered TTB alcohol label verifier prototype.

This maps directly to the take-home rubric and stakeholder interview expectations (speed, usable UX, routine field matching, strict warning handling, image adversity).

**Last updated:** 2026-05-15

---

## How to read this

- **Done** = implemented and evidenced in code/tests/docs.
- **Partial** = core capability exists, but evidence depth or edge coverage is still open.
- **Not started** = no meaningful implementation yet.
- **Out of scope** = intentionally excluded for this prototype deliverable.
- **Deferred** = explicitly postponed and documented.

Prototype scope still applies: this is a standalone POC, not a full COLA integration and not a complete 27 CFR rule engine (see `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`).

---

## Scorecard

| Requirement (take-home / stakeholder intent) | Status | What we have now | Evidence | Gap to close next |
|---|---|---|---|---|
| **Core field comparison workflow works end-to-end** (brand, class/type, ABV, net contents, warning, name/address, country for imports) | **Done** | `POST /api/verify` pipeline: image quality -> extraction -> deterministic validation -> typed response rendered in UI; mandatory application values enforced in UI + API (`lib/application-compliance.ts`) and L1 fixture `synthetic_eval_vodka_import_missing_name_address` | `lib/verify-handler.ts`, `lib/verify-pipeline.ts`, `lib/validator.ts`, `lib/application-compliance.ts`, `app/page.tsx`, `tests/verify-handler.test.ts`, `tests/application-compliance.test.ts` | Keep traceability updated when field logic changes |
| **Deterministic validation correctness** (rules over extracted/application values) | **Done** | Strong unit coverage for statuses (`pass`/`fail`/`manual_review`/`not_applicable`), thresholds, parsing, government-warning triage (exact pass / near manual_review / material fail) | `tests/validator.test.ts`, `tests/golden-default-application.test.ts`, `docs/modules/validator.md` | Add a few more explicit test vectors for stakeholder examples (e.g., punctuation/case brand tolerance notes) |
| **Warning statement strictness** (Jenny: exact wording sensitivity) | **Done** | Exact text auto-passes; near matches → `manual_review`; material mismatches → `fail` (see decision table in `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`) | `lib/validator.ts`, `tests/golden-default-application.test.ts`, `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` | Strictness is product behavior for prototype, not full legal implementation |
| **Judgment-safe behavior for ambiguous OCR** (Dave: nuance) | **Done** | Manual-review pathway is first-class; low-confidence and uncertain outputs can avoid false pass/fail certainty | `lib/validator.ts`, `lib/schemas.ts`, UI in `app/page.tsx` | Add richer image fixtures to prove manual-review behavior on real difficult images |
| **Latency practical for agent workflow** (Sarah: ~5s target pressure) | **Done** | Production eval harness + committed snapshots; explicit correctness thresholds doc; latest full production fixture run records per-fixture and summary latency | `evals/run-fixture-verify.mjs`, `docs/evals/fixture-correctness-production-2026-05-13.json`, `docs/evals/PRIMARY_LATENCY_RUNS.md`, [`docs/evals/CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) | Optional: scheduled P95 bench runs as model/deploy drift |
| **Usable UX for mixed tech comfort** ("my mother could use it") | **Partial** | Results-first flow, obvious actions, expandable guidance, improved review controls, clearer API error and run-metadata copy | `app/page.tsx`, `lib/verify-error-messages.ts`, `docs/modules/app-page.md` | Lightweight usability pass on remaining edge cases |
| **Handles non-ideal images** (glare, angle, blur) | **Partial** | Image-quality gate, difficult stress fixture set, and targeted difficult-label production eval evidence | `lib/image-quality.ts`, `fixtures/labels/`, `docs/evals/fixture-correctness-st-petersburg-production-2026-05-13.json`, [`docs/evals/CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) | Add more **real-photo** edge cases beyond synthetic derivatives |
| **Programmatic eval + logged evidence over time** | **Done** | Tiered suite (L0/L1/L2) with stakeholder coverage matrix (obvious pass/fail, tricky pass, manual_review, routing); L1 blocks on correctness thresholds; drift validation against `suite-plan.json` | [`docs/evals/suite-plan.json`](./evals/suite-plan.json), [`docs/evals/README.md`](./evals/README.md), `npm run eval:l1`, `npm run eval:validate-suite-plan`, `evals/run-suite-tier.mjs` | Optional: correctness timeline index (mirror latency table style) |
| **Error handling and fail-safe behavior** | **Done** | Typed error codes, timeout failover path, disabled/missing key behavior, structured logs | `lib/verify-handler.ts`, `lib/extraction/provider.ts`, `tests/verify-handler.test.ts`, `README.md` | Add evaluator-facing "known failure modes" checklist in one place |
| **Code quality / organization for scope** | **Done** | Thin route, deep modules, test coverage on deterministic core, documented architecture/modules | `docs/ARCHITECTURE.md`, `docs/modules/*.md`, `tests/*`, `AGENTS.md` | Continue small focused increments; keep docs synchronized with behavior changes |
| **Creative but scoped problem-solving** (prototype discipline) | **Done** | Standalone deploy, no premature COLA integration, and explicit prototype boundaries | `README.md`, `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` | Optional polish only |
| **Batch uploads during peak seasons** (Sarah request) | **Partial** | MVP batch flow is implemented (`/api/verify/batch`) with multi-image upload, per-item outcomes, and bounded server concurrency; no persistent jobs/queue yet | `app/api/verify/batch/route.ts`, `lib/verify-handler.ts`, `app/page.tsx`, `tests/verify-handler.test.ts` | Add queued/background jobs + resume/polling for larger operational batches |
| **In-app OCR fallback (Tesseract) go/no-go implemented** | **Done** | Hybrid OCR-first extraction is implemented (`tesseract.js`) with LLM escalation and placeholder-only last-resort fallback if both providers fail | `lib/extraction/tesseract-provider.ts`, `lib/extraction/hybrid-routing.ts`, `lib/verify-pipeline.ts`, `lib/extraction/unavailable-fallback-provider.ts`, `docs/modules/extraction.md` | Continue tuning OCR routing thresholds against production evals |

---

## Executive gap summary

1. **Strongest area:** deterministic validation correctness and API/workflow reliability.
2. **Main evidence gap:** extraction proof on a **broader real-photo** set (synthetic + difficult label covered; more SKUs/conditions optional).
3. **Main product gap:** usability/error-polish validation for low-tech operator workflows.
4. **Main roadmap gap:** batch is currently an **MVP synchronous flow** (no queued/background job lifecycle yet), while OCR fallback is shipped and now in tuning/coverage-expansion phase.

---

## Optional next improvements

1. Add more **real-photo** categorized fixtures (beyond synthetic edge derivatives) for broader extraction proof.
2. Add a correctness timeline index to mirror `PRIMARY_LATENCY_RUNS.md`.
3. Extend eval logging with richer per-field deltas for future fixtures.

---

## Reviewer demo walkthrough (2 minutes)

Use this sequence when presenting to evaluators:

1. **Anchor scope and intent (20s)**  
   Open `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` and state what this prototype does and does not claim (POC, no full COLA/27 CFR engine).

2. **Show deterministic correctness (35s)**  
   Point to `lib/validator.ts` + `tests/validator.test.ts` + `tests/golden-default-application.test.ts` as the primary correctness backbone.

3. **Show live end-to-end behavior (35s)**  
   Open app at deployed URL, run one verify, and highlight extraction provider, per-field statuses, and manual-review behavior.

4. **Show measured operational evidence (20s)**  
   Open `docs/evals/PRIMARY_LATENCY_RUNS.md` and latest production artifact for concrete latency/provider outcomes.

5. **Close with explicit gaps and next actions (10s)**  
   Use the **Partial/Not started** rows in this scorecard (image matrix depth, OCR fallback, batch upload) to show disciplined scope handling.
