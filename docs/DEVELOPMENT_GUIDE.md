# Development Guide

## 1. Prerequisites

- Node.js 22 (matches CI + Render), npm
- MySQL 8 locally (or PostgreSQL with `DATABASE_PROVIDER=postgresql`)
- Optional: Redis (features degrade gracefully without it), Rust
  toolchain (only for the experimental reports engine)

## 2. First-time setup

```bash
git clone https://github.com/Owinovative/invinceible_core_hms_v2.git
cd invinceible_core_hms_v2

# Backend
cd backend
cp .env.example .env            # set DATABASE_URL + JWT_SECRET (≥32 chars)
npm ci                          # also runs prisma generate
npm run prisma:migrate:deploy
npm run db:seed:safe            # roles + baseline reference data
npm run start:dev               # http://localhost:3000

# Frontend (second terminal)
cd ../frontend
npm ci
# .env.local: NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
npm run dev                     # http://localhost:3001
```

Government integrations run in **mock mode** out of the box
(`ETIMS_MODE=mock`, `DHA_MODE=mock`) — no external credentials needed for
development.

## 3. Everyday commands

| Command (backend) | Purpose |
| --- | --- |
| `npm run start:dev` | Watch-mode API |
| `npm run build` | Type-check + compile (CI parity) |
| `npm run lint` / `lint:integration` | ESLint (repo-wide w/ fix · integration layer strict) |
| `npm test` | Full Jest (see [TESTING.md](TESTING.md) for suite status) |
| `npm run test:integration:cov` | Integration layer with coverage gates |
| `npx prisma studio` | DB browser |
| `node scripts/generate-api-reference.mjs` | Regenerate [API_REFERENCE.md](API_REFERENCE.md) |
| `npm run db:*` | Data validation, storage audits, cleanup dry-runs |

Frontend: `npm run dev`, `npm run build`, `npm run lint`.

## 4. Conventions

- **Backend**: module-per-domain; controllers thin, services own rules;
  DTOs with class-validator; every list endpoint paginated & scoped;
  audit sensitive mutations; never log secrets (use `SafeLoggerService`);
  schema changes require BOTH MySQL and generated-PostgreSQL migrations.
- **Frontend**: one hook per operation wrapping a typed service function;
  shadcn primitives from `components/ui`; feature code under
  `components/<domain>`; new departments go through
  `lib/module-catalog.ts` rather than bespoke pages.
- **Commits/PRs**: scoped, reviewable, conventional-style prefixes
  (`feat:`, `fix:`, `docs:`, `test:`, `ci:`); PR expectations in
  [CONTRIBUTING.md](CONTRIBUTING.md).

## 5. Adding a feature (typical path)

1. Prisma model + migrations (both dialects) → `npx prisma generate`.
2. Nest module: DTOs, service (scope checks + audit), controller
   (guards + permissions).
3. Wire into `app.module.ts`; extend `permissions.ts` if needed.
4. Frontend: service function → hook → UI; add to module catalog/sidebar.
5. Tests (service-level at minimum) + regenerate API reference + docs.

## 6. Code quality report (reverse-engineering findings)

**Strengths** — consistent module layout; strong tenancy/audit
discipline; resilient infrastructure (fallbacks, queues, health);
enterprise migrations discipline (index/perf migrations); validated
config; the integration layer is fully ports-and-adapters with 97%+ test
coverage.

**Technical debt & refactoring opportunities** (prioritized):

| Item | Location | Recommendation |
| --- | --- | --- |
| Monolithic billing service (~4.4k lines) | `backend/src/billing/billing.service.ts` | Split: invoices / payments (cash·M-PESA) / tariffs / dashboards; extract Daraja client to an adapter like eTIMS |
| Placeholder specs | `*.controller.spec.ts`, `*.service.spec.ts` (18-line stubs) across modules | Replace with real service tests; known "test-module provider cleanup" limitation in [CHANGELOG.md](CHANGELOG.md) |
| Legacy lint debt | CRLF/prettier violations in older files (e.g. `sha-claims.service.ts`) | Repo-wide `eslint --fix` sweep in a dedicated formatting-only PR; then widen CI lint from integration-only to full `src/` |
| Float money columns | Prisma schema | Migrate to `Decimal`; audit rounding call-sites |
| Duplicated hook variants | `frontend/hooks` (e.g. `use-admission-lab-oders.ts` typo twin, `use-phamacy-queue.ts` vs `use-pharmacy-queue.ts`) | Deduplicate + delete dead variants |
| LongText data-URL storage | Signatures, logos, photos | Move to object storage; keep URLs |
| Dual schema maintenance | `prisma/` + generated `prisma-postgresql/` | Acceptable near-term; converge on PostgreSQL-only after MySQL sunset |
| Root `services/rust-worker` + `backend/native/reports-engine` | Experimental, unwired | Either integrate behind a flag or mark clearly as incubation (documented here) |

**Complexity hotspots**: `billing.service.ts`,
`facility-mpesa-billing.service.ts` + `payhero-billing.service.ts`
(overlapping payment logic), `auth.service.ts` (many concerns:
login/lockout/session/reset). No circular module dependencies detected
in the Nest graph; `forwardRef` is not used.

## 7. Troubleshooting dev environments

| Symptom | Fix |
| --- | --- |
| `nest`/`jest` not found or wrong Prisma major | Stale npx cache/node_modules — run `npm ci` in `backend/` and use local binaries |
| Boot fails naming an env var | Set it — startup validation is intentional ([CONFIGURATION.md](CONFIGURATION.md)) |
| CORS errors in browser | Add your frontend origin to `FRONTEND_ORIGINS` |
| 403 on everything | Seed roles (`db:seed:safe`) and log in with an admin user |
| Integration docs stuck QUEUED | Worker disabled or integrations off — see [integrations/troubleshooting.md](integrations/troubleshooting.md) |
