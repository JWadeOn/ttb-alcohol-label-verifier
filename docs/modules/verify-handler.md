# Module: `lib/verify-handler.ts`

## Responsibility

HTTP-level handling for verify requests:

- Require `multipart/form-data`; read `image` and `application` parts per `VERIFY_FORM_FIELDS`.
- Validate image presence/size (**max 1.5 MB per image**); parse `application` as JSON, validate with `ApplicationJsonSchema`, then **`resolveApplicationForVerify`** (`lib/application-compliance.ts`): inject canonical government warning when blank and reject missing mandatory fields with **400** / `MISSING_REQUIRED_APPLICATION_FIELDS`.
- **Non-production only:** optional **`VERIFY_DEV_STUB`** (`true` / `1` / `yes`) — after application validation, respond **200** with **`buildStubVerifyResponse`** (no `OPENAI_API_KEY` required, no image `Buffer`, no pipeline, no OpenAI). Ignored when **`NODE_ENV === "production"`** so it cannot ship enabled by mistake.
- Require `OPENAI_API_KEY` (trimmed); otherwise respond before pipeline work.
- Optional **`OPENAI_DISABLED`** (`true` / `1` / `yes`) — respond **503** / `OPENAI_DISABLED` before reading image bytes or calling OpenAI (saves credits when you need the API to reject rather than return a success stub).
- Convert image `Blob` to `Buffer`, call `runVerifyPipeline` (injectable for tests).
- Map `VerifyFailedError` to JSON error responses; catch unexpected errors as `500` / `INTERNAL_ERROR`.
- Expose `POST /api/verify/batch` handling: accept `images[]` + single `application`, enforce max batch size (default **20**, env `VERIFY_BATCH_MAX_IMAGES`, clamped to 1..50), run bounded-concurrency verification (default 2, env `VERIFY_BATCH_CONCURRENCY`), and return per-item outcomes with **`durationMs`**, optional **`error.message`**, and aggregate summary counts (`totalMs` wall clock for the batch).

## HTTP and error contract

Exact messages live in source; typical mapping:

| Status | Typical `code` | When |
|--------|----------------|------|
| 200 | — | Pipeline returned schema-valid success body, or **`VERIFY_DEV_STUB`** returned the typed stub (non-production only). |
| 400 | `MISSING_IMAGE`, `EMPTY_IMAGE`, `MISSING_APPLICATION`, `INVALID_APPLICATION_JSON`, `INVALID_APPLICATION_SCHEMA`, `MISSING_REQUIRED_APPLICATION_FIELDS` | Bad multipart, JSON, or incomplete mandatory application values. |
| 413 | `IMAGE_TOO_LARGE` | Uploaded image exceeds the 1.5 MB guardrail. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Wrong content type. |
| 422 | `IMAGE_QUALITY_REJECTED` | From pipeline (`VerifyFailedError`). |
| 502 | `EXTRACTION_FAILED` | From pipeline. |
| 503 | `OPENAI_NOT_CONFIGURED` | Missing API key. |
| 503 | `OPENAI_DISABLED` | `OPENAI_DISABLED` env blocks extraction (credit-saving / UI-only dev). |
| 500 | `INTERNAL_ERROR` | Unexpected throw or response assembly failure. |

## Decisions

- **`deps.runVerifyPipeline`** default allows unit tests to inject a stub pipeline without network or OpenAI.
- All error bodies include `requestId` (UUID) for correlation.
- **Structured `console` logs** — missing `OPENAI_API_KEY` (`[verify]`); `OPENAI_DISABLED` credit-skip path (`[verify]`); **`VERIFY_DEV_STUB`** success stub (`[verify]`). Pipeline and extraction failures are logged inside `runVerifyPipeline` / `extractWithFailover` (see module docs there). Never logs secrets or uploaded bytes.

## Dependencies

- `@/lib/schemas`
- `@/lib/stub-response` (`buildStubVerifyResponse` for dev stub path)
- `@/lib/verify-pipeline` (`runVerifyPipeline`, `VerifyFailedError`)

## Related tests

- `tests/verify-handler.test.ts`
