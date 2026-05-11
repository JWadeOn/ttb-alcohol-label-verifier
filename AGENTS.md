# Agent Working Agreement

This file defines how coding agents should work in this repository.

## Product and UX Priorities

- Keep the product focused on the scoped prototype goals.
- Optimize for obvious, clean, easy-to-use workflows.
- Prefer clear user feedback over clever UI patterns.
- Surface `manual_review` instead of guessing on low-confidence results.

## Engineering Priorities

- Favor deep modules with simple interfaces.
- Keep route/UI layers thin and move complexity into tested modules.
- Keep deterministic validation logic pure and testable.
- Avoid overengineering and defer non-essential architecture.

## Scope Discipline

- Implement only what is required for current PRD/eval goals.
- Distilled spirits first, then wine, then beer.
- Keep fallback policy evidence-based (Tesseract-first with go/no-go pivot).
- Preserve Render-first deployment strategy unless blocked.

## Quality and Testing

- Use pragmatic TDD:
  - test-first for deterministic core and failover behavior,
  - integration wiring can be implementation-first with immediate test follow-up.
- Do not close a task without passing lint/type/relevant tests.
- Keep docs aligned with implementation decisions.

## Repo Hygiene

- Make small, focused commits with green states only.
- Do not commit secrets, local temp artifacts, or generated noise.
- Keep commit history understandable and review-friendly.

