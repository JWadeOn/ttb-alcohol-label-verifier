# Repository Hygiene Policy

## Purpose

Define lightweight, consistent git and repository habits for this take-home so the codebase stays clean, reviewable, and easy to recover when time is tight.

## Core Rules

### 1) Commit Small, Vertical Slices

- Each commit should represent one logical unit of change.
- Avoid mixing unrelated work (for example: validator logic + deployment config + docs in one commit).
- Prefer incremental progress over large batch commits.

### 2) Commit Only Green States

Before committing, ensure:

- lint checks pass,
- type checks pass,
- relevant tests pass for touched areas.

Do not commit knowingly broken intermediate states.

### 3) Keep Branch Strategy Simple

- Default to one feature branch for this prototype.
- If scope grows, split by workstream and merge back deliberately.
- Avoid long-lived divergent branches that increase merge risk.

### 4) Use Consistent Commit Messages

Use concise conventional prefixes:

- `feat:`
- `fix:`
- `test:`
- `docs:`
- `refactor:`
- `chore:`

Examples:

- `feat(validator): add strict government warning matcher`
- `test(failover): cover soft/hard timeout race behavior`
- `docs(readme): document render-first deployment decision`

### 5) Protect Signal-to-Noise

- Do not commit secrets, local env files, generated logs, or temp artifacts.
- Keep `.gitignore` accurate for local outputs and experiment files.
- Avoid committing large binary files unless explicitly required.

### 6) Keep Docs in Sync With Behavior

- When implementation behavior changes, update corresponding docs in the same working session.
- Prevent drift between:
  - `docs/PRD.md`
  - `docs/PRESEARCH.md`
  - `README.md`
  - implementation reality

### 7) Prefer Clear History Over Clever History

- Do not rewrite history unless there is a strong reason.
- Keep commit history understandable for reviewers reading it linearly.
- Favor clarity and traceability over perfectly curated commit aesthetics.

## Working Cadence

Recommended cadence for this project:

- Commit every 1-3 hours or at the completion of each mini-slice.
- Keep a clean working tree at logical stopping points.
- End sessions with:
  - clean `git status`,
  - passing local checks for touched modules,
  - short note in docs if decisions changed.

## Suggested Commit Sequence for This Build

1. Scaffold and thin vertical skeleton
2. API contracts and schema typing
3. Validator core and deterministic tests
4. Primary provider + failover orchestration
5. Fallback provider behavior and manual-review states
6. UI results and error states
7. Evals and metrics capture
8. Deployment and documentation polish

## Pull Request Hygiene (if using PRs)

- Keep PRs focused and reviewable.
- Include:
  - what changed,
  - why it changed,
  - how it was tested,
  - known limitations or follow-ups.

## Non-Goals

- Heavy process overhead.
- Enterprise-scale release workflows.
- Perfect commit granularity at the expense of shipping.

The objective is disciplined, practical hygiene that improves quality without slowing delivery.

