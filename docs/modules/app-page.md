# Module: `app/page.tsx` (label verification UI)

## Responsibility

Client-only page: file upload, application data editor, `POST /api/verify` via `fetch`, and presentation of success/error responses for human review.

## `components/ApplicationEditor.tsx`

- **Default:** **Formatted** view — one control per `ApplicationJson` field (labels, text inputs, checkboxes, multiline for warning / name-address). Edits re-serialize to pretty-printed JSON (`JSON.stringify(..., null, 2)`) so the string sent as multipart `application` stays schema-shaped.
- **Formatted editor layout:** home page uses compact formatted mode with a responsive two-column field grid so shorter fields share rows and all fields can be edited in one view.
- **Toggle:** **JSON** view — raw textarea for power users or paste from elsewhere; keeps a taller monospace review area so the uploaded label and JSON can be checked side by side without over-compressing the text, but is explicitly framed as an input-editing view while **Results** remains the primary review surface.
- If the string is invalid JSON or fails `ApplicationJsonSchema`, formatted view shows an error panel with **Switch to JSON view to fix**.

## Behavior

- Builds `FormData` using `VERIFY_FORM_FIELDS` from `lib/schemas.ts` (`image` file, `application` JSON string).
- Main-screen application state starts blank (empty strings, import unchecked) so users enter submitted values explicitly instead of editing seeded sample text.
- Client-side upload prep: selected JPEG/PNG images over a moderate threshold are resized in-browser to **max 1800px** and re-encoded to JPEG before submit when that reduces bytes; the UI keeps the original filename in the preview heading and shows a small “optimized upload” note with the before/after sizes.
- Upload guardrail: single-image and batch selection reject files above **1.5 MB** client-side and show inline guidance before any request is sent.
- Workflow phase transitions stay gated by input validity: verify runs only when a label image is present and mandatory application fields are present (`checkApplicationReadyForVerify` via `lib/application-compliance.ts`). Before submit, `ensureApplicationComplianceJson` injects the canonical government warning when formatted mode left it blank. Disabled primary actions show inline reasons for missing image, missing required fields, or image prep still running.
- Parses responses with `VerifySuccessResponseSchema` / `VerifyErrorResponseSchema` for structured UI; keeps raw JSON string for a collapsible `<details>` block.
- Demo presets: **`FixtureLoader`** (`app/components/verify/FixtureLoader.tsx`) in the page header loads committed fixture cases (synthetic + selected on-bottle photos), replacing both the current label image and application JSON with paired assets from `fixtures/`.
- Includes a **Batch** upload mode: switch from **Single label** to **Batch**, upload matched label images (left) and application JSON files (right), then submit to `POST /api/verify/batch`. On success the workflow opens the **Results** phase (same as single-label), not inline tables in the upload panel.
- **Error UX:** API failures use `verifyErrorUserHeadline` (`lib/verify-error-messages.ts`) for a plain-language headline; **Code** / **Message** from the JSON body stay visible; **HTTP status** shown as a secondary line. **Run metadata** explains **`unavailable`** extraction (placeholder + manual review) vs **`openai`**, and adds reshoot hints when image quality fails (defensive; pipeline usually rejects before success).
- **Image preview:** `URL.createObjectURL` for the selected file; revoked in `useEffect` cleanup when the file changes or unmounts.
- **Label preview** uses `next/image` with `unoptimized` for blob URLs in `app/components/verify/UploadPanel.tsx`; demo thumbnails use `next/image` against `/api/demo-cases/:id/image`.

## Workbench & workflow (home card)

- **Page chrome (above the card):** A simplified header row with **Phase 1 + Label verification** and one compact status sentence on the left, plus right-side utility buttons for **`Demo runs`** + **How this works**. The stepper was removed to reduce visual noise. Narrow viewports stack these blocks cleanly. Both utility buttons open **absolute-positioned** panels (`z-50`) so they **do not push** the workbench down; the header uses **`relative z-20`** so panels stack above the form (`z-10`). Demo entries render a thumbnail preview (`/api/demo-cases/:id/image`) so users can choose cases visually.
- **Row 1 (context strip, inside card):** Omitted on **Edit**. On **Verify**, server-status copy. On **Results**, **Outcome & field review** (single-label) or **Batch outcome & review** (batch) with a short pointer to footer actions; single-label **Approve** / **Reject** stay on the right (batch uses per-application disposition in the results body). Low-signal transport metadata moves down into **Run metadata** (single-label only).
- **Row 2 (scrollable body):** **Edit** — two-column workbench (`UploadPanel` / `BatchPanel` + `ApplicationEditor` or `BatchApplicationsPanel`) with compact headers and a **Single label** / **Batch** mode switch. **Verify** — single-label runs use `VerifyRunStepsPanel`; **Batch** runs show `BatchVerifyProgressPanel` (prepare → processing → finishing, per-file queue). On batch completion, workflow advances to **Results**. **Results** — single-label: `ResultsSummaryCard` + `FieldOutcomesTable` + optional deep comparison blocks; **batch**: `BatchResultsView` (summary card with Pass / Needs review / Fail / **Error** filter tags, applications table, collapsed per-application `FieldOutcomesTable` or error panel). Per-application **Approve** / **Reject** uses `ReviewDispositionCompact` on table rows and collapsible headers (`Record<index, disposition>` in page state).
- **Row 3 (footer):** **Edit** — **Run verification** or **Run batch verification** with disabled-reason helper text. **Verify** (after run) — **View results** / **View batch results**; during loading — progress copy. **Results** — **Edit inputs** + **Run verification again** or **Run batch verification again** (respects `canSubmit` / `canRunBatch`).
- **Card height:** **Edit / Verify** use **`h-[min(88svh,680px)]`** (**`sm`:** **`min(90svh,720px)`**) so the workbench uses more of the viewport; **Results** keeps **`max-h-[min(92svh,900px)]`**. Inner padding is tighter (`p-2`, reduced gaps) to help **Edit** fit in one screen without scrolling when possible.

