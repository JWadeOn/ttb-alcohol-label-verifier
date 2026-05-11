# Progress (living)

Short **human index** of where the prototype stands. **Git history** remains the audit trail; **`docs/ARCHITECTURE.md`** stays the technical “what exists now.” Update this file when focus or shipped scope changes meaningfully.

**Last updated:** 2026-05-11

---

## Current focus

Phase 1 **core path** is in place (image quality → OpenAI extraction → deterministic validation); next emphasis is **eval evidence, deploy smoke on Render, and Day 3 polish** (errors, manual-review copy) per `docs/DAY3_EXECUTION_CHECKLIST.md`.

---

## Done recently

- **Phase 1 pipeline** — verify API, extraction with timeout failover to `unavailable` placeholder, validator, tests (`741ce0d`).
- **UI/UX** — light theme, workbench (label + application), formatted vs JSON application editor, results with label + field comparison + raw JSON (`fd759d6`).
- **Docs** — `docs/ARCHITECTURE.md`, `docs/modules/*`, README / AGENTS pointers; dev script and `.next` troubleshooting in README.
- **Sample asset** — `fixtures/labels/liquor_label_happy_path.png` for manual runs (`9a4c108`).
- **Day 1 completion (remaining checklist)** — `Dockerfile` + `.dockerignore` + `next.config` **`output: "standalone"`**; **`fixtures/`** manifest, default application JSON, nine deterministic `seed-texture-*.png` generators; **`evals/run-primary-latency.mjs`** + `npm run eval:primary-latency`; **`docs/POC1_FALLBACK.md`** thresholds + measurement contract; Vitest **`fixtures-manifest`** coverage.

---

## Next (ordered)

1. **Render:** push image, configure secrets, capture public URL; paste smoke results into README / here.
2. Run **Day 3** items: fuller eval pass on `liquor_label_happy_path` + notes, **fallback go/no-go** when Tesseract exists (`docs/DAY3_EXECUTION_CHECKLIST.md`).
3. **`docs/IMPLEMENTATION_PLAN.md` §16** — check off acceptance lines when the deliverable is intentionally signed off.
4. Optional: Day 3 **UX polish** block (manual-review / provider / image-quality messaging) if anything still feels unclear in a fresh walkthrough.

---

## Blockers

None recorded in-repo. Add a dated bullet here when something external (keys, platform, fixtures) stalls work.

---

## How this relates to other docs

| Doc | Role |
|-----|------|
| `docs/DAY1–3_EXECUTION_CHECKLIST.md` | **How** to execute a day (timeboxed runbooks). |
| `docs/WEEK_EXECUTION_OVERVIEW.md` | Week map and phase gates. |
| `docs/PROGRESS.md` (this file) | **What’s done / next / blocked** in plain language. |
| `docs/ARCHITECTURE.md` | System flow and links to **per-module** detail. |
| `docs/IMPLEMENTATION_PLAN.md` §16 | Formal **acceptance** checklist for handoff. |
