# Progress (living)

Short **human index** of where the prototype stands. **Git history** remains the audit trail; **`docs/ARCHITECTURE.md`** stays the technical “what exists now.” Update this file when focus or shipped scope changes meaningfully.

**Last updated:** 2026-05-11

---

## Current focus

Phase 1 **core path** is shipped; **Day 1** and **Day 2** are formally closed — **[`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md)**, **[`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md)**. Optional quality follow-ups stay listed in the Day 2 completion doc (they do not reopen the runbook).

**Live prototype:** **Railway** — [https://ttb-alcohol-label-verifier-production.up.railway.app](https://ttb-alcohol-label-verifier-production.up.railway.app) (see `README.md`). **Render** remains a documented alternate ([`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md)).

**Next emphasis:** set **`OPENAI_API_KEY`** on the Railway service (production currently returns **`OPENAI_NOT_CONFIGURED`** for `POST /api/verify` — see [`docs/evals/primary-latency-production-2026-05-11.json`](./evals/primary-latency-production-2026-05-11.json)), then **re-run** production eval; **Day 3** UX polish; **`IMPLEMENTATION_PLAN.md` §16** acceptance when intentionally signed off.

---

## Execution checklist audit (explicit)

Legend: **Done** = implemented and usable in-repo unless noted. **Partial** = materially there; formal sign-off, evidence artifact, or edge case still open. **Not started** = no meaningful delivery yet. Sources: [`DAY1_EXECUTION_CHECKLIST.md`](./DAY1_EXECUTION_CHECKLIST.md), [`DAY2_EXECUTION_CHECKLIST.md`](./DAY2_EXECUTION_CHECKLIST.md), [`DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md).

### Day 1 — [`docs/DAY1_EXECUTION_CHECKLIST.md`](./DAY1_EXECUTION_CHECKLIST.md) — **closed**

Formal sign-off: **[`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md)** (2026-05-11).

| Block | Status | Evidence / notes |
|-------|--------|-------------------|
| **Outcomes (summary)** | **Done** | Thin vertical, contracts, parallel kickoff, POC-1 prep with **primary sample + documented OCR blocker** (completion record). |
| 0:00–0:30 Setup / branch | **Done** | `main` + green commits; governance set **indexed** in completion record; Render-first documented. |
| 0:30–2:00 Thin vertical | **Done** | `POST /api/verify`, workbench UI (upload + application + submit + results), wiring tests (`tests/verify-handler.test.ts`, etc.). Response is **live pipeline** today, not a static stub only. |
| 2:00–3:00 Contract lock | **Done** | Zod schemas, multipart boundary validation, enums in `lib/schemas.ts`; example/stub patterns in tests and `lib/stub-response.ts`. |
| 3:00–5:00 WS-B extraction | **Done** | `ExtractionProvider`, `extractWithFailover`, OpenAI + `unavailable` providers (`lib/extraction/*`). |
| 3:00–5:00 WS-C validator | **Done** | `tests/validator.test.ts` (warning strictness, brand fuzz, import / `not_applicable`, ABV parsing helpers). |
| 3:00–5:00 WS-D UI | **Done** | Live `fetch` to `/api/verify`; provider + field statuses surfaced (`app/page.tsx`). |
| 3:00–5:00 WS-E fixtures / eval | **Done** | `fixtures/`, `fixtures/manifest.json`, `scripts/generate-fixture-pngs.mjs`, `evals/run-primary-latency.mjs`, `tests/fixtures-manifest.test.ts` (commit `2fd9bb5`). |
| 3:00–5:00 WS-F Docker / env | **Done** | `Dockerfile`, `.dockerignore`, standalone `next.config`; README + `.env.example` for secrets and optional timeouts; local **`docker build`** validated on OrbStack. |
| 5:00–6:00 POC-1 prep | **Done** | Thresholds + contract in **`docs/POC1_FALLBACK.md`**; **`eval:primary-latency`**; **first primary data point** + **OCR blocker** in **`DAY1_COMPLETION_RECORD.md`**. |
| 6:00–6:30 Stabilization | **Done** | Lint/tests/build green on touched scope; commits `2fd9bb5`, `edcaed0`, `b479e3c`, `f5153bd`, `dee585a`, `155d047`, etc. |

### Day 2 — [`docs/DAY2_EXECUTION_CHECKLIST.md`](./DAY2_EXECUTION_CHECKLIST.md) — **closed**

Formal sign-off: **[`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md)** (2026-05-11). **Optional follow-ups** (mocked OpenAI unit tests, extra failover assertion, client error UX pass, committed eval matrix) are listed there — **non-blocking** for Day 2 outcomes.

| Block | Status | Evidence / notes |
|-------|--------|-------------------|
| **Outcomes (summary)** | **Done** | All four Day 2 outcomes satisfied in code; POC context cross-ref **Day 1** completion + logs + eval harness. |
| 0:00–0:30 Rebaseline | **Done** | Lint / test / build baseline; priorities in this file. |
| 0:30–2:00 Primary provider | **Done** | `lib/extraction/openai-provider.ts` (`gpt-4o-mini` vision + JSON + Zod). |
| 0:30–2:00 Provider **contract tests** (mocked OpenAI SDK) | **Follow-up** | Mock **`ExtractionProvider`** tests in `tests/extract-failover.test.ts`; dedicated SDK-mock file optional per **Day 2 completion**. |
| 2:00–3:30 Validator expansion | **Done** | `tests/validator.test.ts` + `manual_review` / fallback semantics in pipeline + UI. |
| 3:30–5:00 Failover orchestration | **Done** | `extractWithFailover` + tests; soft-parallel assertion = optional **follow-up** (see completion doc). |
| 3:30–5:00 Route surfaces provider metadata | **Done** | `extraction.provider`, `extraction.durationMs`, per-field reasons in JSON. |
| 5:00–6:00 UI integration + errors | **Done** | Live route-driven UI + status mix; client error UX polish = **Day 3** optional. |
| 6:00–6:30 POC + stabilization | **Done** | POC notes consolidated in **Day 2 completion** + **Day 1** primary sample; further artifacts = Day 3. |

### Day 3 — [`docs/DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md)

| Block | Status | Evidence / notes |
|-------|--------|-------------------|
| **Outcomes (summary)** | **Partial** | **Stable public URL** (Railway) + README; committed **production eval artifact** with real HTTP outcomes; **primary-path latency with OpenAI on production** blocked until **`OPENAI_API_KEY`** is set on Railway; demo polish still open. |
| 0:00–0:30 Health check | **Partial** | Local health strong; “lock Day 3 must-complete” not recorded here beyond **Next** list. |
| 0:30–2:00 Evals + open questions | **Partial** | Harness + fixtures exist; production snapshot: **[`docs/evals/primary-latency-production-2026-05-11.json`](./evals/primary-latency-production-2026-05-11.json)** (`503` / `OPENAI_NOT_CONFIGURED`). Re-run after Railway secret is set for **200** + `extraction.provider` timings. |
| 2:00–3:30 Fallback go/no-go (Tesseract metrics) | **Not started** | **No** in-app Tesseract path yet; **`docs/POC1_FALLBACK.md`** records policy/thresholds only. True go/no-go **waits Phase 2 OCR** (or an explicit pivot doc). |
| 3:30–5:00 Deploy (Railway / Render) | **Partial** | **Railway:** URL in README + smoke via eval artifact; **set `OPENAI_API_KEY`** on the service to complete end-to-end verify. **Render:** runbook **[`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md)** still valid if you switch hosts. |
| 5:00–6:00 UX / error polish | **Partial** | Usable UI; Day 3 asks for evaluator-grade clarity pass (copy, edge errors, image-quality messaging) — not fully closed out. |
| 6:00–6:45 Docs sync | **Partial** | PROGRESS + ARCHITECTURE + `docs/evals/*` updated this pass; fallback **outcome** still “OCR deferred” per README / POC1 doc. |
| 6:45–7:00 Final stabilization | **Not started** | Tied to Day 3 scope completion. |

---

## Done recently

- **Day 3 doc + eval pass (2026-05-11)** — **Railway** public URL reflected in **`README.md`**, **`docs/ARCHITECTURE.md`**, this file; production **`eval:primary-latency`** snapshot committed under **`docs/evals/`** (documents **`OPENAI_NOT_CONFIGURED`** until Railway has **`OPENAI_API_KEY`**).
- **Day 1 runbook formally closed** — **[`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md)** (POC-1 primary sample + documented OCR blocker; governance index).
- **Day 2 runbook formally closed** — **[`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md)** (Phase 1 core engine sign-off; optional follow-ups listed). **Render runbook:** [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md).
- **Phase 1 pipeline** — verify API, extraction with timeout failover to `unavailable` placeholder, validator, tests (`741ce0d`).
- **UI/UX** — light theme, workbench (label + application), formatted vs JSON application editor, results with label + field comparison + raw JSON (`fd759d6`).
- **Docs** — `docs/ARCHITECTURE.md`, `docs/modules/*`, README / AGENTS pointers; dev script and `.next` troubleshooting in README.
- **Sample asset** — `fixtures/labels/liquor_label_happy_path.png` for manual runs (`9a4c108`).
- **Day 1 closeout (committed `2fd9bb5`)** — production **`Dockerfile`** + **`.dockerignore`**, `next.config` **`output: "standalone"`**, `public/.gitkeep`; **`fixtures/`** manifest + default application JSON + nine **`seed-texture-*.png`** + **`scripts/generate-fixture-pngs.mjs`**; **`evals/run-primary-latency.mjs`** + npm script; **`docs/POC1_FALLBACK.md`**; Vitest **`fixtures-manifest`**; ESLint ignores for `scripts/**` and `evals/**`; **`pnpm-lock.yaml`** removed from workflow and **ignored**.
- **Repo hygiene (`edcaed0`)** — ignore stray **`docs/docs.code-workspace`** so local IDE files do not clutter `git status`.
- **Docker / npm-in-image stability** — `npm ci` tuned for flaky registry (parallelism limits; **no** BuildKit cache mount so **Render Metal / Railway** parse the same `Dockerfile`) so **`docker build`** succeeds when the network is healthy.
- **Verify observability & dev controls (`b479e3c`)** — structured logs for **`[extractWithFailover]`**, **`[verify-pipeline]`**, **`[verify]`** (incl. **`pipelineMs`**, **`totalMs`**, timeouts); env **`VERIFY_EXTRACT_SOFT_TIMEOUT_MS`** / **`VERIFY_EXTRACT_HARD_TIMEOUT_MS`** for local perf experiments; **`OPENAI_DISABLED`** to skip OpenAI while keeping a key; README **credits / usage** section; tests for **`OPENAI_DISABLED`**.

---

## Next (ordered)

1. **Railway:** add **`OPENAI_API_KEY`** to the production service environment, redeploy if needed, then re-run  
   `BASE_URL=https://ttb-alcohol-label-verifier-production.up.railway.app OPENAI_API_KEY=sk-... npm run eval:primary-latency`  
   and refresh **[`docs/evals/primary-latency-production-2026-05-11.json`](./evals/primary-latency-production-2026-05-11.json)** (or add a dated sibling file) so the artifact shows **200** + extraction timings.
2. Run **Day 3** items: fuller eval / correctness notes on **`liquor_label_happy_path`**, **fallback go/no-go** when Tesseract exists (`docs/DAY3_EXECUTION_CHECKLIST.md`).
3. **`docs/IMPLEMENTATION_PLAN.md` §16** — check off acceptance lines when the deliverable is intentionally signed off.
4. Optional: Day 3 **UX polish** (manual-review / provider / image-quality / client error copy) and **optional Day 2 follow-ups** in [`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md).
5. **Render (optional):** follow **[`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md)** if you want a second host; Dockerfile is shared.

---

## Blockers

None recorded in-repo. Add a dated bullet here when something external (keys, platform, fixtures) stalls work.

---

## How this relates to other docs

| Doc | Role |
|-----|------|
| `docs/DAY1–3_EXECUTION_CHECKLIST.md` | **How** to execute a day (timeboxed runbooks). Day 2 ↔ Phase 1 core engine (`WEEK_EXECUTION_OVERVIEW.md`). |
| `docs/DAY1_COMPLETION_RECORD.md` / `docs/DAY2_COMPLETION_RECORD.md` | Formal **Day 1 / Day 2 sign-off** (evidence + optional follow-ups). |
| `docs/RENDER_DEPLOY.md` | **Render** operator checklist (secrets, smoke, where to paste the public URL). |
| `docs/evals/README.md` | Index of **committed eval artifacts** (e.g. production primary-latency snapshot). |
| `docs/WEEK_EXECUTION_OVERVIEW.md` | Week map and phase gates. |
| `docs/PROGRESS.md` (this file) | **What’s done / next / blocked** in plain language. |
| `docs/ARCHITECTURE.md` | System flow and links to **per-module** detail. |
| `docs/IMPLEMENTATION_PLAN.md` §16 | Formal **acceptance** checklist for handoff. |
