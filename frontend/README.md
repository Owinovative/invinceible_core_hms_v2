# Invinceible Core HMS — Frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS 4, styled with the
**Meridian design system** (2026): OKLCH design tokens, first-class light
and dark themes, per-module accent identities, a global ⌘K command
palette, and structural skeleton loading across all 90+ screens.

## Documentation

- [Design system](docs/DESIGN_SYSTEM.md) — tokens, themes, module
  accents, component library, loading/empty/error patterns, extension
  guidelines
- [Pre-redesign audit](docs/REDESIGN_AUDIT.md) — findings that shaped
  the redesign

## Getting started

```bash
npm ci
# .env.local: NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
npm run dev        # http://localhost:3001
```

Useful commands: `npm run build` (production build, CI parity),
`npm run lint`.

## Architecture

```text
app/                 App Router pages: (dashboard), (platform), patient-access, public
  globals.css        Meridian tokens (light + dark) + base + signature surfaces
  print.css          Preserved invoice/report print styles
components/
  ui/                Design-system primitives (see docs/DESIGN_SYSTEM.md)
  layout/            Shell: sidebar, header, status footer, subscription banner
  <domain>/          Feature components per module
hooks/               One TanStack Query hook per API operation
services/            Typed API client per backend module (lib/api.ts fetch core)
providers/           theme, auth, scope, sidebar, query client + toaster
lib/                 navigation registry, module catalog, utils
```

Conventions:

- **Tokens or nothing** — components never hardcode colors, shadows,
  radii, timings, or z-index; extend `globals.css` instead.
- **Navigation registry** (`lib/navigation.ts`) is the single source for
  sidebar, command palette, and module-accent resolution.
- **One hook per operation**; mutations invalidate query keys and toast
  via `sonner`.
- Loading uses skeleton presets that mirror final layout; every
  dashboard route inherits `app/(dashboard)/loading.tsx`.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL (required on deployments) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for links/QRs |

## Deployment

Vercel (default) or any Node host: root `frontend`, build
`npm ci && npm run build`, start `npm run start`. See
[../docs/deployment/render.md](../docs/deployment/render.md) for the
Render path.
