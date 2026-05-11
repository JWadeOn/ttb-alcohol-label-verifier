# Day 1 Execution Checklist

> **Living status:** What is done and what is next lives in [`docs/PROGRESS.md`](./PROGRESS.md). This file is the **timeboxed runbook** for Day 1, not a live checklist maintained here.

## Purpose

Provide a concrete, timeboxed Day 1 plan to move from planning into implementation with minimal thrash.

This checklist follows the locked implementation strategy:

- thin vertical skeleton first,
- contracts next,
- parallel workstreams after schema lock,
- early go/no-go evidence collection.

## Day 1 Outcomes

By end of Day 1, you should have:

- a running thin vertical skeleton (UI -> `/api/verify` -> typed stub response),
- locked request/response contracts and field state enums,
- parallel workstreams unblocked with clear boundaries,
- initial POC setup started for fallback go/no-go.

## Timeboxed Plan

## 0:00-0:30 — Setup and Branch Hygiene

- Confirm clean working tree.
- Create/checkout implementation branch.
- Re-read:
  - `docs/PRD.md`
  - `docs/PRESEARCH.md`
  - `docs/SOFTWARE_DESIGN_PRINCIPLES.md`
  - `docs/REPOSITORY_HYGIENE.md`
- Confirm deployment target remains Render-first.

Exit check:

- branch is ready,
- scope and constraints are fresh in mind.

## 0:30-2:00 — Thin Vertical Skeleton (Must Finish First)

- Scaffold app/runtime if needed.
- Add `POST /api/verify` route returning typed stub payload.
- Add minimal upload page:
  - file input,
  - JSON input area or fixture picker,
  - submit action,
  - render result states from stub response.
- Add one smoke test for route/UI wiring.
- Ensure lint/type/test baseline passes.

Exit check:

- end-to-end skeleton works locally,
- one smoke test passes,
- route contract is visible to all workstreams.

## 2:00-3:00 — Contract Lock

- Freeze schemas for:
  - request payload,
  - response payload,
  - per-field status enum (`pass`, `fail`, `manual_review`, `not_applicable`),
  - provider label and confidence representation.
- Add schema validation at route boundary.
- Publish example response fixture for UI and tests.

Exit check:

- schema and response examples are stable for parallel development.

## 3:00-5:00 — Parallel Workstream Kickoff

### WS-B: Extraction and Orchestration

- Scaffold provider interface and orchestrator function signatures.
- Add timeout constants and placeholder failover flow.

### WS-C: Validator Core (TDD)

- Write first failing tests for:
  - warning exactness,
  - brand normalization match behavior,
  - state mapping semantics.
- Implement minimal logic to pass initial tests.

### WS-D: UI Workflow

- Build result table component against locked mock payload.
- Render provider transparency and manual-review states.

### WS-E: Evals and Fixtures

- Create initial fixture folders and 5-10 seed labels (or placeholders + manifest).
- Create baseline eval script/test scaffold.

### WS-F: Deployment Baseline

- Validate Docker build baseline locally.
- Ensure env var strategy is ready for Render.

Exit check:

- each workstream has a concrete start and artifact,
- no one is blocked on schema ambiguity.

## 5:00-6:00 — POC-1 Prep (Go/No-Go Setup)

- Define fallback go/no-go measurement script inputs and output format.
- Record thresholds in working notes:
  - fallback latency budget target,
  - structured-field fallback coverage threshold (warning/ABV/net).
- Run first measurement attempt if possible.

Exit check:

- go/no-go measurement process exists,
- first data point captured (or blocker documented).

## 6:00-6:30 — Day-End Stabilization

- Run lint/type/tests for touched scope.
- Clean up partial spikes; keep only intentional code.
- Update docs briefly if implementation decisions changed.
- Prepare next-day starting task list.

Exit check:

- repo is in a clean, understandable state,
- progress is visible and reproducible.

## Commit Checkpoints (Recommended)

1. `chore: scaffold thin vertical skeleton`
2. `feat(api): lock verify request/response schemas`
3. `test(validator): add warning and brand normalization coverage`
4. `feat(ui): render result states from typed response`
5. `chore(eval): scaffold fallback go-no-go harness`

Only commit green states (lint/type/relevant tests passing).

## Completion record

**Day 1 runbook is closed as of 2026-05-11** with evidence and POC-1 exit criteria satisfied (**primary-path sample + documented OCR blocker**). See **[`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md)** and the Day 1 rows in [`PROGRESS.md`](./PROGRESS.md) → *Execution checklist audit*.

## Risks to Avoid on Day 1

- Overbuilding architecture before the skeleton works.
- Starting OCR optimization before contract lock.
- Mixing unrelated concerns in one large commit.
- Delaying tests for deterministic validator logic.

## If Time Slips

Cut in this order (while preserving evaluator-visible progress):

1. Reduce fixture quantity (keep representative set).
2. Delay UI polish (keep functional clarity).
3. Defer advanced fallback tuning until baseline evidence exists.

Do not cut:

- schema clarity,
- deterministic validator tests,
- thin vertical skeleton completion.

