# Module: `lib/verify-handler.ts`

## Responsibility

HTTP-level handling for verify requests:

- Require `multipart/form-data`; read `image` and `application` parts per `VERIFY_FORM_FIELDS`.
- Validate image presence/size; parse `application` as JSON and validate with `ApplicationJsonSchema`.
- Require `OPENAI_API_KEY` (trimmed); otherwise respond before pipeline work.
- Convert image `Blob` to `Buffer`, call `runVerifyPipeline` (injectable for tests).
- Map `VerifyFailedError` to JSON error responses; catch unexpected errors as `500` / `INTERNAL_ERROR`.

## HTTP and error contract

Exact messages live in source; typical mapping:

| Status | Typical `code` | When |
|--------|----------------|------|
| 200 | — | Pipeline returned schema-valid success body. |
| 400 | `MISSING_IMAGE`, `EMPTY_IMAGE`, `MISSING_APPLICATION`, `INVALID_APPLICATION_JSON`, `INVALID_APPLICATION_SCHEMA` | Bad multipart or JSON. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Wrong content type. |
| 422 | `IMAGE_QUALITY_REJECTED` | From pipeline (`VerifyFailedError`). |
| 502 | `EXTRACTION_FAILED` | From pipeline. |
| 503 | `OPENAI_NOT_CONFIGURED` | Missing API key. |
| 500 | `INTERNAL_ERROR` | Unexpected throw or response assembly failure. |

## Decisions

- **`deps.runVerifyPipeline`** default allows unit tests to inject a stub pipeline without network or OpenAI.
- All error bodies include `requestId` (UUID) for correlation.

## Dependencies

- `@/lib/schemas`
- `@/lib/verify-pipeline` (`runVerifyPipeline`, `VerifyFailedError`)

## Related tests

- `tests/verify-handler.test.ts`
