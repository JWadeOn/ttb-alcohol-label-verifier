# Day 3 Execution Checklist

> **Living status:** What is done and what is next lives in [`docs/PROGRESS.md`](./PROGRESS.md). This file is the **timeboxed runbook** for Day 3, not a live checklist maintained here.

## Purpose

Convert a functional build into an evaluator-ready prototype by closing evidence gaps:

- complete eval runs and open-question measurements,
- finalize deployment (e.g. **Railway** or **Render** from the repo `Dockerfile`),
- polish UX and docs for clear reviewability.

## Day 3 Outcomes

By end of Day 3, you should have:

- measurable eval results for correctness and latency,
- a stable public deployment URL,
- updated docs reflecting actual implementation behavior and limits,
- a clean, demo-ready flow for evaluator walkthrough.

## Timeboxed Plan

## 0:00-0:30 — Health Check and Prioritization

- Confirm clean working tree and branch health.
- Run lint/type/tests baseline.
- Review open technical questions and unresolved TODOs.
- Lock Day 3 must-complete items.

Exit check:

- no ambiguity about remaining critical path.

## 0:30-2:00 — Evals and Open-Question Closure (WS-E)

- Run extraction correctness eval on current fixture set.
- Run validator behavior suite and verify edge-case assertions.
- Run latency measurements for:
  - primary path,
  - failover path (simulated primary delay/failure).
- Record results in a concise artifact (notes section or eval output file).

Exit check:

- both open technical questions have data-backed answers (or explicit remaining gaps).

## 2:00-3:30 — Fallback Go/No-Go Decision (WS-B + WS-E)

- Re-run fallback-specific metrics on structured fields:
  - warning,
  - ABV,
  - net contents.
- Compare against locked thresholds.
- Make and document decision:
  - keep Tesseract fallback, or
  - trigger pivot path (Node tuning / ONNX / Paddle sidecar).

Exit check:

- fallback decision is explicit, evidence-based, and documented.

## 3:30-5:00 — Deployment Finalization (Railway / Render) (WS-F)

- Build and deploy Docker image (e.g. **Railway** from GitHub + root `Dockerfile`, or **Render** per [`RENDER_DEPLOY.md`](../RENDER_DEPLOY.md)).
- Configure required secrets (**`OPENAI_API_KEY`** on the host; never in git).
- Verify deployed app behavior:
  - upload flow works,
  - verify route responds correctly,
  - result states render cleanly,
  - basic error handling is user-readable.
- Capture deployment URL and smoke-test notes.

Exit check:

- stable public HTTPS URL available for evaluator testing.

## 5:00-6:00 — UX and Error-Handling Polish (WS-D + WS-A)

- Improve clarity of:
  - manual-review messaging,
  - provider transparency,
  - invalid input errors,
  - image quality rejection messaging.
- Ensure logging/error shape remains consistent with principles.

Exit check:

- evaluator can understand outcomes without code-level context.

## 6:00-6:45 — Documentation Sync and Traceability

- Update README sections to match actual implementation:
  - eval method and key results,
  - deployment decision and URL,
  - fallback policy outcome,
  - known limitations/trade-offs.
- Verify PRD/PRESEARCH consistency with implemented behavior.
- Add brief “what is deferred” callout where needed.

Exit check:

- docs are synchronized with real system behavior.

## 6:45-7:00 — Final Day 3 Stabilization

- Run final lint/type/tests on touched scope.
- Confirm clean repository state.
- Prepare next-day or handoff checklist.

Exit check:

- no hidden regressions,
- no undocumented late decisions.

## Commit Checkpoints (Recommended)

1. `test(eval): add and run correctness and latency evaluation suite`
2. `chore(fallback): record tesseract go-no-go decision with metrics`
3. `chore(deploy): finalize Railway (or Render) deployment and runtime config`
4. `fix(ui): improve error and manual-review clarity`
5. `docs(readme): publish eval results and deployment instructions`

Only commit green states (lint/type/relevant tests passing).

## Risks to Avoid on Day 3

- Shipping without measurable evidence for key technical claims.
- Deploying without validating end-to-end behavior on the live URL.
- Letting README/PRD/PRESEARCH drift from implemented behavior.
- Over-polishing visuals while reliability/documentation gaps remain.

## If Time Slips

Cut in this order:

1. reduce non-critical UI polish,
2. reduce fixture count while preserving representative coverage,
3. defer optional optimizations not tied to evaluator criteria.

Do not cut:

- eval evidence for core claims,
- deployment verification on public URL,
- documentation accuracy for trade-offs and limitations.

