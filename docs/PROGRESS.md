# Progress (living)

Short **human index** of where the prototype stands. **Git history** remains the audit trail; **`docs/ARCHITECTURE.md`** stays the technical “what exists now.” Update this file when focus or shipped scope changes meaningfully.

**Last updated:** 2026-05-11

---

## Current focus

Phase 1 **core path** is shipped and **Day 1 closeout is committed** (Docker + fixtures + eval scaffold + docs).

**Day 2 is not skipped in the plan** — it lives in **`docs/DAY2_EXECUTION_CHECKLIST.md`** and aligns with **Phase 1 — Core Engine** in **`docs/WEEK_EXECUTION_OVERVIEW.md`**. Most Day 2 *outcomes* (primary OpenAI provider, validator + tests, `extractWithFailover`, UI on live `/api/verify`) **already landed** in earlier Phase 1 commits (`741ce0d`, `fd759d6`, related tests), so recent “next” emphasis jumped to **deploy + evidence + polish** (Day 3 / Render / §16) without saying that loudly enough. **Still do:** an explicit **Day 2 sign-off pass** (checklist vs repo + POC notes + any error-UX gaps).

---

## Done recently

- **Day 2 / Phase 1 core engine (substantially complete in tree)** — per **`docs/DAY2_EXECUTION_CHECKLIST.md`**: primary extraction behind the provider interface, deterministic validator with tests, soft/hard failover orchestration, UI driven by real verify responses (see Phase 1 / UI bullets below). Formal checklist walk and POC write-ups remain as **sign-off**, not greenfield implementation.
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
