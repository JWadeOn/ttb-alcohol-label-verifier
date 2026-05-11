# Module documentation

Each file below is the **living description** of one code unit: responsibilities, decisions, interfaces, and related tests. Update the matching doc when that code changes.

| Code path | Document |
|-----------|----------|
| `app/page.tsx` | [app-page.md](./app-page.md) |
| `components/ApplicationEditor.tsx` | [application-editor.md](./application-editor.md) |
| `app/layout.tsx`, `app/globals.css` | [app-layout.md](./app-layout.md) |
| `app/api/verify/route.ts` | [api-verify-route.md](./api-verify-route.md) |
| `lib/schemas.ts` | [schemas.md](./schemas.md) |
| `lib/verify-handler.ts` | [verify-handler.md](./verify-handler.md) |
| `lib/verify-pipeline.ts` | [verify-pipeline.md](./verify-pipeline.md) |
| `lib/image-quality.ts` | [image-quality.md](./image-quality.md) |
| `lib/extraction/*` | [extraction.md](./extraction.md) |
| `lib/validator.ts` | [validator.md](./validator.md) |
| `lib/levenshtein-distance.ts` | [levenshtein-distance.md](./levenshtein-distance.md) |
| `lib/canonical-warning.ts` | [canonical-warning.md](./canonical-warning.md) |
| `lib/stub-response.ts` | [stub-response.md](./stub-response.md) |
| `next.config.ts` | [next-config.md](./next-config.md) |

**System overview (flow, snapshot, maintenance):** [`../ARCHITECTURE.md`](../ARCHITECTURE.md)

---

## Vitest map (cross-module)

| Test file | Focus |
|-----------|--------|
| `tests/validator.test.ts` | Field rules, fuzzy/strict edges, import behavior. |
| `tests/image-quality.test.ts` | Tiny image reject; textured PNG accept (`tests/helpers/test-image.ts`). |
| `tests/extract-failover.test.ts` | `extractWithFailover` timing and mock providers. |
| `tests/verify-handler.test.ts` | Multipart parsing, env 503, pipeline delegation with stub. |
| `tests/application-schema.test.ts` | `ApplicationJsonSchema` acceptance/rejection. |
| `tests/stub-response.test.ts` | Stub builder + schema validity. |

`tests/fixtures/example-verify-response.json` is a sample Phase 0 JSON shape (not imported by tests; reference only unless wired later).
