# Meridian Design System (2026)

The design language of Invinceible Core HMS: a bold, layered, healthcare-
professional system built on OKLCH tokens, dual themes, and per-module
accent identities. Everything here is implemented in
[`app/globals.css`](../app/globals.css) and
[`components/ui/`](../components/ui).

## 1. Principles

1. **Trust through structure** — layered surfaces, calm elevation, and a
   disciplined type scale; no decoration that competes with data.
2. **One system, many identities** — every module family carries its own
   accent hue via `data-module`, inside a single token grammar.
3. **Tokens or nothing** — no hardcoded colors, shadows, radii, timings,
   or z-indexes in components. If a value matters, it is a token.
4. **State is communicated, not decorated** — motion and color exist to
   signal loading, success, failure, and liveness.
5. **Both themes are first-class** — light and dark are designed
   palettes, not filters.

## 2. Token dimensions (all in `globals.css`)

| Dimension | Tokens |
| --- | --- |
| Brand | `--brand`, `--brand-strong`, `--pulse` (live/active cyan) |
| Surfaces | `--background`, `--surface-1..3`, `--card`, `--popover` |
| Text | `--foreground`, `--muted-foreground`, `--subtle-foreground` |
| Interactive | `--primary`, `--secondary`, `--accent` (+foregrounds) |
| Status | `--success/-soft`, `--warning/-soft`, `--destructive/-soft`, `--info/-soft` |
| Module accent | `--module-accent`, `--module-accent-soft` (set by `data-module`) |
| Charts | `--chart-1..5` |
| Lines | `--border`, `--border-strong`, `--input`, `--ring` |
| Radius | `--radius` base → `--radius-sm..2xl` scale |
| Elevation | `--shadow-xs..xl` (tinted light, deep dark) |
| Motion | `--motion-fast/base/slow`, `--ease-out`, `--ease-spring` |
| Z-index | `--z-header/sidebar/overlay/modal/toast` |
| Shell | `--sidebar-width`, `--sidebar-width-rail`, `--header-height` |

Tailwind utilities map through `@theme inline` (`bg-surface-2`,
`text-module`, `border-border-strong`, `shadow-md`, `animate-enter`, …).

## 3. Themes

- Class strategy: `.dark` on `<html>`; `ThemeProvider`
  (`providers/theme-provider.tsx`) persists `light | dark | system` to
  `localStorage("hms-theme")`, follows OS changes in system mode, and a
  pre-paint inline script prevents theme flash.
- Toggle lives in the header; `color-scheme` is set per theme so native
  controls follow.

## 4. Module accent system

```tsx
<div data-module="pharmacy">…</div>
```

| Family | Hue | Applied to |
| --- | --- | --- |
| `clinical` | Meridian blue | Workspace, medical care |
| `diagnostics` | Cyan | Lab, radiology, blood bank |
| `pharmacy` | Emerald | Dispensing, stock, procurement |
| `finance` | Violet | Billing, invoices, claims |
| `inpatient` | Indigo | IPD |
| `operations` | Amber | Specialty departments |
| `admin` | Slate | Records, reports, HR, settings |

The shell sets `data-module` from the active route
(`lib/navigation.ts#moduleForPath`), so `text-module`, `bg-module-soft`,
spotlight hairlines, active nav states, and stat-card tiles re-hue per
area automatically.

## 5. Signature surfaces & utilities

| Class | Use |
| --- | --- |
| `surface-spotlight` | Primary card: module-accent hairline + hover lift |
| `glass-chrome` | Sticky header glass |
| `app-canvas` | Calm static aurora wash on the page background |
| `text-gradient-brand` | Brand wordmark gradient |
| `kbd` | Keyboard hint chips |
| `pulse-dot` | Live/real-time indicator |
| `skeleton-shimmer` | Loading sweep (static under reduced motion) |
| `tabular` | Tabular numerals for data |

## 6. Component library (`components/ui/`)

**Core (restyled shadcn/Radix):** button, input, textarea, select,
label, form, card, table (sticky glass header, card container), dialog,
sheet (drawer), dropdown-menu, tabs, tooltip, scroll-area, separator,
alert, avatar, badge, progress.

**Domain primitives:** `StatsCard` (KPI + trend), `StatusBadge`
(semantic dot chips), `PageHeader` (breadcrumbs + accent eyebrow +
actions), `SectionCard` (default/spotlight/soft), `EmptyState`,
`ErrorState` (retry-first), `Timeline`, `Breadcrumbs`, `SearchInput`,
`FilterBar` (active-filter chips), `CommandPalette` (Ctrl/⌘K),
`Toaster` (sonner host — `import { toast } from "sonner"`),
skeleton system (`Skeleton`, `SkeletonTable/Stats/Cards/Form/Page`).

Conventions: `data-slot` attributes, `cva` variants, exported prop
types, `cn()` for class merging, lucide icons sized by button/`[&_svg]`
rules.

## 7. Loading, empty, error

- Route-group `app/(dashboard)/loading.tsx` renders `SkeletonPage` —
  no blank screens on navigation.
- Widget-level skeleton presets mirror final layout (no shift) and are
  `role="status" aria-busy` live regions.
- `EmptyState` requires a next step (action slot); `ErrorState` states
  what failed and offers retry; toasts confirm mutations.

## 8. Motion

Tokenized durations/easings only; entries via `animate-enter`
(+`animate-enter-scale`), overlay transitions via tw-animate-css
`data-open/closed` variants; `prefers-reduced-motion` collapses all
animation globally. No JS animation library (framer-motion removed).

## 9. Accessibility baseline

Skip-to-content link; `<main>` landmark; `aria-current` nav; labeled
icon buttons; focus-visible rings everywhere (`--ring`); AA-contrast
palettes in both themes; keyboard-first command palette; semantic list
markup in Timeline/nav; scalable rem-based type.

## 10. Extending the system

1. Compose existing primitives first; new primitives go in
   `components/ui` via the shadcn CLI, themed with tokens only.
2. New module page → add to `lib/navigation.ts` (registry drives
   sidebar, palette, accents) and use `PageHeader` + `SectionCard` +
   `FilterBar` + table/skeleton patterns.
3. New color/shadow/timing → add a token in `globals.css` and map it in
   `@theme inline`; never inline values.
4. Both themes must be checked before merge; test with reduced motion.
