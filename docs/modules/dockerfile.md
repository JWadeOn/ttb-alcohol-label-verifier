# Module: `Dockerfile` + `.dockerignore`

## Responsibility

**Production container** for the Next.js app using **`output: "standalone"`** (`next.config.ts`). Target host: **Railway** (see `README.md` deployment section).

## Build / run

```bash
npm run docker:build
docker run --rm -p 3000:3000 -e OPENAI_API_KEY=sk-... ttb-label-verifier:local
```

## Decisions

- **`deps` stage:** `npm_config_fetch_*` env vars around plain `npm ci` (no `RUN --mount=type=cache`): avoids BuildKit cache-mount `id=` quirks on hosted builders and keeps local/Railway builds consistent. **Docker layer cache** still avoids re-running `npm ci` when `package.json` / `package-lock.json` are unchanged.
- **Install stability:** limit npm parallelism (`npm_config_jobs=1`, `npm_config_maxsockets=1`) and disable audit/fund during `npm ci` to reduce the number of concurrent registry requests that can trigger `ECONNRESET` in Docker/OrbStack builds.
- **Alpine + Node 22** for a small image; `libc6-compat` for native modules.
- **No Tesseract in image yet** — OCR fallback is Phase 2; the Dockerfile satisfies Day 1 / deployment **baseline** (image builds and runs the current stack).
- **`.dockerignore`** omits `tests`, `docs`, `evals`, and `scripts` from the build context. **`fixtures/`** is included in the image (~16MB) so `/api/demo-cases/*` can serve demo picker thumbnails and load paired application JSON in production.

## Railway

- Connect the GitHub repo to a Railway service and deploy from **`main`** (or your release branch).
- Railway builds this **`Dockerfile`** and runs the standalone Node server on **`PORT`** (Railway sets this automatically).
- Set service variables at minimum: **`OPENAI_API_KEY`** (required for default hybrid verify). Optional: `VERIFY_EXTRACTION_MODE`, `VERIFY_OCR_TIMEOUT_MS`, `VERIFY_EXTRACT_SOFT_TIMEOUT_MS`, `VERIFY_EXTRACT_HARD_TIMEOUT_MS` (see `README.md` — defaults avoid hitting Railway’s ~300s request limit).
- After deploy, production evals use `BASE_URL=https://ttb-alcohol-label-verifier-production.up.railway.app` (default in `npm run eval:fixture-verify:prod`).

## Related tests

None; validate with `npm run docker:build` locally.

## See also

- `README.md` deployment section — public Railway URL and runtime expectations.
- `docs/ARCHITECTURE.md` — system snapshot including public deploy.
