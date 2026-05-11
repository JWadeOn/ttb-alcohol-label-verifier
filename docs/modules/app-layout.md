# Module: `app/layout.tsx` & `app/globals.css`

## Responsibility

- **`layout.tsx`:** Root HTML shell, metadata, and global `body` classes (e.g. light theme base: `bg-stone-50`, `text-stone-900`).
- **`globals.css`:** Tailwind v4 entry (`@import "tailwindcss"`).

## Decisions

- Styling is mostly Tailwind utility classes on pages; `globals.css` stays minimal.

## Dependencies

- Next.js App Router root layout conventions.

## Related tests

None.
