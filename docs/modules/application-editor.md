# Module: `components/ApplicationEditor.tsx`

## Responsibility

Controlled editor for the **`application`** multipart string: **formatted** field UI (default) vs **raw JSON** textarea, with a two-segment toggle.

## Behavior

- Parses `value` with `JSON.parse` + `ApplicationJsonSchema`; formatted controls call `onChange(JSON.stringify(next, null, 2))`.
- Invalid input while in formatted mode shows an error panel and a shortcut to switch to JSON view.
- **`density="compact"`** — smaller labels, inputs, and multiline rows for a shorter workbench (used on the home page).
- **Focus / chrome** — inputs and JSON textarea use **`ttb-*`** focus borders and rings from `globals.css`; **Formatted / JSON** active segment uses **`ttb-600`** fill; invalid-JSON panel uses **`ttb-*`** (not amber).
- **JSON mode positioning** — JSON is labeled as a raw input editing view, with a lightweight reminder that field-by-field review happens in **Results** after verification rather than in the raw editor.
- **`formattedPageIndex`** (optional, `0` … `APPLICATION_FORMATTED_PAGE_COUNT - 1`) — in **formatted** mode only, shows a **slice** of fields so the workbench fits the viewport; **JSON** mode always edits the full document. Page **0**: product class through net contents; page **1**: government warning, name/address, country of origin. Parent owns the active index (e.g. `useState` on the home page).
- **`onFormattedPageChange`** (optional) — when provided with `formattedPageIndex`, the editor shows **Basics / Statements** segment buttons next to the Formatted/JSON toggle so users can switch pages without a separate section bar.
- **Product class input** — formatted mode uses a fixed dropdown (`distilled_spirits`, `wine`, `beer`) with a placeholder option instead of a free-text field.
- **Boolean fields** — checkbox **left**, label and optional hint **stacked to the right** on one row (`items-start`), matching common form patterns.

## Exported constants (for parent state + labels)

- `APPLICATION_FORMATTED_PAGE_COUNT` — number of formatted pages (`2`).
- **`APPLICATION_FORMATTED_PAGE_NAV`** — per-page **`shortLabel`**, **`title`**, **`hint`**, and **`fields`** (reference list for copy); used by the in-editor **Basics / Statements** pager and the home page **Application data** subtitle.

## Dependencies

- `@/lib/schemas` (`ApplicationJson`, `ApplicationJsonSchema`)

## Related tests

None dedicated; covered indirectly by handler tests using JSON strings.

## See also

- [`app-page.md`](./app-page.md) — workbench layout that embeds this component.
