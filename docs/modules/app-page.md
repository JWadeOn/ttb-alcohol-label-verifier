# Module: `app/page.tsx` (label verification UI)

## Responsibility

Client-only page: file upload, application data editor, `POST /api/verify` via `fetch`, and presentation of success/error responses for human review.

## `components/ApplicationEditor.tsx`

- **Default:** **Formatted** view — one control per `ApplicationJson` field (labels, text inputs, checkboxes, multiline for warning / name-address). Edits re-serialize to pretty-printed JSON (`JSON.stringify(..., null, 2)`) so the string sent as multipart `application` stays schema-shaped.
- **Pagination (home page):** `ApplicationEditor` receives **`formattedPageIndex`** and **`onFormattedPageChange`**; in **Formatted** mode it shows **Basics / Statements** next to **Formatted / JSON** (no duplicate field list). The **Application data** card header stays minimal so the controls and first fields appear sooner.
- **Toggle:** **JSON** view — raw textarea for power users or paste from elsewhere; keeps a taller monospace review area so the uploaded label and JSON can be checked side by side without over-compressing the text, but is explicitly framed as an input-editing view while **Results** remains the primary review surface.
- If the string is invalid JSON or fails `ApplicationJsonSchema`, formatted view shows an error panel with **Switch to JSON view to fix**.

## Behavior

- Builds `FormData` using `VERIFY_FORM_FIELDS` from `lib/schemas.ts` (`image` file, `application` JSON string).
- Main-screen application state starts blank (empty strings, import unchecked) so users enter submitted values explicitly instead of editing seeded sample text.
- Client-side upload prep: selected JPEG/PNG images over a moderate threshold are resized in-browser to **max 1800px** and re-encoded to JPEG before submit when that reduces bytes; the UI keeps the original filename in the preview heading and shows a small “optimized upload” note with the before/after sizes.
- Upload guardrail: single-image and batch selection reject files above **1.5 MB** client-side and show inline guidance before any request is sent.
- Workflow phase transitions stay gated by input validity: verify runs only when a label image is present and the application JSON passes `ApplicationJsonSchema`; results open after at least one completed run. Disabled primary actions show inline reasons for missing image, invalid application data, or image prep still running.
- Parses responses with `VerifySuccessResponseSchema` / `VerifyErrorResponseSchema` for structured UI; keeps raw JSON string for a collapsible `<details>` block.
- Demo presets: **`FixtureLoader`** (`app/components/verify/FixtureLoader.tsx`) in the page header loads committed fixture cases (synthetic + selected on-bottle photos), replacing both the current label image and application JSON with paired assets from `fixtures/`.
- Includes a lightweight **Batch** upload mode in the left upload panel: switch from **Single label** to **Batch**, select multiple images (UI cap 20, server default cap 20), submit to `POST /api/verify/batch`, and render per-file HTTP status, **durationMs**, result disposition, and **error.message** when present, plus aggregate summary inline in the same panel. Batch limits and synchronous-runtime expectations are surfaced in copy.
- **Error UX:** API failures use `verifyErrorUserHeadline` (`lib/verify-error-messages.ts`) for a plain-language headline; **Code** / **Message** from the JSON body stay visible; **HTTP status** shown as a secondary line. **Run metadata** explains **`unavailable`** extraction (placeholder + manual review) vs **`openai`**, and adds reshoot hints when image quality fails (defensive; pipeline usually rejects before success).
- **Image preview:** `URL.createObjectURL` for the selected file; revoked in `useEffect` cleanup when the file changes or unmounts.
- **Label preview** uses `next/image` with `unoptimized` for blob URLs in `app/components/verify/UploadPanel.tsx`; demo thumbnails use `next/image` against `/api/demo-cases/:id/image`.

## Workbench & workflow (home card)

- **Page chrome (above the card):** A simplified header row with **Phase 1 + Label verification** and one compact status sentence on the left, plus right-side utility buttons for **`Demo runs`** + **How this works**. The stepper was removed to reduce visual noise. Narrow viewports stack these blocks cleanly. Both utility buttons open **absolute-positioned** panels (`z-50`) so they **do not push** the workbench down; the header uses **`relative z-20`** so panels stack above the form (`z-10`). Demo entries render a thumbnail preview (`/api/demo-cases/:id/image`) so users can choose cases visually.
- **Row 1 (context strip, inside card):** Omitted on **Edit**. On **Verify**, server-status copy. On **Results**, **Outcome & field review** plus **Edit inputs** + **Verify again** (submit) on the right so the scrollable body stays focused on review; low-signal transport metadata moves down into **Run metadata**.
- **Row 2 (scrollable body):** **Edit** — two-column workbench (`UploadPanel` / `BatchPanel` + `ApplicationEditor`), shorter application header hint, lighter **Page** pager under the main **Formatted / JSON** toggle, and a mode switch in the upload panel with **Single label** selected by default and **Batch** available in the same space. **Verify** — a larger, bordered status card with `VerifyRunStepsPanel` in non-compact mode (larger heading, labels, and caption) renders a **horizontal** step strip: Request · Image · Extract · Compare, with a single caption for the active or terminal message, fed by **`buildVerifyUiStepsLoading`** then **`buildVerifyUiStepsFromResponse`**; **failed runs keep the user on Verify** so checklist errors stay here. **Results** — error banner (if any) + field comparison / raw JSON only (**no** duplicate pipeline summary).
- **Row 3 (footer):** **Edit** — primary CTA follows the active upload mode: **Run verification** in single mode or **Run batch verification** in batch mode, both with inline disabled-reason helper text when unavailable. **Verify** (after run) — **View results**; during idle pre-run — hint to use Edit inputs. **Results** — compact **Approve** / **Reject** when the success payload parses (otherwise no footer row; use header **Edit inputs** / **Run verification again**, which also shows inline disabled-reason helper text when rerun is unavailable).
- **Card height:** **Edit / Verify** use **`h-[min(88svh,680px)]`** (**`sm`:** **`min(90svh,720px)`**) so the workbench uses more of the viewport; **Results** keeps **`max-h-[min(92svh,900px)]`**. Inner padding is tighter (`p-2`, reduced gaps) to help **Edit** fit in one screen without scrolling when possible.

