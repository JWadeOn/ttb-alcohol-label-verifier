# Progress (living)

Short **human index** of where the prototype stands. **Git history** remains the audit trail; **`docs/ARCHITECTURE.md`** stays the technical “what exists now.” Update this file when focus or shipped scope changes meaningfully.

**Last updated:** 2026-05-11

---

## Current focus

Phase 1 **core path** is shipped and **Day 1 closeout is committed** (Docker + fixtures + eval scaffold + docs).

**Day 2 is not skipped in the plan** — it lives in **`docs/DAY2_EXECUTION_CHECKLIST.md`** and aligns with **Phase 1 — Core Engine** in **`docs/WEEK_EXECUTION_OVERVIEW.md`**. Most Day 2 *outcomes* (primary OpenAI provider, validator + tests, `extractWithFailover`, UI on live `/api/verify`) **already landed** in earlier Phase 1 commits (`741ce0d`, `fd759d6`, related tests), so recent “next” emphasis jumped to **deploy + evidence + polish** (Day 3 / Render / §16) without saying that loudly enough. **Still do:** an explicit **Day 2 sign-off pass** (checklist vs repo + POC notes + any error-UX gaps).

---

## Execution checklist audit (explicit)

Legend: **Done** = implemented and usable in-repo unless noted. **Partial** = materially there; formal sign-off, evidence artifact, or edge case still open. **Not started** = no meaningful delivery yet. Sources: [`DAY1_EXECUTION_CHECKLIST.md`](./DAY1_EXECUTION_CHECKLIST.md), [`DAY2_EXECUTION_CHECKLIST.md`](./DAY2_EXECUTION_CHECKLIST.md), [`DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md).

### Day 1 — [`docs/DAY1_EXECUTION_CHECKLIST.md`](./DAY1_EXECUTION_CHECKLIST.md)

| Block | Status | Evidence / notes |
|-------|--------|-------------------|
| **Outcomes (summary)** | **Partial → Done** | Skeleton + contracts + parallel kickoff artifacts exist; POC-1 *measurement* is partial (see 5:00–6:00). |
| 0:00–0:30 Setup / branch | **Partial** | Work is on **`main`** and committed green; “implementation branch” and “re-read governance docs” are process items, not tracked in-repo. |
| 0:30–2:00 Thin vertical | **Done** | `POST /api/verify`, workbench UI (upload + application + submit + results), wiring tests (`tests/verify-handler.test.ts`, etc.). Response is **live pipeline** today, not a static stub only. |
| 2:00–3:00 Contract lock | **Done** | Zod schemas, multipart boundary validation, enums in `lib/schemas.ts`; example/stub patterns in tests and `lib/stub-response.ts`. |
| 3:00–5:00 WS-B extraction | **Done** | `ExtractionProvider`, `extractWithFailover`, OpenAI + `unavailable` providers (`lib/extraction/*`). |
| 3:00–5:00 WS-C validator | **Done** | `tests/validator.test.ts` (warning strictness, brand fuzz, import / `not_applicable`, ABV parsing helpers). |
| 3:00–5:00 WS-D UI | **Done** | Live `fetch` to `/api/verify`; provider + field statuses surfaced (`app/page.tsx`). |
| 3:00–5:00 WS-E fixtures / eval | **Done** | `fixtures/`, `fixtures/manifest.json`, `scripts/generate-fixture-pngs.mjs`, `evals/run-primary-latency.mjs`, `tests/fixtures-manifest.test.ts` (commit `2fd9bb5`). |
| 3:00–5:00 WS-F Docker / env | **Done** | `Dockerfile`, `.dockerignore`, standalone `next.config`; README + `.env.example` for secrets and optional timeouts; local **`docker build`** validated on OrbStack. |
| 5:00–6:00 POC-1 prep | **Partial** | **`docs/POC1_FALLBACK.md`** locks thresholds + measurement contract; **`eval:primary-latency`** exists. **Primary-path numbers** in-repo as a pinned artifact are optional; **OCR fallback** metrics are **deferred** (no Tesseract in app). |
| 6:00–6:30 Stabilization | **Done** | Lint/tests/build green on touched scope; commits `2fd9bb5`, `edcaed0`, `b479e3c`, `f5153bd`, `dee585a`, etc. |

### Day 2 — [`docs/DAY2_EXECUTION_CHECKLIST.md`](./DAY2_EXECUTION_CHECKLIST.md)

| Block | Status | Evidence / notes |
|-------|--------|-------------------|
| **Outcomes (summary)** | **Partial** | Core engine behaviors are **in** the tree; formal “POC measurements in working notes” and some test nuance remain **Partial** (see below). |
| 0:00–0:30 Rebaseline | **Partial** | Baseline scripts exist; “lock top 3 must-wins” is a session ritual, not a file. |
| 0:30–2:00 Primary provider | **Done** | `lib/extraction/openai-provider.ts` (`gpt-4o-mini` vision + JSON + Zod). |
| 0:30–2:00 Provider **contract tests** (mocked OpenAI) | **Partial** | Failover tests use **mock providers** (`tests/extract-failover.test.ts`). There is **no** dedicated unit file that mocks the HTTP/SDK for `createOpenAIProvider` only. |
| 2:00–3:30 Validator expansion | **Done** | Targeted `validateLabelFields` tests as above; manual_review paths exercised via low-confidence / fallback paths in validator + UI. |
| 3:30–5:00 Failover orchestration | **Partial** | **Done:** soft/hard timers + `AbortSignal`, primary success vs hard-abort fallback (`tests/extract-failover.test.ts`). **Not separately asserted in tests:** “fallback promise started at soft timeout while primary still in flight” (implementation exists in `lib/extraction/provider.ts`; only abort path is asserted). |
| 3:30–5:00 Route surfaces provider metadata | **Done** | JSON includes `extraction.provider`, `extraction.durationMs`, per-field reasons. |
| 5:00–6:00 UI integration + errors | **Partial** | **Done:** live route-driven UI + status mix (`pass` / `fail` / `manual_review` / `not_applicable`). **Partial:** rich **client** error UX for every provider/route failure mode (some errors are JSON-only; server logs improved in `b479e3c`). |
| 6:00–6:30 POC + stabilization | **Partial** | Dev logs capture **`pipelineMs` / `totalMs`**; optional env timeouts. **Missing as explicit artifact:** written “first meaningful POC” summary in docs (beyond POC1 threshold table + ad-hoc runs). |

### Day 3 — [`docs/DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md)

| Block | Status | Evidence / notes |
|-------|--------|-------------------|
| **Outcomes (summary)** | **Not started** | No stable public URL, no published eval result bundle, demo-ready polish incomplete. |
| 0:00–0:30 Health check | **Partial** | Local health strong; “lock Day 3 must-complete” not recorded here beyond **Next** list. |
| 0:30–2:00 Evals + open questions | **Partial** | Harness + fixtures exist; **no** committed eval output / “concise artifact” with correctness + latency matrix for the full fixture set. |
| 2:00–3:30 Fallback go/no-go (Tesseract metrics) | **Not started** | **No** in-app Tesseract path yet; **`docs/POC1_FALLBACK.md`** records policy/thresholds only. True go/no-go **waits Phase 2 OCR** (or an explicit pivot doc). |
| 3:30–5:00 Render deploy | **Not started** | README still points at target; no captured **public URL** or smoke notes in-repo. |
| 5:00–6:00 UX / error polish | **Partial** | Usable UI; Day 3 asks for evaluator-grade clarity pass (copy, edge errors, image-quality messaging) — not fully closed out. |
| 6:00–6:45 Docs sync | **Partial** | Module docs + README track behavior; Day 3 asks for eval results + deploy URL + fallback **outcome** in README — pending. |
| 6:45–7:00 Final stabilization | **Not started** | Tied to Day 3 scope completion. |

---

## Done recently

- **Phase 1 pipeline** — verify API, extraction with timeout failover to `unavailable` placeholder, validator, tests (`741ce0d`).
- **UI/UX** — light theme, workbench (label + application), formatted vs JSON application editor, results with label + field comparison + raw JSON (`fd759d6`).
- **Docs** — `docs/ARCHITECTURE.md`, `docs/modules/*`, README / AGENTS pointers; dev script and `.next` troubleshooting in README.
- **Sample asset** — `fixtures/labels/liquor_label_happy_path.png` for manual runs (`9a4c108`).
- **Day 1 closeout (committed `2fd9bb5`)** — production **`Dockerfile`** + **`.dockerignore`**, `next.config` **`output: "standalone"`**, `public/.gitkeep`; **`fixtures/`** manifest + default application JSON + nine **`seed-texture-*.png`** + **`scripts/generate-fixture-pngs.mjs`**; **`evals/run-primary-latency.mjs`** + npm script; **`docs/POC1_FALLBACK.md`**; Vitest **`fixtures-manifest`**; ESLint ignores for `scripts/**` and `evals/**`; **`pnpm-lock.yaml`** removed from workflow and **ignored**.
- **Repo hygiene (`edcaed0`)** — ignore stray **`docs/docs.code-workspace`** so local IDE files do not clutter `git status`.
- **Docker / npm-in-image stability** — `npm ci` tuned for flaky registry (parallelism + cache mount) so **`docker build`** (including **`--no-cache`**) succeeds on OrbStack when the network is healthy.
- **Verify observability & dev controls (`b479e3c`)** — structured logs for **`[extractWithFailover]`**, **`[verify-pipeline]`**, **`[verify]`** (incl. **`pipelineMs`**, **`totalMs`**, timeouts); env **`VERIFY_EXTRACT_SOFT_TIMEOUT_MS`** / **`VERIFY_EXTRACT_HARD_TIMEOUT_MS`** for local perf experiments; **`OPENAI_DISABLED`** to skip OpenAI while keeping a key; README **credits / usage** section; tests for **`OPENAI_DISABLED`**.

---

## Next (ordered)

1. **Day 2 sign-off:** walk **`docs/DAY2_EXECUTION_CHECKLIST.md`** against the repo; note what is already satisfied vs any gap (error display, POC latency / failover notes, “first meaningful measurements”). Update this file when Day 2 is intentionally closed.
2. **Render:** push image, configure secrets, capture public URL; paste smoke results into README / here.
3. Run **Day 3** items: fuller eval pass on `liquor_label_happy_path` + notes, **fallback go/no-go** when Tesseract exists (`docs/DAY3_EXECUTION_CHECKLIST.md`).
4. **`docs/IMPLEMENTATION_PLAN.md` §16** — check off acceptance lines when the deliverable is intentionally signed off.
5. Optional: Day 3 **UX polish** block (manual-review / provider / image-quality messaging) if anything still feels unclear in a fresh walkthrough.

---

## Blockers

None recorded in-repo. Add a dated bullet here when something external (keys, platform, fixtures) stalls work.

---

## How this relates to other docs

| Doc | Role |
|-----|------|
| `docs/DAY1–3_EXECUTION_CHECKLIST.md` | **How** to execute a day (timeboxed runbooks). Day 2 ↔ Phase 1 core engine (`WEEK_EXECUTION_OVERVIEW.md`). |
| `docs/WEEK_EXECUTION_OVERVIEW.md` | Week map and phase gates. |
| `docs/PROGRESS.md` (this file) | **What’s done / next / blocked** in plain language. |
| `docs/ARCHITECTURE.md` | System flow and links to **per-module** detail. |
| `docs/IMPLEMENTATION_PLAN.md` §16 | Formal **acceptance** checklist for handoff. |
