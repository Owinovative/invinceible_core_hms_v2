# Design System

Built on **Tailwind CSS 4** + **shadcn/ui** (Radix primitives) with a
fixed professional **light theme** (dark mode was deliberately removed in
v2 for clinical consistency — see [CHANGELOG.md](CHANGELOG.md)).

## 1. Foundations

| Token area | Source | Notes |
| --- | --- | --- |
| Colors | CSS variables in `frontend/app/globals.css` (shadcn convention: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, chart palette) | Semantic usage only — components reference tokens, never raw hex |
| Typography | Next.js font pipeline + Tailwind scale | Headings `font-semibold`; tabular numerals for money columns |
| Spacing / radius / shadow | Tailwind defaults + `--radius` | Cards and dialogs share radius token |
| Icons | `lucide-react` | 16/20px inline, 24px nav |
| Motion | `framer-motion` + `tw-animate-css` | Subtle enter/exit; no motion on data-critical tables |

## 2. Component library (`frontend/components/ui/`)

shadcn-generated primitives, customized per project: `button`, `input`,
`select`, `textarea`, `label`, `dialog`, `sheet`, `dropdown-menu`,
`table`, `card`, `badge`, `tabs`, `toast`, `skeleton`, `alert`,
`checkbox`, `switch`, form field wrappers, and composition helpers
(`cn()` from `lib/utils.ts` = clsx + tailwind-merge;
`class-variance-authority` for variants).

Variant conventions:

- **Button**: `default` (primary), `secondary`, `outline`, `ghost`,
  `destructive`, `link`; sizes `sm`/`default`/`lg`/`icon`.
- **Badge**: status colors map to domain vocabularies (e.g. invoice
  PENDING=muted, PAID=success-tinted, FAILED/REJECTED=destructive).
- **Table**: TanStack-driven data tables with sticky headers, skeleton
  rows, and pagination footer as the standard list pattern.

## 3. Composition patterns

| Pattern | Rule |
| --- | --- |
| Page header | Title + description + primary action (right-aligned) |
| Filters | Toolbar above tables; debounced search (`use-debounced-value`) |
| Forms | react-hook-form + zod; two-column on `lg+`, stacked mobile; inline errors under fields |
| Dialogs | Create/edit in `Dialog`, wide flows in `Sheet`; destructive confirms show consequence copy |
| Money | Right-aligned, 2-dp, KES; totals in panels (`addTotalsPanel` mirrors backend PDF style) |
| Status flow | Badges + timeline where lifecycle matters (claims, payments, fiscal docs) |
| Feedback | Toast on success/failure; optimistic UI only where reversal is safe |

## 4. Accessibility

Radix primitives supply focus management, ARIA roles, and keyboard
support for menus/dialogs/tabs; forms use proper `label` association;
color statuses always pair with text (no color-only meaning). Contrast
targets WCAG AA on the light palette.

## 5. Extending the system

1. Prefer composing existing `components/ui` primitives.
2. New primitive → generate via shadcn CLI (`components.json` is
   configured), then theme with tokens — no hard-coded colors.
3. Feature variants live beside the feature
   (`components/<domain>/…`), not in `ui/`.
4. Keep print/PDF parity in mind: receipts and claim forms have backend
   PDF equivalents (`backend/src/common/pdf/hospital-pdf.ts`).

Related: [UI_UX_GUIDE.md](UI_UX_GUIDE.md) · [FRONTEND.md](FRONTEND.md)
