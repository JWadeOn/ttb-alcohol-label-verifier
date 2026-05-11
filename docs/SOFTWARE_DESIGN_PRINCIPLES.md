# Software Design Philosophy and Principles

## Purpose

This document defines the engineering philosophy for this project so implementation decisions remain consistent as the codebase grows.

Primary goal: build a clean, maintainable, testable system that is easy to reason about under time constraints.

## Core Philosophy

Design deep modules with simple interfaces.

- **Deep module:** encapsulates meaningful internal complexity.
- **Simple interface:** exposes a small, clear API that is easy to understand and hard to misuse.

This project prefers fewer, stronger modules over many thin wrappers with leaky abstractions.

## Principles

### 1) Deep Modules, Simple Interfaces

- Keep complex logic inside dedicated modules (orchestrator, validator, extraction providers).
- Expose concise function signatures and typed contracts.
- Hide implementation details (timeouts, retries, normalization, parsing heuristics) behind stable interfaces.

### 2) Separation of Concerns

- `app/api` handles HTTP boundary concerns only (input parsing, response shaping, status codes).
- Extraction modules handle provider-specific behavior only.
- Validation modules handle deterministic comparison logic only.
- UI components render state and user actions only.

No cross-layer leakage (for example, provider-specific branching in UI).

### 3) Explicit Contracts and Types

- Define shared request/response and domain schemas centrally.
- Validate external and model output at boundaries.
- Use explicit status states (`pass`, `fail`, `manual_review`, `not_applicable`) rather than implicit flags.

### 4) Deterministic Core, AI at the Edge

- Use AI where it adds clear value (field extraction and field identification).
- Keep judgment and compliance checks deterministic and testable.
- Prefer explicit rules and auditable outputs over opaque decision logic.

### 5) Pragmatic TDD

- Test-first for deterministic core logic:
  - warning exactness
  - fuzzy brand normalization
  - import-conditional checks
  - failover timeout behavior
  - manual-review state transitions
- For integration-heavy wiring, implement then immediately cover with focused tests.

### 6) Thin Entry Points

- Keep route handlers and top-level orchestration calls thin.
- Push branching and business logic into modules with dedicated tests.
- Favor composition over monolithic handlers.

### 7) Reliability and Fallback Safety

- Fail predictably and surface actionable errors.
- Prefer manual review over low-confidence guesses.
- Design fallback behavior to preserve correctness and latency constraints.
- Use evidence-based fallback decisions: keep defaults only when agreed latency and accuracy thresholds are met in evals.

### 8) Error Handling (Prototype-Scoped)

- Treat error handling as a first-class design concern, not a last-mile patch.
- Standardize API error responses with stable fields (for example: `code`, `message`, `details`, `requestId`) so failures are debuggable and UI behavior stays consistent.
- Fail fast at boundaries (invalid input, malformed model output, missing config) with clear, user-safe messages.
- Keep internal error detail out of user-facing text; include actionable guidance only.
- Define expected fallback behavior per failure mode (primary timeout, provider error, OCR failure) and test those paths explicitly.

Prototype boundary:

- Prioritize consistency and debuggability over exhaustive enterprise error taxonomies.
- Do not implement complex distributed error infrastructure for this scope.

### 9) Auditability and Logging (Prototype-Scoped)

- Log enough structured events to reconstruct what happened for a verification request.
- At minimum, log:
  - request start/end,
  - provider selected and fallback activation,
  - per-field status outcomes (`pass`/`fail`/`manual_review`/`not_applicable`),
  - key timing metrics (provider latency, total request latency),
  - error code and stage on failure.
- Use correlation identifiers (`requestId`) across logs for end-to-end traceability.
- Keep logs privacy-aware: avoid storing raw label images or unnecessary sensitive payloads.

Prototype boundary:

- This is not a production audit ledger or records-retention system.
- Log to app/runtime output in a structured format; advanced SIEM pipelines are deferred.

### 10) Readability Over Cleverness

- Prioritize clarity and intention-revealing names.
- Use small, cohesive functions.
- Avoid premature abstraction and unnecessary indirection.

### 11) Measurable Quality Gates

A change is complete only when:

- relevant tests pass,
- type and lint checks pass,
- behavior aligns with documented contracts,
- error paths for touched logic are covered by tests,
- and logging for key lifecycle and failure events remains consistent,
- and trade-offs are documented when scope cuts are made.

## Architectural Expectations for This Project

- The extraction orchestrator owns failover policy; callers should not re-implement timeout logic.
- The validator remains pure and side-effect free.
- Fallback limitations are explicit and represented as `manual_review`, not hidden failures.
- Regulatory scope boundaries are documented and reflected in code behavior.

## Decision Heuristics

When choosing between approaches, prefer the option that:

1. keeps interfaces smaller and clearer,
2. reduces cross-module coupling,
3. increases testability of core behavior,
4. preserves latency and reliability constraints,
5. and is easiest for another engineer to understand quickly.

## Non-Goals for This Philosophy

- Maximizing abstraction depth for its own sake.
- Building framework-heavy architecture beyond project scope.
- Encoding legal/regulatory interpretation beyond documented prototype requirements.

## Anti-Overengineering Guardrails (Prototype)

### Build now

- End-to-end single-label verification flow with clear per-field outcomes.
- Distilled-first implementation with documented path to wine then beer.
- Deterministic validator logic for scoped fields.
- Minimal, structured logging and consistent error handling.
- Lightweight eval harness using fixtures and measurable thresholds.

### Defer unless required by acceptance criteria

- Dynamic plugin/rule-engine frameworks.
- Database/persistence layers for submissions or audit history.
- Queue/worker infrastructure for asynchronous pipelines.
- Multi-service decomposition and distributed tracing stacks.
- Full legal rules automation beyond scoped prototype checks.

### Decision rule

Before adding a new abstraction, confirm all are true:

1. It simplifies current implementation (not hypothetical future work).
2. It is required for current PRD scope or eval criteria.
3. It can be tested quickly and maintained within the one-week build window.

If any condition fails, defer and document the trade-off.

## How to Use This Document

- Use these principles during design and code review.
- If a change conflicts with a principle, document why and what trade-off was chosen.
- Keep this document updated when major architectural decisions change.

