# Module: `app/page.tsx` (label verification UI)

## Responsibility

Client-only page: file upload, application data editor, `POST /api/verify` via `fetch`, and presentation of success/error responses for human review.

## `components/ApplicationEditor.tsx`

- **Default:** **Formatted** view — one control per `ApplicationJson` field (labels, text inputs, checkboxes, multiline for warning / name-address). Edits re-serialize to pretty-printed JSON (`JSON.stringify(..., null, 2)`) so the string sent as multipart `application` stays schema-shaped.
- **Toggle:** **JSON** view — raw textarea for power users or paste from elsewhere.
- If the string is invalid JSON or fails `ApplicationJsonSchema`, formatted view shows an error panel with **Switch to JSON view to fix**.

## Behavior

- Builds `FormData` using `VERIFY_FORM_FIELDS` from `lib/schemas.ts` (`image` file, `application` JSON string).
- Parses responses with `VerifySuccessResponseSchema` / `VerifyErrorResponseSchema` for structured UI; keeps raw JSON string for a collapsible `<details>` block.
- **Image preview:** `URL.createObjectURL` for the selected file; revoked in `useEffect` cleanup when the file changes or unmounts.
- **Native `<img>`** for blob previews (not `next/image`): `blob:` + `next/image` has triggered broken dev runtimes in this stack; plain `img` is correct for local object URLs.

## Workbench layout (before submit)

- **Compact header:** one line title + optional **How this works** `<details>` so the page leads with actions, not prose.
- **Primary action bar (first inside the form):** **Choose label image** + filename, and a large **Run verification** submit control—always visible above the two-column workbench.
- **Two-column grid (`lg`):** **Label preview** (subtitle: image is sent for extraction; extracted text appears in results after run) and **Application data** (`ApplicationEditor`; subtitle clarifies JSON is the “submitted application” side and rules appear in results after run). Optional dashed **Tip** banner below the form until a response exists: extracted text and requirements live under **Verification results**, not in the workbench.

The native file input is **visually hidden** (`sr-only`); the action bar and “Replace image” use the same ref to open the picker.

## Human spot-check layout (after submit)

Goal: let an agent or evaluator compare **the physical label** to **extracted vs submitted** values without reading raw JSON first.

| Region | Purpose |
|--------|---------|
| **Results — left column (lg+)** | Large label image (same bytes sent to the API); sticky on wide viewports. |
| **Results — right column** | Run summary (request id, extraction provider, duration, image quality). **Field cards:** each row from `validation.fields` as a **three-column** layout — **From label (extracted)** (sky accent), **From application (submitted)** (violet accent), **Requirement (this prototype)** (amber accent, static rule text from `FIELD_REQUIREMENTS` in `app/page.tsx`). Legend row explains the color coding. Per-field status badge, then **Outcome for this run** (validator `message`). Model confidence/reason still under extracted column. Long values scroll inside monospace boxes. |
| **Raw API JSON** | Collapsed `<details>` for debugging or copy/paste. |

## Dependencies

- `@/lib/schemas` — field names and response schemas.
- `@/lib/canonical-warning` — default JSON example for government warning text.

## Related tests

None (client UI is not covered by Vitest in this repo). Manual: run `npm run dev`, upload image + JSON.

## Product notes

High-level UX principles: `docs/PRD.md`, `AGENTS.md`. This file is the place for **concrete UI layout** tied to this component.
