# Core Requirements Scorecard (take-home alignment)

Evaluator-facing snapshot of **correctness** and **completeness** for the AI-powered TTB alcohol label verifier prototype.

**Canonical full plan:** [`docs/COMPREHENSIVE_IMPLEMENTATION_PLAN.md`](./COMPREHENSIVE_IMPLEMENTATION_PLAN.md) — this scorecard is the rubric-aligned slice; the comprehensive plan merges execution, phases, and backlog.

This maps directly to the take-home rubric and stakeholder interview expectations (speed, usable UX, routine field matching, strict warning handling, image adversity).

**Last updated:** 2026-05-12

---

## How to read this

- **Done** = implemented and evidenced in code/tests/docs.
- **Partial** = core capability exists, but evidence depth or edge coverage is still open.
- **Not started** = no meaningful implementation yet.
- **Out of scope** = intentionally excluded for this prototype deliverable (documented in plan docs).
- **Deferred** = policy/thresholds or interface reserved; implementation explicitly postponed (e.g. Phase 2 OCR).

Prototype scope still applies: this is a standalone POC, not a full COLA integration and not a complete 27 CFR rule engine (see `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`).

---

## Scorecard

| Requirement (take-home / stakeholder intent) | Status | What we have now | Evidence | Gap to close next |
|---|---|---|---|---|
| **Core field comparison workflow works end-to-end** (brand, class/type, ABV, net contents, warning, name/address, country for imports) | **Done** | `POST /api/verify` pipeline: image quality -> extraction -> deterministic validation -> typed response rendered in UI | `lib/verify-handler.ts`, `lib/verify-pipeline.ts`, `lib/validator.ts`, `app/page.tsx`, `tests/verify-handler.test.ts` | Keep traceability updated when field logic changes |
| **Deterministic validation correctness** (rules over extracted/application values) | **Done** | Strong unit coverage for statuses (`pass`/`fail`/`manual_review`/`not_applicable`), thresholds, parsing, strict warning behavior | `tests/validator.test.ts`, `tests/golden-default-application.test.ts`, `docs/modules/validator.md` | Add a few more explicit test vectors for stakeholder examples (e.g., punctuation/case brand tolerance notes) |
| **Warning statement strictness** (Jenny: exact wording sensitivity) | **Done** | Warning comparison is strict against application value; mismatch fails | `lib/validator.ts`, `tests/golden-default-application.test.ts`, `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` | Clarify in evaluator notes that strictness is product behavior for prototype, not full legal implementation |
| **Judgment-safe behavior for ambiguous OCR** (Dave: nuance) | **Done** | Manual-review pathway is first-class; low-confidence and uncertain outputs can avoid false pass/fail certainty | `lib/validator.ts`, `lib/schemas.ts`, UI in `app/page.tsx` | Add richer image fixtures to prove manual-review behavior on real difficult images |
| **Latency practical for agent workflow** (Sarah: ~5s target pressure) | **Done** | Production eval harness + committed snapshots; explicit correctness thresholds doc; latest primary-latency run **200** + `openai` on three fixtures (~3.5–6.5s round-trip) | `evals/run-primary-latency.mjs`, `docs/evals/PRIMARY_LATENCY_RUNS.md`, `docs/evals/primary-latency-production-2026-05-12.json`, [`docs/evals/CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) | Optional: scheduled P95 bench runs as model/deploy drift |
| **Usable UX for mixed tech comfort** ("my mother could use it") | **Partial** | Results-first flow, obvious actions, expandable guidance, improved review controls | `app/page.tsx`, `docs/modules/app-page.md`, `docs/PROGRESS.md` | Run a lightweight task-based usability pass and tighten edge-error copy/messages |
| **Handles non-ideal images** (glare, angle, blur) | **Partial** | Image-quality gate; difficult stress fixture; synthetic glare/blur/tilt derivatives + scored `eval:fixture-verify` | `lib/image-quality.ts`, `fixtures/labels/`, `docs/evals/fixture-correctness-non-seed-edge-2026-05-12.json`, [`docs/evals/CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) | Add more **real-photo** edge cases beyond synthetic derivatives |
| **Programmatic eval + logged evidence over time** | **Done** | Append-only latency timeline + dated artifacts; scored fixture correctness JSON + expectations profile | `docs/evals/PRIMARY_LATENCY_RUNS.md`, `docs/evals/README.md`, `docs/evals/fixture-correctness-*.json`, `evals/run-fixture-verify.mjs` | Optional: correctness timeline index (mirror latency table style) |
| **Error handling and fail-safe behavior** | **Done** | Typed error codes, timeout failover path, disabled/missing key behavior, structured logs | `lib/verify-handler.ts`, `lib/extraction/provider.ts`, `tests/verify-handler.test.ts`, `README.md` | Add evaluator-facing "known failure modes" checklist in one place |
| **Code quality / organization for scope** | **Done** | Thin route, deep modules, test coverage on deterministic core, documented architecture/modules | `docs/ARCHITECTURE.md`, `docs/modules/*.md`, `tests/*`, `AGENTS.md` | Continue small focused increments; keep docs synchronized with behavior changes |
| **Creative but scoped problem-solving** (prototype discipline) | **Done** | Standalone deploy, no premature COLA integration, explicit OCR defer decision with policy doc; **§16 acceptance signed** | `README.md`, `docs/POC1_FALLBACK.md`, `docs/PROGRESS.md`, [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §16 | Optional polish only — does not reopen sign-off unless contracts change |
| **Batch uploads during peak seasons** (Sarah request) | **Out of scope** | Single-label workbench by design for this deliverable | [`docs/COMPREHENSIVE_IMPLEMENTATION_PLAN.md`](./COMPREHENSIVE_IMPLEMENTATION_PLAN.md) §2, [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §5 F-14 | Future phase if product expands beyond POC |
| **In-app OCR fallback (Tesseract) go/no-go implemented** | **Deferred** | Formal prototype defer; runtime fallback is **`unavailable`** placeholder until Phase 2 | [`docs/POC1_FALLBACK.md`](./POC1_FALLBACK.md), `lib/extraction/unavailable-fallback-provider.ts` | Implement measurable OCR provider + POC-1 harness when Phase 2 is funded |

---

## Executive gap summary

1. **Strongest area:** deterministic validation correctness and API/workflow reliability.
2. **Main evidence gap:** extraction proof on a **broader real-photo** set (synthetic + difficult label covered; more SKUs/conditions optional).
3. **Main product gap:** usability/error-polish validation for low-tech operator workflows.
4. **Main roadmap gap:** batch workflow and real OCR fallback remain **out of scope / Phase 2** for this deliverable (documented in plans + scorecard).

---

## Minimum closure plan (for take-home scoring confidence)

1. Add more **real-photo** categorized fixtures (beyond synthetic edge derivatives) if evaluators want broader extraction proof.
2. Optional: append-only **correctness** timeline index (mirror `PRIMARY_LATENCY_RUNS.md` style).
3. Optional: extend eval logging with richer per-field deltas for new fixtures only.
4. ~~Record explicit acceptance thresholds~~ — **Done:** [`docs/evals/CORRECTNESS_THRESHOLDS.md`](./evals/CORRECTNESS_THRESHOLDS.md) + `fixture-correctness-expectations.json`.
5. ~~Check off `docs/IMPLEMENTATION_PLAN.md` §16~~ — **Done (2026-05-12):** see §16 sign-off block + evidence bullets.

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
