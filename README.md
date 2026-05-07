# Invinceible Core HMS

Invinceible Core HMS is a multi-facility hospital management system for patient registration, triage, doctor workflow, laboratory, pharmacy, inpatient care, billing, M-Pesa payments, SHA claims, reports, audit trails, and platform administration.

The project is built as critical healthcare software: facility and branch scoping, role-based permissions, auditability, payment safety, resilient APIs, and operational monitoring are treated as core system behavior, not optional extras.

## Production Priorities

- Strong authentication with lockout, session tracking, and password reset token hashing.
- Facility and branch isolation across clinical, billing, pharmacy, lab, reports, and platform operations.
- M-Pesa/Daraja duplicate-prompt protection, status checks, idempotent callbacks, and reconciliation foundations.
- Short-TTL caching, request coalescing, pagination, scoped search, and indexed database access for high traffic.
- Audit logs for critical hospital and administrative actions.
- Official PDF/printout foundations for invoices, receipts, summaries, reports, and SHA workflows.
- Patient portal, AI assistant, communications, reporting, and data warehouse foundations behind safe feature flags.

## Architecture

```text
backend/   NestJS API, Prisma ORM, MySQL, auth, billing, clinical modules
frontend/  Next.js app for hospital dashboard, platform admin, public pages
docs/      Production, security, clinical, scaling, and operations guides
load-tests/ k6/autocannon load testing starting points
services/  Future worker/service foundations
```

## Main Modules

- Patient registration, search, duplicate warning foundation, and visit history.
- Triage with priority and doctor routing.
- Doctor queue and consultation workspace.
- Laboratory requests, results, verification, and doctor review.
- Pharmacy catalog, branch stock, dispensing, low stock, and reorder foundations.
- IPD admissions, wards, beds, treatment charts, and discharge summaries.
- Billing, invoices, payments, receipts, M-Pesa, SHA coverage, and cashier close.
- Reports, audit logs, user management, facility settings, and platform controls.

## Local Setup

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`

## Required Environment

Use the examples in `backend/.env.example` and `.env.example`.

Production must use:

- a strong `JWT_SECRET` of at least 48 high-entropy characters,
- a private `DATABASE_URL`,
- strict `FRONTEND_URL` or `FRONTEND_ORIGINS`,
- Redis where possible for cache, rate limiting, queues, and request coalescing,
- secure M-Pesa credentials stored only in the backend environment.

Never commit `.env` files.

## Verification

Backend:

```bash
cd backend
npm run build
npm run test
```

Frontend:

```bash
cd frontend
npm run build
```

## Documentation

Start with [docs/README.md](docs/README.md).

Important guides:

- [Performance and scalability](docs/performance-scalability.md)
- [Production security checklist](docs/production-security-checklist.md)
- [HMS benchmark gap analysis](docs/hms-benchmark-gap-analysis.md)
- [Multi-tenant facility isolation](docs/multi-tenant-facility-isolation.md)
- [M-Pesa reconciliation](docs/mpesa-reconciliation.md)
- [Load testing](docs/load-testing.md)

## Security

Report security concerns privately. See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
