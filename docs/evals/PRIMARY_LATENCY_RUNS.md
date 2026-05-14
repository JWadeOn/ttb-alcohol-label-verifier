# Primary-latency production runs (timeline)

Human-readable index of **`npm run eval:primary-latency`** against **Railway** (or another **`BASE_URL`**). Raw JSON for each run lives alongside this file; **append** new rows and **add a new dated JSON file** when you capture a meaningful snapshot — do not overwrite prior dated artifacts (so diffs and history stay honest).

For **full `POST /api/verify`** outcomes on arbitrary manifest fixtures (stress labels, validation roll-ups, **4xx** image rejects), use **`npm run eval:fixture-verify`** and optionally commit the JSON from **`EVAL_OUT`** (see **`evals/run-fixture-verify.mjs`** and **`docs/evals/README.md`**).

| Generated (UTC) | Artifact | Fixtures | Providers (per fixture) | Max `durationMs` | Notes |
|-------------------|----------|----------|-------------------------|------------------|--------|
| 2026-05-11T21:27:22Z | [`primary-latency-production-2026-05-11.json`](../internal/evals/primary-latency-production-2026-05-11.json) | 2 (seeds only) | unavailable, unavailable | 4134 | Historical baseline snapshot (archived to internal docs). |
| 2026-05-12T15:44:30Z | [`primary-latency-production-2026-05-12.json`](../internal/evals/primary-latency-production-2026-05-12.json) | 3 (happy path + seeds) | openai ×3 | 6330 | Historical baseline snapshot (archived to internal docs). |

## How to add the next run

1. Run (from repo root, with a key and **`OPENAI_DISABLED=`** if your `.env` blocks OpenAI):

   ```bash
   BASE_URL=https://ttb-alcohol-label-verifier-production.up.railway.app OPENAI_DISABLED= OPENAI_API_KEY=sk-... npm run eval:primary-latency
   ```

2. Save stdout to a **new** file: `docs/evals/primary-latency-production-YYYY-MM-DD.json` (use **`YYYY-MM-DD-HHmm`** if you need more than one run per calendar day).

3. Optionally add a short **`summary`** string inside that JSON (edit the top-level field) so the artifact stays self-describing when opened alone.

4. Append a row to the table above in **chronological order** (one row per saved JSON).

5. Mention the new artifact in **`docs/evals/README.md`** if the file list changes materially.

Bench runs (**`npm run eval:primary-latency:bench`**) can be stored the same way with a distinct prefix, e.g. `primary-latency-bench-production-2026-05-12.json`, and linked from here if you want them in the same timeline.
