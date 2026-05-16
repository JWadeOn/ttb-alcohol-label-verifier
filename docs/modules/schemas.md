# Module: `lib/schemas.ts`

## Responsibility

**Single contract source** for:

- Multipart field names (`VERIFY_FORM_FIELDS`).
- Application JSON shape (`ApplicationJsonSchema` / `ApplicationJson`) — field keys are optional in Zod; **mandatory distilled-spirits values** are enforced in `lib/application-compliance.ts` (client readiness + validator comparison policy).
- Field IDs, field statuses, validation row shape.
- API success envelope (`VerifySuccessResponseSchema`) and error envelope (`VerifyErrorResponseSchema`).

## Decisions

- **Zod + inferred types** keep server, client, and tests aligned on the same shapes.
- `ApplicationJsonSchema` is `.strict()` so unknown keys fail fast; blank required values are rejected by the compliance layer, not by making Zod fields required.
- `VerifySuccessResponseSchema.extraction.fields` is `z.record(z.unknown())` so extraction payloads stay flexible while top-level response shape stays validated.

## Dependencies

- `zod`

## Related tests

- `tests/application-schema.test.ts`
- `tests/verify-handler.test.ts` (response parsing)
- `tests/stub-response.test.ts` (success body shape)
