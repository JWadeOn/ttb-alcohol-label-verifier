# Module: `components/ApplicationEditor.tsx`

## Responsibility

Controlled editor for the **`application`** multipart string: **formatted** field UI (default) vs **raw JSON** textarea, with a two-segment toggle.

## Behavior

- Parses `value` with `JSON.parse` + `ApplicationJsonSchema`; formatted controls call `onChange(JSON.stringify(next, null, 2))`.
- Invalid input while in formatted mode shows an error panel and a shortcut to switch to JSON view.
- **`density="compact"`** — smaller labels, inputs, and multiline rows for a shorter workbench (used on the home page).
- **Focus / chrome** — inputs and JSON textarea use **`ttb-*`** focus borders and rings from `globals.css`; **Formatted / JSON** active segment uses **`ttb-600`** fill; invalid-JSON panel uses **`ttb-*`** (not amber).
- **JSON mode positioning** — JSON is labeled as a raw input editing view, with a lightweight reminder that field-by-field review happens in **Results** after verification rather than in the raw editor.
- **Formatted layout density** — in compact mode the editor now uses a responsive two-column field grid so shorter fields share rows and the full application can stay visible without forcing section toggles. Longer text inputs (name/address) span full width for readability.
- **Import/origin pairing** — `Import product` and `Country of origin` now sit next to each other in formatted mode, and `Country of origin` is disabled until import is checked so the dependency is explicit in the UI.
- **Government warning input** — intentionally hidden from formatted mode to reduce visual noise; it remains available in raw JSON mode. **`app/page.tsx`** calls **`ensureApplicationComplianceJson`** before verify so the canonical warning from **`lib/canonical-warning.ts`** is injected when blank.
- **Mandatory fields** — formatted mode collects brand, class, alcohol, net contents, name/address, and import/country; **`checkApplicationReadyForVerify`** blocks **Run verification** until required values are present (government warning satisfied via auto-inject).
- **Product class input** — formatted mode uses a fixed dropdown (`distilled_spirits`, `wine`, `beer`) instead of a free-text field.
- **Boolean fields** — checkbox **left**, label and optional hint **stacked to the right** on one row (`items-start`), matching common form patterns.
- **Product class scope guardrail** — defaults to `distilled_spirits`; `wine` and `beer` remain visible but disabled in formatted mode to make unsupported scope explicit.

## Exported constants (optional segmented mode)

- `APPLICATION_FORMATTED_PAGE_COUNT` — number of formatted pages (`2`) when segmented mode is used.
- **`APPLICATION_FORMATTED_PAGE_NAV`** — per-section **`shortLabel`**, **`title`**, **`hint`**, and **`fields`** metadata for optional segmented UX.

## Dependencies

- `@/lib/schemas` (`ApplicationJson`, `ApplicationJsonSchema`)

## Related tests

None dedicated; covered indirectly by handler tests using JSON strings.

## See also

- [`app-page.md`](./app-page.md) — workbench layout that embeds this component.
