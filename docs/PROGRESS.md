# Progress (living)

Short **human index** of where the prototype stands. **Git history** remains the audit trail; **`docs/ARCHITECTURE.md`** stays the technical “what exists now.” Update this file when focus or shipped scope changes meaningfully.

**Last updated:** 2026-05-12

---

## Current focus

Phase 1 **core path** is shipped; **Day 1** and **Day 2** are formally closed — **[`DAY1_COMPLETION_RECORD.md`](./DAY1_COMPLETION_RECORD.md)**, **[`DAY2_COMPLETION_RECORD.md`](./DAY2_COMPLETION_RECORD.md)**. Optional quality follow-ups stay listed in the Day 2 completion doc (they do not reopen the runbook).

**Live prototype:** **Railway** — [https://ttb-alcohol-label-verifier-production.up.railway.app](https://ttb-alcohol-label-verifier-production.up.railway.app) (see `README.md`). **Render** remains a documented alternate ([`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md)).

**Next emphasis:** optional **Day 3 UX polish** ([`DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md)); **Track B** real-photo fixtures (alternate label stock) if evaluators want contrast/segmentation depth beyond Track A. **`docs/IMPLEMENTATION_PLAN.md` §16** acceptance **signed off 2026-05-12** (all items checked with evidence). Production primary-latency timeline: **[`docs/evals/PRIMARY_LATENCY_RUNS.md`](./evals/PRIMARY_LATENCY_RUNS.md)**; scored correctness: **`docs/evals/CORRECTNESS_THRESHOLDS.md`**, `fixture-correctness-*.json`.

**Shipped on `main` (Results / human review, 2026-05-12):** results-first layout — **Edit inputs** / **Run again** in the **Results** header; compact **Approve** / **Reject** / **Clear** disposition in the footer (browser-only, not persisted); outcome summary trimmed to headline + roll-up line with **Expand for more information** `<details>` for the long guidance; module notes in **`docs/modules/app-page.md`** (see commits **`34ac8ac`**, **`fcdc897`**).

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
| **Outcomes (summary)** | **Partial** | **§16 acceptance signed (2026-05-12)** — [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §16 + §10.6 evidence; **Railway** + eval/correctness artifacts under **`docs/evals/`**; **fallback** formally **deferred** (`POC1_FALLBACK`); **F-14** **out of scope**. Remaining: optional UX polish + broader real-photo fixtures (not blockers for sign-off). |
| 0:00–0:30 Health check | **Partial** | Local health strong; “lock Day 3 must-complete” not recorded here beyond **Next** list. |
| 0:30–2:00 Evals + open questions | **Partial** | Harness + fixtures + **scored** `eval:fixture-verify` + thresholds doc; production run log **[`docs/evals/PRIMARY_LATENCY_RUNS.md`](./evals/PRIMARY_LATENCY_RUNS.md)** — **200** + **`openai`** on three fixtures in latest snapshot. Further real-photo taxonomy = optional depth. |
| 2:00–3:30 Fallback go/no-go (Tesseract metrics) | **Closed (defer)** | **No** in-app Tesseract path. **Formal defer** + unchanged POC-1 thresholds: **[`docs/POC1_FALLBACK.md`](./POC1_FALLBACK.md)** (2026-05-12); shipped **`unavailable`** placeholder; Phase 2 implements measurable OCR if needed. |
| 3:30–5:00 Deploy (Railway / Render) | **Partial** | **Railway:** URL + **`OPENAI_API_KEY`** + production eval **200** / **`openai`** on primary-latency fixtures (see **`docs/evals/`**). **Render:** runbook **[`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md)** still valid if you switch hosts. |
| 5:00–6:00 UX / error polish | **Partial** | **Shipped:** Results human-review flow, **friendlier API error headlines** (`lib/verify-error-messages.ts`), HTTP line + code/message, **`unavailable`** / image-quality hints in run metadata (`app/page.tsx`). **Still open:** optional pass on every edge status code + usability test notes. |
| 6:00–6:45 Docs sync | **Partial** | **`docs/modules/app-page.md`**, **`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`**, this **PROGRESS** file (2026-05-12); **`docs/POC1_FALLBACK.md`** + plan/README alignment for fallback defer; ARCHITECTURE when flow changes. |
| 6:45–7:00 Final stabilization | **Not started** | Tied to Day 3 scope completion. |

---

## Done recently

- **Results / human-review UI (`main`, 2026-05-12)** — **`34ac8ac`**: Results header **Edit inputs** / **Run again**; footer **Approve** / **Reject** / **Clear** (client-only); denser outcome summary; **`fcdc897`**: long guidance moved into **Expand for more information** `<details>`; **`docs/modules/app-page.md`** and **`docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`** updated alongside **`34ac8ac`**.
- **Day 3 UX copy (2026-05-12)** — user-facing **`verifyErrorUserHeadline`** for `/api/verify` errors (`lib/verify-error-messages.ts` + tests); Results error panel shows HTTP line + friendlier lead; run metadata explains **`unavailable`** vs **`openai`** and adds image-quality reshoot hints; network / non-JSON handling copy in **`app/page.tsx`**; **`docs/modules/app-page.md`** updated.
- **§16 acceptance sign-off (2026-05-12)** — [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §16 all items **[x]** with evidence bullets + §**10.6** shipped eval links; **F-14** marked **out of prototype scope** in §5; **F-16** aligned with Phase 2 defer. [`docs/COMPREHENSIVE_IMPLEMENTATION_PLAN.md`](./COMPREHENSIVE_IMPLEMENTATION_PLAN.md) §9–§10 + changelog; [`docs/CORE_REQUIREMENTS_SCORECARD.md`](./CORE_REQUIREMENTS_SCORECARD.md) updated.
- **Fallback policy formalized (2026-05-12)** — **`docs/POC1_FALLBACK.md`**: explicit **defer** of Tesseract/local OCR + reopen criteria; **`README.md`**, **`docs/IMPLEMENTATION_PLAN.md`** (§2.2–§2.3, F-4, §3.1, §15), **`docs/COMPREHENSIVE_IMPLEMENTATION_PLAN.md`** (§7.3, §12), **`docs/modules/extraction.md`** aligned.
- **Fixture correctness scoring (2026-05-12)** — `evals/run-fixture-verify.mjs` now supports expectations-driven scoring (`EVAL_EXPECTATIONS`, default `docs/evals/fixture-correctness-expectations.json`) with per-check and threshold pass/fail output. Added `docs/evals/CORRECTNESS_THRESHOLDS.md`, initial scored artifact `docs/evals/fixture-correctness-2026-05-12.json`, expanded matrix `docs/evals/fixture-correctness-expanded-2026-05-12.json`, and non-seed edge matrix `docs/evals/fixture-correctness-non-seed-edge-2026-05-12.json` (Railway base; adds glare/blur/tilt fixtures from `npm run fixtures:edge-labels`).
- **Track B B1 (2026-05-12)** — shipped `st_petersburg_whiskey_label_dark_baseline` (dark-label whiskey front-on); wired in manifest + `fixture-correctness-expectations.json`; see **`docs/fixtures/st-petersburg-golden-next.md`** for B2–B4 prompts. Next: **`st_petersburg_whiskey_label_dark_glare`**, **`st_petersburg_whiskey_label_kraft_baseline`**.
- **Single-command fixture suite selection (2026-05-12)** — `evals/run-fixture-verify.mjs` now accepts **`EVAL_FIXTURE_SET`** presets (`st_petersburg`, `edge_synthetic`, `seed_textures`, `all_manifest`) so full suites run without manual comma-separated id entry. `docs/evals/README.md` usage row updated.
- **Eval run timeline (2026-05-12)** — **`docs/evals/PRIMARY_LATENCY_RUNS.md`** append-only table; **`primary-latency-production-2026-05-12.json`** added; **`2026-05-11`** snapshot restored as historical baseline; **`docs/evals/README.md`**, **PROGRESS**, **IMPLEMENTATION_PLAN**, **README** cross-links updated.
- **Extraction defaults + production eval (`main`, 2026-05-12)** — default soft/hard extract timeouts **8000 / 20000** ms (`lib/verify-pipeline.ts`, `lib/extraction/provider.ts` fallbacks); **`liquor_label_happy_path.png`** in **`includeInPrimaryLatencyEval`**; production **`eval:primary-latency`** (**`openai`** on three fixtures). README / **`.env.example`** / **`docs/evals/README.md`** aligned (`265885e`).
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

1. Optional **Day 3 UX polish** (edge errors, image-quality / provider copy) — [`DAY3_EXECUTION_CHECKLIST.md`](./DAY3_EXECUTION_CHECKLIST.md).  
2. Optional **Track B** fixture expansion (remaining: **`st_petersburg_whiskey_label_dark_glare`**, **`st_petersburg_whiskey_label_kraft_baseline`**, optional **`st_petersburg_vodka_label_dark_baseline`**) for contrast/segmentation credibility beyond cream-label Track A.  
3. **`git push`** when you want `origin/main` caught up to local commits.  
4. **Render (optional):** [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md) second host.

---

## Blockers

None recorded in-repo. Add a dated bullet here when something external (keys, platform, fixtures) stalls work.

---

## How this relates to other docs

| Doc | Role |
|-----|------|
| `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md` | **Evaluator:** PRD vs code vs regulatory reality; where checks run; traceability table. |
| `docs/CORE_REQUIREMENTS_SCORECARD.md` | Take-home rubric mapping: **what we need / have / gap** with evidence links. |
| `docs/COMPREHENSIVE_IMPLEMENTATION_PLAN.md` | **Canonical merged plan:** scope, as-built pipeline, phases, eval strategy, backlog, acceptance. |
| `docs/DAY1–3_EXECUTION_CHECKLIST.md` | **How** to execute a day (timeboxed runbooks). Day 2 ↔ Phase 1 core engine (`WEEK_EXECUTION_OVERVIEW.md`). |
| `docs/DAY1_COMPLETION_RECORD.md` / `docs/DAY2_COMPLETION_RECORD.md` | Formal **Day 1 / Day 2 sign-off** (evidence + optional follow-ups). |
| `docs/RENDER_DEPLOY.md` | **Render** operator checklist (secrets, smoke, where to paste the public URL). |
| `docs/evals/README.md` | Index of **committed eval artifacts**. |
| `docs/evals/PRIMARY_LATENCY_RUNS.md` | **Timeline** of production **`eval:primary-latency`** runs (append-only table + dated JSON files). |
| `docs/WEEK_EXECUTION_OVERVIEW.md` | Week map and phase gates. |
| `docs/PROGRESS.md` (this file) | **What’s done / next / blocked** in plain language. |
| `docs/ARCHITECTURE.md` | System flow and links to **per-module** detail. |
| `docs/IMPLEMENTATION_PLAN.md` §16 | Formal **acceptance** checklist for handoff. |
