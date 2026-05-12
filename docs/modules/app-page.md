# Module: `app/page.tsx` (label verification UI)

## Responsibility

Client-only page: file upload, application data editor, `POST /api/verify` via `fetch`, and presentation of success/error responses for human review.

## `components/ApplicationEditor.tsx`

- **Default:** **Formatted** view — one control per `ApplicationJson` field (labels, text inputs, checkboxes, multiline for warning / name-address). Edits re-serialize to pretty-printed JSON (`JSON.stringify(..., null, 2)`) so the string sent as multipart `application` stays schema-shaped.
- **Pagination (home page):** `ApplicationEditor` receives **`formattedPageIndex`** and **`onFormattedPageChange`**; in **Formatted** mode it shows **Basics / Statements** next to **Formatted / JSON** (no duplicate field list). The **Application data** card header is one line: **title · hint** from **`APPLICATION_FORMATTED_PAGE_NAV`** for the active page.
- **Toggle:** **JSON** view — raw textarea for power users or paste from elsewhere.
- If the string is invalid JSON or fails `ApplicationJsonSchema`, formatted view shows an error panel with **Switch to JSON view to fix**.

## Behavior

- Builds `FormData` using `VERIFY_FORM_FIELDS` from `lib/schemas.ts` (`image` file, `application` JSON string).
- Parses responses with `VerifySuccessResponseSchema` / `VerifyErrorResponseSchema` for structured UI; keeps raw JSON string for a collapsible `<details>` block.
- **Error UX:** API failures use `verifyErrorUserHeadline` (`lib/verify-error-messages.ts`) for a plain-language headline; **Code** / **Message** from the JSON body stay visible; **HTTP status** shown as a secondary line. **Run metadata** explains **`unavailable`** extraction (placeholder + manual review) vs **`openai`**, and adds reshoot hints when image quality fails (defensive; pipeline usually rejects before success).
- **Image preview:** `URL.createObjectURL` for the selected file; revoked in `useEffect` cleanup when the file changes or unmounts.
- **Native `<img>`** for blob previews (not `next/image`): `blob:` + `next/image` has triggered broken dev runtimes in this stack; plain `img` is correct for local object URLs.

## Workbench & workflow (home card)

- **Page chrome (above the card):** A single header row (**`sm`+**): **Phase 1** + **Label verification** (left), compact **`WorkflowProcessTabs`** (**Edit** · **Verify** · **`Results`**, tooltips carry the short descriptions), **How this works** (right). Narrow viewports stack the same blocks. **`WorkflowProcessTabs`** is a **~28px-tall** segmented control (no subtitle lines in the strip). **How this works** opens an **absolute-positioned** panel (`z-50`) under the control so it **does not push** the workbench down; the header uses **`relative z-20`** so the panel stacks above the form (`z-10`).
- **Row 1 (context strip, inside card):** Omitted on **Edit**. On **Verify**, server-status copy. On **Results**, **Outcome & field review**, HTTP status when known, and **Edit inputs** + **Run again** (submit) on the right so the scrollable body stays focused on review.
- **Row 2 (scrollable body):** **Edit** — two-column workbench (label preview + `ApplicationEditor`). **Verify** — `VerifyRunStepsPanel` (**horizontal** step strip: Request · Image · Extract · Compare, with a single caption for the active or terminal message) fed by **`buildVerifyUiStepsLoading`** then **`buildVerifyUiStepsFromResponse`**; **failed runs keep the user on Verify** so checklist errors stay here. **Results** — error banner (if any) + field comparison / raw JSON only (**no** duplicate pipeline summary).
- **Row 3 (footer):** **Edit** — primary **Run verification**. **Verify** (after run) — **View results**; during idle pre-run — hint to use Edit. **Results** — compact **Approve** / **Reject** when the success payload parses (otherwise no footer row; use header **Edit inputs** / **Run again**).
- **Card height:** **Edit / Verify** use **`h-[min(88svh,680px)]`** (**`sm`:** **`min(90svh,720px)`**) so the workbench uses more of the viewport; **Results** keeps **`max-h-[min(92svh,900px)]`**. Inner padding is tighter (`p-2`, reduced gaps) to help **Edit** fit in one screen without scrolling when possible.

The native file input is **visually hidden** (`sr-only`) inside **Label preview**; **Choose label image** (empty state) and **Replace** use the same ref. When a file is selected, the heading reads **Label preview for `'filename'`** (truncated with `title` for full path) on one line with **Replace** on the right. The preview image is **top-aligned** (`object-top`, `items-start`) so the frame does not center it with empty space above.

## Human spot-check (Results phase)

Goal: **results first** — see pass / manual review / fail counts and a **compact field table** without scrolling through large cards. Deep inspection is optional.

| Region | Purpose |
|--------|---------|
| **At a glance** | **Headline**, one **bold workload line**, then a **Expand for more information** `<details>` stub with structured paragraphs (lead, next step, optional not-applicable text, shared engine message or per-field hint). |
| **Field outcomes table** | One row per `validation.fields` row: **Field**, **Status**, truncated **From label** / **From application** (`title` tooltips for full text). |
| **Prototype scope & thresholds** | Two `<details>` blocks **below** the field table: **Prototype scope (not a TTB checklist)** (seven fixed comparisons, PRD P0 vs P1, not COLA/reg law), and **Coded match thresholds** (numeric constants from exported symbols in `lib/validator.ts`). |
| **Label image** | `<details>` (collapsed by default): same preview image used for the run. |
| **Full comparison by field** | `<details>` (collapsed): short intro (three columns + **not TTB policy**), legend, then **one card per field** with a clear header row, **larger vertical gap** between fields, and per-field outcome line labeled **Outcome for this field** when messages differ. Third column title **How this field is checked** (coded rule from `lib/validator.ts` / `FIELD_REQUIREMENTS` in `app/page.tsx`). |
| **Run metadata** | `<details>` (collapsed): request id, extraction provider + duration, image quality. |
| **Results footer** | On successful parse only: compact **Approve** / **Reject** (+ **Clear**), short “not saved” line when set. **Edit inputs** / **Run again** stay in the **Results** header. |
| **Raw API JSON** | `<details>` for debugging or copy/paste. |

## Dependencies

- `@/lib/schemas` — field names and response schemas.
- `@/lib/verify-ui-steps` — loading cursor + terminal mapping (`buildVerifyUiStepsLoading`, `buildVerifyUiStepsFromResponse`, `verifyResponseIndicatesPipelineFailure`).
- `@/lib/canonical-warning` — default JSON example for government warning text.
- `@/lib/validator` — exported comparison thresholds (Results **Coded match thresholds**); evaluator trace: `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`.

## Related tests

None (client UI is not covered by Vitest in this repo). Manual: run `npm run dev`, upload image + JSON.

## Product notes

High-level UX principles: `docs/PRD.md`, `AGENTS.md`. This file is the place for **concrete UI layout** tied to this component.