The native file input is **visually hidden** (`sr-only`) inside **Label preview**; **Choose label image** (empty state) and the more prominent **Change image** button use the same ref. When a file is selected, the heading reads **Label preview for `'filename'`** (truncated with `title` for full path) on one line with **Change image** on the right as a visible secondary action. The preview image is **top-aligned** (`object-top`, `items-start`) so the frame does not center it with empty space above.

## Human spot-check (Results phase)

Goal: **results first** — see pass / manual review / fail counts and a **compact field table** without scrolling through large cards. Deep inspection is optional.

### Batch results (`BatchResultsView`)

| Region | Purpose |
|--------|---------|
| **Batch summary card** | Overall batch headline (pass / fail / needs review / mixed) from `lib/batch-results.ts` `buildBatchResultsDigest`; filter tags with **application counts** for Pass, Needs review, Fail, and **Error** (HTTP/pipeline failures per item); secondary line with `summary.total`, `totalMs`, success vs error counts. |
| **Applications table** | One row per batch item: label file, status badge, duration, compact disposition controls, **Expand** affordance; row click scrolls to and opens the matching `<details>` below. |
| **Field detail by application** | Collapsed `<details>` per item (controlled open state in page); success items reuse `FieldOutcomesTable`; error items show code/message panel (no field table). Filtered by the same application-level tag as the table. |
| **Footer** | **Edit inputs** + **Run batch verification again** (no batch-wide Approve/Reject). |

Pure helpers: `deriveBatchItemOutcome`, `filterBatchItems` in `lib/batch-results.ts` (unit-tested in `tests/batch-results.test.ts`).

### Single-label results

| Region | Purpose |
|--------|---------|
| **At a glance** | **Headline**, status filter tags, extraction path line, then a **Next steps & context** `<details>` (collapsed by default) with scannable bullets: review action (mismatches / flagged fields / outcomes), optional **Skipped fields** (e.g. country of origin when not import), and **Review AI logic** pointing to **Full comparison by field**. In split view with the review image card, this summary card is top-aligned (`self-start`) so it does not stretch to the image card height. |
| **Review image sizing** | Results content uses a full-width desktop container and a slightly narrower right-hand review column for fail/manual-review states so the field table can stay visible without horizontal scrolling while the inline label preview remains readable (`max-h-80`). The image card is sticky on desktop while the left column stacks the summary + field table, reducing dead space under the summary and keeping image + table in view together. |
| **Field outcomes table** | One row per `validation.fields` row: **Field**, **Status**, truncated **From label** / **From application**. Long values include inline **View full** `<details>` expanders in the cell; **Government warning** rows default those expanders **open** when the cell is long enough to truncate. When a manual-review row has no confident extracted value, the table says **`No confident label text`** instead of a bare dash. |
| **Prototype scope & thresholds** | Two `<details>` blocks **below** the field table: **Prototype scope (not a TTB checklist)** (seven fixed comparisons, PRD P0 vs P1, not COLA/reg law), and **Coded match thresholds** (numeric constants from exported symbols in `lib/validator.ts`). |
| **Label image** | In **manual_review** / **fail** states, a compact **Label image used for this run** preview appears near the top so the reviewer can keep evidence in view while scanning the table. A separate **Full label image** `<details>` block stays below for a larger preview. Both use `components/LabelImageMagnifier.tsx`: optional **Magnifier** (pointer follows a circular lens; zoom 2×–4×), with layout math that respects `object-fit: contain` via `lib/object-fit-contain-rect.ts`. |
| **Full comparison by field** | `<details>` (collapsed): short intro (three columns + **not TTB policy**), legend, then **one card per field** with a clear header row, **larger vertical gap** between fields, and per-field outcome line labeled **Outcome for this field** when messages differ. Third column title **How this field is checked** (coded rule from `lib/validator.ts` / `FIELD_REQUIREMENTS` in `app/page.tsx`). |
| **Run metadata** | `<details>` (collapsed): request id, extraction provider + duration, image quality. |
| **Results footer** | Sticky bar: **Edit inputs** + **Run verification again** (re-runs current image + application). **Approve** / **Reject** live in the results header strip (`ReviewDispositionControls`). |
| **Raw API JSON** | `<details>` for debugging or copy/paste. |

## Dependencies

- `@/lib/schemas` — field names and response schemas.
- `@/lib/verify-ui-steps` — loading cursor + terminal mapping (`buildVerifyUiStepsLoading`, `buildVerifyUiStepsFromResponse`, `verifyResponseIndicatesPipelineFailure`).
- `@/lib/validator` — exported comparison thresholds (Results **Coded match thresholds**); evaluator trace: `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`.

## Related tests

`tests/object-fit-contain-rect.test.ts` (contain rect used by the magnifier). Manual: run `npm run dev`, upload image + JSON, exercise magnifier on **Results**.

## Product notes

High-level UX principles: `README.md`, `AGENTS.md`. This file is the place for **concrete UI layout** tied to this component.
