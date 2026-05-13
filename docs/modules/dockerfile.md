# Module: `Dockerfile` + `.dockerignore`

## Responsibility

**Production container** for the Next.js app using **`output: "standalone"`** (`next.config.ts`). Target host: **Render** (see `README.md`).

## Build / run

```bash
npm run docker:build
docker run --rm -p 3000:3000 -e OPENAI_API_KEY=sk-... ttb-label-verifier:local
```

## Decisions

- **`deps` stage:** `npm_config_fetch_*` env vars around plain `npm ci` (no `RUN --mount=type=cache`): **Render's Metal builder** validates cache-mount `id=` against a **service-scoped cacheKey prefix**, which cannot be represented portably in a shared repo Dockerfile. **Docker layer cache** still avoids re-running `npm ci` when `package.json` / `package-lock.json` are unchanged.
- **Install stability:** limit npm parallelism (`npm_config_jobs=1`, `npm_config_maxsockets=1`) and disable audit/fund during `npm ci` to reduce the number of concurrent registry requests that can trigger `ECONNRESET` in Docker/OrbStack builds.
- **Alpine + Node 22** for a small image; `libc6-compat` for native modules.
- **No Tesseract in image yet** — OCR fallback is Phase 2; the Dockerfile satisfies Day 1 / deployment **baseline** (image builds and runs the current stack).
- **`.dockerignore`** omits `tests`, `docs`, `fixtures`, `evals`, and `scripts` from the build context to keep the layer small.

## Related tests

None; validate with `npm run docker:build` locally.

## See also

- `README.md` deployment section — current public deployment and runtime expectations.
