# Core Requirements Scorecard (take-home alignment)

Evaluator-facing snapshot of **correctness** and **completeness** for the AI-powered TTB alcohol label verifier prototype.

This maps directly to the take-home rubric and stakeholder interview expectations (speed, usable UX, routine field matching, strict warning handling, image adversity).

**Last updated:** 2026-05-12

---

## How to read this

- **Done** = implemented and evidenced in code/tests/docs.
- **Partial** = core capability exists, but evidence depth or edge coverage is still open.
- **Not started** = no meaningful implementation yet.

Prototype scope still applies: this is a standalone POC, not a full COLA integration and not a complete 27 CFR rule engine (see `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`).

---

## Scorecard

| Requirement (take-home / stakeholder intent) | Status | What we have now | Evidence | Gap to close next |
|---|---|---|---|---|
| **Core field comparison workflow works end-to-end** (brand, class/type, ABV, net contents, warning, name/address, country for imports) | **Done** | `POST /api/verify` pipeline: image quality -> extraction -> deterministic validation -> typed response rendered in UI | `lib/verify-handler.ts`, `lib/verify-pipeline.ts`, `lib/validator.ts`, `app/page.tsx`, `tests/verify-handler.test.ts` | Keep traceability updated when field logic changes |
| **Deterministic validation correctness** (rules over extracted/application values) | **Done** | Strong unit coverage for statuses (`pass`/`fail`/`manual_review`/`not_applicable`), thresholds, parsing, strict warning behavior | `tests/validator.test.ts`, `tests/golden-default-application.test.ts`, `docs/modules/validator.md` | Add a few more explicit test vectors for stakeholder examples (e.g., punctuation/case brand tolerance notes) |
| **Warning statement strictness** (Jenny: exact wording sensitivity) | **Done** | Warning comparison is strict against application value; mismatch fails | `lib/validator.ts`, `tests/golden-default-application.test.ts`, `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` | Clarify in evaluator notes that strictness is product behavior for prototype, not full legal implementation |
| **Judgment-safe behavior for ambiguous OCR** (Dave: nuance) | **Done** | Manual-review pathway is first-class; low-confidence and uncertain outputs can avoid false pass/fail certainty | `lib/validator.ts`, `lib/schemas.ts`, UI in `app/page.tsx` | Add richer image fixtures to prove manual-review behavior on real difficult images |
| **Latency practical for agent workflow** (Sarah: ~5s target pressure) | **Partial** | Production eval harness + committed snapshots; current latest run shows `openai` provider on three fixtures with ~3.5s-6.5s round-trip | `evals/run-primary-latency.mjs`, `docs/evals/PRIMARY_LATENCY_RUNS.md`, `docs/evals/primary-latency-production-2026-05-12.json` | Define explicit acceptance thresholds (p95 + pass criteria) and track against a broader, representative fixture set |
| **Usable UX for mixed tech comfort** ("my mother could use it") | **Partial** | Results-first flow, obvious actions, expandable guidance, improved review controls | `app/page.tsx`, `docs/modules/app-page.md`, `docs/PROGRESS.md` | Run a lightweight task-based usability pass and tighten edge-error copy/messages |
| **Handles non-ideal images** (glare, angle, blur) | **Partial** | Image-quality gate, difficult stress fixture, fixture-verify eval for programmatic logging | `lib/image-quality.ts`, `fixtures/labels/liquor_label_difficult.png`, `evals/run-fixture-verify.mjs`, `fixtures/manifest.json` | Build categorized golden image set and per-fixture expected outcomes; currently too thin for completeness claim |
| **Programmatic eval + logged evidence over time** | **Done** | Append-only latency timeline + dated artifacts; fixture verify eval supports JSON output logging | `docs/evals/PRIMARY_LATENCY_RUNS.md`, `docs/evals/README.md`, `evals/run-fixture-verify.mjs` | Add a companion correctness timeline (not just latency/provider) with field-level summaries |
| **Error handling and fail-safe behavior** | **Done** | Typed error codes, timeout failover path, disabled/missing key behavior, structured logs | `lib/verify-handler.ts`, `lib/extraction/provider.ts`, `tests/verify-handler.test.ts`, `README.md` | Add evaluator-facing "known failure modes" checklist in one place |
| **Code quality / organization for scope** | **Done** | Thin route, deep modules, test coverage on deterministic core, documented architecture/modules | `docs/ARCHITECTURE.md`, `docs/modules/*.md`, `tests/*`, `AGENTS.md` | Continue small focused increments; keep docs synchronized with behavior changes |
| **Creative but scoped problem-solving** (prototype discipline) | **Done** | Standalone deploy, no premature COLA integration, explicit OCR defer decision with policy doc | `README.md`, `docs/POC1_FALLBACK.md`, `docs/PROGRESS.md` | Close Day 3 acceptance with explicit sign-off checklist completion |
| **Batch uploads during peak seasons** (Sarah request) | **Not started** | Acknowledged as valuable future workflow; no implementation in current prototype | Take-home interview notes, `docs/PROGRESS.md` scope references | Decide if out-of-scope note is sufficient or add a thin batch mock/proposal in docs |
| **In-app OCR fallback (Tesseract) go/no-go implemented** | **Not started** | Policy/threshold contract documented; runtime fallback still placeholder `unavailable` provider | `docs/POC1_FALLBACK.md`, `lib/extraction/unavailable-fallback-provider.ts`, `docs/PROGRESS.md` | Implement Phase 2 OCR path or record explicit pivot decision with rationale |

---

## Executive gap summary

1. **Strongest area:** deterministic validation correctness and API/workflow reliability.
2. **Main evidence gap:** image-based extraction correctness breadth (categorized golden set with expected outcomes).
3. **Main product gap:** usability/error-polish validation for low-tech operator workflows.
4. **Main roadmap gap:** batch workflow and OCR fallback remain intentionally unfinished.

---

## Minimum closure plan (for take-home scoring confidence)

1. Add 8-15 categorized fixtures (happy, clutter, glare, curvature, blur, missing/illegible, typography variants).
2. Commit expected per-field outcomes (or tolerance-based expectations) for those fixtures.
3. Extend eval logging to include per-field correctness deltas against expectations.
4. Record explicit acceptance thresholds (latency + correctness + manual-review rate).
5. Check off `docs/IMPLEMENTATION_PLAN.md` §16 with links to artifacts above.

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
