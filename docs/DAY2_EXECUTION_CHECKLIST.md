# Day 2 Execution Checklist

> **Living status:** What is done and what is next lives in [`docs/PROGRESS.md`](./PROGRESS.md). This file is the **timeboxed runbook** for Day 2, not a live checklist maintained here.

## Purpose

Translate Day 1 foundations into real core behavior:

- primary extraction integration,
- deterministic validator depth,
- failover flow verification,
- early evaluator-visible functionality.

## Day 2 Outcomes

By end of Day 2, you should have:

- primary extraction path wired behind provider interface,
- deterministic validator rules passing targeted tests,
- failover orchestration behavior implemented and test-covered,
- UI showing real route-driven states (not just static mock rendering).

## Timeboxed Plan

## 0:00-0:30 — Rebaseline and Prioritize

- Confirm clean working tree and branch status.
- Run lint/type/tests to establish baseline.
- Review Day 1 outputs and unresolved blockers.
- Lock top 3 Day 2 must-win tasks.

Exit check:

- baseline health confirmed,
- today’s priority order is explicit.

## 0:30-2:00 — Primary Provider Wiring (WS-B)

- Implement primary extraction provider integration (`gpt-4o-mini`) behind provider interface.
- Ensure structured output parsing and boundary validation.
- Map extraction result to shared field schema and status model.
- Add targeted provider contract tests with mocked responses.

Exit check:

- primary provider returns typed extraction payloads through route path.

## 2:00-3:30 — Deterministic Validator Expansion (WS-C, TDD)

- Add/complete tests and implementation for:
  - strict warning validation behavior,
  - fuzzy brand normalization behavior,
  - ABV and net contents comparison semantics,
  - `not_applicable` conditional handling (imports/non-imports).
- Ensure manual-review states are consistent and explicit.

Exit check:

- validator behavior is test-driven and stable for core fields.

## 3:30-5:00 — Failover Orchestration (WS-B + WS-C)

- Implement soft/hard timeout orchestration flow.
- Add tests for:
  - primary success before soft timeout,
  - fallback start at soft timeout,
  - hard-timeout cutover behavior,
  - provider failure-to-manual-review handling.
- Confirm route-level behavior surfaces provider metadata.

Exit check:

- failover behavior works as specified and is covered by tests.

## 5:00-6:00 — UI and Integration Pass (WS-D + WS-A)

- Replace mock-only UI assumptions with live route response handling.
- Ensure result table supports:
  - `pass`,
  - `fail`,
  - `manual_review`,
  - `not_applicable`.
- Improve error display for invalid input/provider failures.

Exit check:

- UI displays real backend outcomes cleanly and predictably.

## 6:00-6:30 — POC and Day-End Stabilization

- Run first meaningful POC measurements where feasible:
  - primary extraction latency sample,
  - fallback path simulation sanity check.
- Capture findings in working notes for PRD/PRESEARCH sync.
- Run final lint/type/tests for touched scope.

Exit check:

- system is stable,
- early evidence exists for open technical questions,
- no hidden regressions in touched modules.

## Commit Checkpoints (Recommended)

1. `feat(extraction): wire primary provider behind typed interface`
2. `test(validator): expand deterministic field comparison coverage`
3. `feat(failover): implement soft-hard timeout orchestration`
4. `feat(ui): bind result table to live verify route states`
5. `chore(eval): record first latency and failover measurements`

Only commit green states (lint/type/relevant tests passing).

## Completion record

**Day 2 runbook is closed as of 2026-05-11** with evidence and optional follow-ups documented. See **[`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md)** and the Day 2 rows in [`PROGRESS.md`](./PROGRESS.md) → *Execution checklist audit*. Public deploy: **[`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md)**.

## Risks to Avoid on Day 2

- Letting provider-specific logic leak across route/UI layers.
- Delaying timeout/failover tests until after full integration.
- Expanding legal rule scope before core behavior is stable.
- Hiding low-confidence outcomes instead of surfacing manual review.

## If Time Slips

Cut in this order while preserving evaluator-visible value:

1. reduce UI polish depth,
2. reduce fixture breadth (keep representative edge cases),
3. defer non-core conditional validations beyond import handling.

Do not cut:

- provider interface integrity,
- failover test coverage,
- validator correctness for core fields.

