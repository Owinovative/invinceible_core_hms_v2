# Frontend Audit — Findings Before the 2026 Redesign

Audit of the pre-redesign frontend (fixed light theme, shadcn-based), as
required before implementation. Repository state: `main` at branch point
of `feature/frontend-redesign-2026`.

## 1. Design tokens & styling

| Finding | Evidence | Verdict |
| --- | --- | --- |
| Single light theme, HSL triplet tokens, no dark mode | `app/globals.css` `:root` only; `color-scheme: light` forced on selects; README: "no runtime theme switching" | **Replace** with dual-theme OKLCH token system |
| 57 unique hardcoded hex colors in globals.css | `#021e38`, `#005da8`, `#0ea5e9` gradients for sidebar/header, marketing effects | **Remove**; all chrome must be token-driven |
| 493 hardcoded `sky-*` utility usages across app/components | `border-sky-100 bg-white`, `text-sky-900`, etc. in feature components | **Codemod to semantic tokens** (breaks dark mode otherwise) |
| 1,129-line globals.css mixing concerns | App chrome + marketing pages (`premium-aurora`, `code-fall`, `engineer-card`) + invoice print styles + specificity-hack overrides (`.clinical-workspace-bg .bg-white { … }`) | **Rewrite**; keep only tokens, base, print styles, and a few structural utilities |
| `* { letter-spacing: 0 !important }` global override | globals.css line 28 | **Remove** (fights typography scale, `!important` smell) |
| No spacing/shadow/motion/z-index tokens | Radius only (`--radius: 1rem` — oversized for data-dense UI) | **Add** full token dimensions |

## 2. Dead code & unused assets

| Item | Evidence | Action |
| --- | --- | --- |
| `framer-motion` dependency | **Zero imports** in any `.tsx` — pure bundle/install weight | Remove from package.json |
| Duplicate/typo hooks | `use-admission-lab-oders.ts` (typo twin of `…lab-orders`), `use-phamacy-queue.ts` (twin of `use-pharmacy-queue.ts`) — no importers | Delete |
| Decorative CSS animations | `aurora-drift`, `sheen-pass`, `code-fall`, `sweep-lines` keyframes + `.motion-sheen`, `.engineer-card` (marketing pages only) | Scope to marketing or delete; all unconditional (no reduced-motion) |
| `tw-animate-css` | Imported for animation utilities partially used | Keep only if used post-redesign; re-evaluate |

## 3. Loading experience

- **0 route-level `loading.tsx` files** across 94 pages → route
  transitions render blank content areas.
- One generic `LoadingSkeleton` (3 equal columns, `rounded-none`,
  hardcoded `border-sky-100`) used in only 18 files; it matches no real
  page structure → layout shift when data arrives.
- `Skeleton` primitive is bare `animate-pulse` with no shimmer, no
  structural presets, no reduced-motion handling.

**Verdict: replace entirely** — shimmer-based skeleton system with
structural presets (table/cards/form/page), group-level `loading.tsx` so
no dashboard route ever renders blank, per-widget skeletons that mirror
final layout (no layout shift).

## 4. Performance

| Issue | Impact |
| --- | --- |
| `background-attachment: fixed` + stacked radial gradients + `backdrop-filter: blur(16–20px)` on core surfaces | Constant repaint cost; jank on clinical tablets/low-end hardware |
| `recharts` imported statically in dashboard page | Heavy chart lib in the initial route bundle |
| framer-motion in dependency tree unused | Install/audit weight |
| No route code-splitting hints, no `loading.tsx` | Perceived slowness on navigation |
| Tables render all rows | Large lists re-render fully on filter changes |

## 5. Accessibility

- Only 9 of 28 `components/ui` primitives contain any `aria-*`/`role`
  attributes (Radix-based ones are fine; custom ones — stat cards,
  status badges, empty states, page header — have none).
- No skip-to-content link; main content not a `<main>` landmark in the
  shell; icon-only buttons in header lack labels.
- Text over gradient headers (white on `#0ea5e9`) — contrast ~2.9:1 for
  small text; fails WCAG AA.
- No `prefers-reduced-motion` handling anywhere (decorative keyframes
  run unconditionally).
- Forced `color-scheme: light` breaks user agent dark form controls.
- Focus rings present on shadcn primitives (good baseline to keep).

## 6. UX & layout issues

- **Sidebar**: hardcoded navy gradient; 30+ flat links with no grouping,
  no collapse-to-rail, no keyboard shortcuts, active state is
  background-only (fails non-color distinction).
- **Header**: bright gradient band with low-contrast search; no global
  command palette despite 50+ destinations; notifications icon lacks an
  unread count.
- **Inconsistent duplicated patterns**: three card-ish primitives
  (`card`, `section-card`, `stats-card`) with different paddings/borders;
  two skeleton components; status colors implemented as both
  `status-badge.tsx` and ad-hoc `.status-success` CSS classes.
- **Forms/dialogs**: default button height h-8 and compact inputs —
  small touch targets for tablet-first clinical use.
- **Empty states**: single generic `empty-state.tsx` with no action slot
  and no illustration; error states missing entirely (only toast-less
  `alert.tsx`).
- **No toast system**: `components/ui` has no toaster; mutation feedback
  is inconsistent (inline text or nothing).
- Glassmorphism panels reduce text contrast over the aurora background.

## 7. What is worth keeping

- Radix-based primitive architecture (dialog/sheet/dropdown/tabs) —
  accessible core, will be re-skinned not re-invented.
- `cva` + `data-slot` conventions in newer primitives (button) — good
  pattern, adopted across the new system.
- TanStack Query hook layer and services — untouched (business logic
  preserved).
- `lib/module-catalog.ts` declarative module registry — becomes the
  backbone of module accent theming + command palette.
- Invoice print styles (`.invoice-paper` etc.) — required by billing
  printouts; preserved verbatim in the new stylesheet.
- Inter + JetBrains Mono via `next/font` — kept (with `display: swap`
  and tabular-nums for data).

## 8. Redesign decisions that follow

1. **New token system** (OKLCH, light + dark, full dimensions: color,
   spacing, type, radius, shadow, motion, z-index) — no hardcoded values.
2. **Module accent system**: every module family gets an accent hue via
   `data-module`, giving each area its own identity inside one system.
3. **Component system rebuilt** on the existing Radix core with new
   visual language + missing primitives added (toast, command palette,
   stat/KPI cards, timeline, breadcrumbs, filter bar, search, error
   state, skeleton presets).
4. **Shell redesigned**: grouped collapsible sidebar, glass header with
   ⌘K palette, slim status footer, skip link, landmarks.
5. **Loading**: group-level `loading.tsx` + structural skeletons —
   no blank screens, no layout shift.
6. **Motion**: CSS-only micro-interactions with tokenized timings and
   global `prefers-reduced-motion` support; framer-motion removed.
7. **`sky-*` codemod** to semantic tokens across all 94 pages so dark
   mode is correct everywhere.
