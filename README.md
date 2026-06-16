# Invinceible Core HMS

Invinceible Core HMS is a multi-facility hospital management system for real clinical, billing, pharmacy, laboratory, inpatient, reporting, and platform administration workflows.

The project is built as critical healthcare software. Facility and branch scoping, role-based permissions, auditability, payment safety, resilient APIs, and operational monitoring are treated as core system behavior, not optional extras.

## Production Priorities

- Strong authentication with lockout, session tracking, password reset token hashing, and production secret validation.
- Facility and branch isolation across clinical, billing, pharmacy, lab, reports, users, settings, and platform operations.
- M-Pesa/Daraja duplicate-prompt protection, status checks, idempotent callbacks, and reconciliation foundations.
- Short-TTL caching, request coalescing, pagination, scoped search, and indexed database access for high traffic.
- Audit logs for critical hospital, payment, pharmacy, clinical, and administrative actions.
- Official PDF/printout foundations for invoices, receipts, medical summaries, reports, and SHA workflows.
- Patient portal, AI assistant, communication, reporting, and data warehouse foundations behind safe feature flags.
- Fixed professional light-theme HMS interface with no runtime theme switching.

## What It Does

The system connects the main hospital flow:

```text
Reception -> Triage -> Doctor -> Lab -> Pharmacy -> Billing -> Payment -> Reports
```

It supports patient registration, triage, doctor consultation, structured prescribing, lab orders and results, pharmacy dispensing, IPD/admissions, billing, invoices, receipts, SHA claims, M-Pesa/Daraja payments, branches, users, roles, audit logs, reports, stock control, and platform administration.

## Main Modules

- Patient registration, search, duplicate warning foundation, and visit history.
- Triage with vitals, urgency, priority, clinic routing, and doctor routing.
- Doctor queue and consultation workspace with structured prescribing.
- Laboratory requests, results, verification, attachments, and doctor review.
- Pharmacy catalog, branch stock, stock-aware prescribing, partial dispensing, low stock, and reorder foundations.
- IPD admissions, wards, beds, treatment charts, progress notes, and discharge summaries.
- Billing, invoices, discounts, payments, receipts, cashier close, M-Pesa, SHA coverage, and revenue tracking.
- Reports, audit logs, user management, facility settings, subscriptions, and platform controls.
- Patient portal and public verification foundations.
- AI assistance foundations for drafting and workflow support, disabled by default unless configured.

## Real Hospital Flow

1. Reception registers or finds the patient.
2. Triage captures vitals, urgency, and routing details.
3. Doctor opens the patient from the doctor queue.
4. Doctor records consultation notes, diagnosis, lab requests, prescriptions, admission, referral, or discharge decisions.
5. Lab enters and verifies results.
6. Pharmacy dispenses structured prescription items and updates branch stock.
7. Billing creates or updates the invoice and receives payment.
8. Cashier issues receipt.
9. Admins and managers review reports, audit logs, stock, payments, and operational performance.

## Tech Stack

Backend:

- NestJS
- Prisma ORM
- MySQL
- JWT authentication
- PDFKit and QR utilities
- Redis optional cache, rate-limit, and queue foundation with in-memory fallback

Frontend:

- Next.js
- React
- TypeScript
- TanStack Query
- Tailwind-style component system
- Fixed light-theme design system for stable clinical/admin use

Repository:

```text
backend/      NestJS API, Prisma, auth, billing, lab, pharmacy, IPD, users
frontend/     Next.js/React dashboard, platform pages, public pages, workflows
docs/         Security, setup, deployment, scaling, workflow, and operations guides
load-tests/   k6/autocannon load testing starting points
services/     Future worker/service foundations
```

## Local Setup

Clone:

```bash
git clone https://github.com/Owinovative/invinceible_core_hms_v2.git
cd invinceible_core_hms_v2
```

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
cp .env.example .env.local
npm run dev
```

Default local URLs:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`

## Required Environment

Use the examples in `.env.example`, `backend/.env.example`, and `frontend/.env.example`.

Production must use:

- a strong `JWT_SECRET` of at least 48 high-entropy characters,
- a private `DATABASE_URL`,
- strict `FRONTEND_URL` or `FRONTEND_ORIGINS`,
- Redis where possible for cache, rate limiting, queues, and request coalescing,
- secure M-Pesa credentials stored only in backend or facility-level protected settings,
- HTTPS-only public URLs for deployed frontend, backend, and callback endpoints.

Never commit `.env` files or secrets.

## Useful Commands

Backend:

```bash
cd backend
npm run prisma:generate
npm run build
npm run test
npm run prisma:migrate:deploy
npm run db:storage:audit
npm run db:cleanup:dry-run
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

Dependency audit:

```bash
cd backend
npm audit --audit-level=moderate --omit=dev

cd ../frontend
npm audit --audit-level=moderate --omit=dev
```

## Deployment Notes

- Run database backups before production migrations.
- Deploy backend and frontend through their configured platforms.
- Render production migration is prepared in [docs/deployment/render.md](docs/deployment/render.md) and [render.yaml](render.yaml).
- Render PostgreSQL migration planning is documented in [docs/deployment/mysql-to-render-postgres.md](docs/deployment/mysql-to-render-postgres.md).
- Version 2 release validation is tracked in [docs/release-checklist.md](docs/release-checklist.md), with release notes in [docs/releases/v2.0.0.md](docs/releases/v2.0.0.md).
- Keep Railway and Vercel active until Render backend, frontend, database connectivity, health checks, and payment callbacks are verified.
- Configure Render backend environment variables securely in the Render dashboard.
- Configure Render frontend `NEXT_PUBLIC_API_BASE_URL` to the Render backend URL.
- If Railway/Vercel remain active during cutover, keep their existing environment variables intact for rollback.
- Do not point production at Render PostgreSQL until MySQL data has been backed up, imported, validated, and rollback-tested.
- Configure Daraja callback URLs to point to the deployed backend.
- Run queue workers when queue-backed jobs are enabled.
- Check `/health/live`, `/health/ready`, and `/health/deep` after deployment.

## Documentation

Start with [docs/README.md](docs/README.md).

Important guides:

- [Performance and scalability](docs/performance-scalability.md)
- [Database storage efficiency and retention](docs/database-storage-efficiency.md)
- [Production security checklist](docs/production-security-checklist.md)
- [HMS benchmark gap analysis](docs/hms-benchmark-gap-analysis.md)
- [Repository audit](docs/repository-audit.md)
- [Prescriptions and pharmacy workflow](docs/prescriptions-pharmacy.md)
- [Reports and printouts](docs/reports-printouts.md)
- [Multi-tenant facility isolation](docs/multi-tenant-facility-isolation.md)
- [M-Pesa reconciliation](docs/mpesa-reconciliation.md)
- [SHA and insurance workflow](docs/sha-insurance-workflow.md)
- [Load testing](docs/load-testing.md)
- [Security testing](docs/security-testing.md)
- [Render production deployment](docs/deployment/render.md)
- [MySQL to Render PostgreSQL migration](docs/deployment/mysql-to-render-postgres.md)

## Security

Report security concerns privately. See [SECURITY.md](SECURITY.md).

Security basics:

- Never commit `.env` files.
- Rotate any exposed local or development secret.
- Use a strong production `JWT_SECRET`.
- Keep Daraja credentials out of frontend payloads and logs.
- Guard report exports, payment changes, user management, and facility settings.
- Keep audit logging enabled for critical actions.


## License

MIT. See [LICENSE](LICENSE).
