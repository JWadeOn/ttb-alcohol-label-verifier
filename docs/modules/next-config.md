# Module: `next.config.ts`

## Responsibility

Next.js configuration for this app:

- **`output: "standalone"`** — emits a minimal server bundle for **`Dockerfile`** production images.
- **`serverExternalPackages: ["sharp"]`** — ensures `sharp` is resolved correctly for server bundles (image quality pipeline).
- **`outputFileTracingRoot`** — scopes output file tracing to this package root when multiple `package-lock.json` files exist up the directory tree (monorepo / eval layout hygiene).

## Decisions

- Keep config minimal; deployment target and env vars are documented in `README.md`.

## Dependencies

- `next`
- Node `path` / `url` for `import.meta.url` resolution

## Related tests

None (build-time concern); verify with `npm run build`.

## Troubleshooting (dev)

If **`next dev`** logs **React Client Manifest** / **`ViewportBoundary`** / **`segment-explorer-node`** errors after HMR, clear **`.next`** and restart (see **`README.md`** → Dev server issues). **`npm run build`** is the sanity check that the app compiles outside dev overlay quirks.