The native file input is **visually hidden** (`sr-only`) inside **Label preview**; **Choose label image** (empty state) and the more prominent **Change image** button use the same ref. When a file is selected, the heading reads **Label preview for `'filename'`** (truncated with `title` for full path) on one line with **Change image** on the right as a visible secondary action. The preview image is **top-aligned** (`object-top`, `items-start`) so the frame does not center it with empty space above.

## Human spot-check (Results phase)

Goal: **results first** — see pass / manual review / fail counts and a **compact field table** without scrolling through large cards. Deep inspection is optional.

| Region | Purpose |
|--------|---------|
| **At a glance** | **Headline**, one **bold workload line**, then a single **More context** `<details>` (collapsed by default). For **manual_review** / **fail**, expanding it reveals **Why this happened**, the **Next** line, the lead paragraph, shared row notes, and not-applicable explanation. In split view with the review image card, this summary card is top-aligned (`self-start`) so it does not stretch to the image card height. |
| **Review image sizing** | Results content uses a full-width desktop container and a slightly narrower right-hand review column for fail/manual-review states so the field table can stay visible without horizontal scrolling while the inline label preview remains readable (`max-h-80`). The image card is sticky on desktop while the left column stacks the summary + field table, reducing dead space under the summary and keeping image + table in view together. |
| **Field outcomes table** | One row per `validation.fields` row: **Field**, **Status**, truncated **From label** / **From application**. Long values include inline **View full** `<details>` expanders in the cell; **Government warning** rows default those expanders **open** when the cell is long enough to truncate. When a manual-review row has no confident extracted value, the table says **`No confident label text`** instead of a bare dash. |
| **Prototype scope & thresholds** | Two `<details>` blocks **below** the field table: **Prototype scope (not a TTB checklist)** (seven fixed comparisons, PRD P0 vs P1, not COLA/reg law), and **Coded match thresholds** (numeric constants from exported symbols in `lib/validator.ts`). |
| **Label image** | In **manual_review** / **fail** states, a compact **Label image used for this run** preview appears near the top so the reviewer can keep evidence in view while scanning the table. A separate **Full label image** `<details>` block stays below for a larger preview. Both use `components/LabelImageMagnifier.tsx`: optional **Magnifier** (pointer follows a circular lens; zoom 2×–4×), with layout math that respects `object-fit: contain` via `lib/object-fit-contain-rect.ts`. |
| **Full comparison by field** | `<details>` (collapsed): short intro (three columns + **not TTB policy**), legend, then **one card per field** with a clear header row, **larger vertical gap** between fields, and per-field outcome line labeled **Outcome for this field** when messages differ. Third column title **How this field is checked** (coded rule from `lib/validator.ts` / `FIELD_REQUIREMENTS` in `app/page.tsx`). |
| **Run metadata** | `<details>` (collapsed): request id, extraction provider + duration, image quality. |
| **Results footer** | On successful parse only: compact **Approve** / **Reject** (+ **Clear**), short “not saved” line when set. **Edit inputs** / **Run verification again** stay in the **Results** header. |
| **Raw API JSON** | `<details>` for debugging or copy/paste. |

## Dependencies

- `@/lib/schemas` — field names and response schemas.
- `@/lib/verify-ui-steps` — loading cursor + terminal mapping (`buildVerifyUiStepsLoading`, `buildVerifyUiStepsFromResponse`, `verifyResponseIndicatesPipelineFailure`).
- `@/lib/validator` — exported comparison thresholds (Results **Coded match thresholds**); evaluator trace: `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`.

## Related tests

`tests/object-fit-contain-rect.test.ts` (contain rect used by the magnifier). Manual: run `npm run dev`, upload image + JSON, exercise magnifier on **Results**.

## Product notes

High-level UX principles: `README.md`, `AGENTS.md`. This file is the place for **concrete UI layout** tied to this component.
