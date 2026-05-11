# Module: `components/ApplicationEditor.tsx`

## Responsibility

Controlled editor for the **`application`** multipart string: **formatted** field UI (default) vs **raw JSON** textarea, with a two-segment toggle.

## Behavior

- Parses `value` with `JSON.parse` + `ApplicationJsonSchema`; formatted controls call `onChange(JSON.stringify(next, null, 2))`.
- Invalid input while in formatted mode shows an error panel and a shortcut to switch to JSON view.

## Dependencies

- `@/lib/schemas` (`ApplicationJson`, `ApplicationJsonSchema`)

## Related tests

None dedicated; covered indirectly by handler tests using JSON strings.

## See also

- [`app-page.md`](./app-page.md) — workbench layout that embeds this component.
