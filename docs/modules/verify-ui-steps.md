# Module: `lib/verify-ui-steps.ts`

## Responsibility

Pure helpers for the home page **Verify** tab checklist:

- **`buildVerifyUiStepsLoading(activeIndex)`** — while `POST /api/verify` is in flight, the UI advances **`activeIndex`** (0…3) on a timer so **one** stage is **`running`**, earlier stages are **`upstream`** (on server, not yet finalized), and later stages stay **`pending`**. This is **client-side sequencing** only; the server still completes in one response. **`VerifyRunStepsPanel`** renders these as a **horizontal** step row (short labels + caption line).
- **`buildVerifyUiStepsFromResponse(...)`** — after the response, maps HTTP status / `code` / body to terminal **`complete`**, **`failed`**, or **`skipped`** per stage.
- **`verifyResponseIndicatesPipelineFailure(...)`** — returns true when there is no parsed success payload but there is an error body or client error text (used to land on **Verify** after a failed run instead of **Results**).

## Behavior

- **Success** — all **`complete`**; if `extraction.provider === "unavailable"`, adds an **footnote** on extraction.
- **Typed errors** — uses `errorPayload.code` to decide which step **`failed`** and which are **`skipped`** (aligned with `verify-handler.ts` / `verify-pipeline.ts`).
- **Untyped `errorText`** — **`inputs`** **`failed`** with footnote.
- **HTTP 200 without parsed success** — comparison **`failed`** with schema-mismatch note.

## Dependencies

- `@/lib/schemas` — `VerifySuccessResponse`, `VerifyErrorResponse` types.

## Related tests

- `tests/verify-ui-steps.test.ts`

## See also

- [`verify-pipeline.md`](./verify-pipeline.md) — real server order (image quality → extraction → validation).
- [`app-page.md`](./app-page.md) — where these helpers are consumed.
