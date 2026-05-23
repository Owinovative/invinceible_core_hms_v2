# Version 2 release checklist

Use this checklist before promoting Invinceible Core HMS Version 2 to
production.

## Code and build checks

- [ ] Backend dependencies installed with `npm install` in `backend/`.
- [ ] Frontend dependencies installed with `npm install` in `frontend/`.
- [ ] Prisma PostgreSQL client generated with `npm run prisma:generate:postgres`.
- [ ] Backend production build passes with `npm run build`.
- [ ] Frontend production build passes with `npm run build`.
- [ ] Storage audit reviewed with `npm run db:storage:audit`.
- [ ] Large-field report reviewed with `npm run db:large-fields:report`.
- [ ] Safe cleanup candidates reviewed with `npm run db:cleanup:dry-run`; no destructive cleanup run without explicit release-owner approval.
- [ ] `git diff --check` passes.
- [ ] Dark mode/theme switching search is clean except QR-code library foreground color options and release-note wording.
- [ ] No `.env` files or secrets are staged.

## Render backend

- [ ] Backend service root directory is `backend`.
- [ ] Backend build command is `npm ci && npm run prisma:generate:postgres && npm run build`.
- [ ] Backend pre-deploy command is `npm run prisma:migrate:postgres`.
- [ ] Backend start command is `npm run start:prod`.
- [ ] Backend health check path is `/health/live`.
- [ ] `NODE_ENV=production`.
- [ ] `DATABASE_PROVIDER=postgresql` after the PostgreSQL cutover is approved.
- [ ] `DATABASE_URL` is configured through Render secrets/database reference.
- [ ] `JWT_SECRET` is configured with a high-entropy production value.
- [ ] `FRONTEND_URL` and `FRONTEND_ORIGINS` include the Render frontend and production domain.
- [ ] `TRUST_PROXY=true`.
- [ ] Rate-limit, cache, queue, body-size, and timeout variables are reviewed.

## Render frontend

- [ ] Frontend service root directory is `frontend`.
- [ ] Frontend build command is `npm ci && npm run build`.
- [ ] Frontend start command is `npm run start`.
- [ ] `NEXT_PUBLIC_API_BASE_URL` points to the production backend URL.
- [ ] `NEXT_PUBLIC_APP_URL` points to the production frontend URL.

## PostgreSQL migration readiness

- [ ] Fresh MySQL production backup created.
- [ ] MySQL backup restore tested.
- [ ] Render PostgreSQL provisioned in the same region as the backend.
- [ ] PostgreSQL baseline migrations applied.
- [ ] MySQL-to-PostgreSQL import rehearsed in staging.
- [ ] Critical row counts validated for facilities, branches, users, patients, appointments, consultations, prescriptions, stock, invoices, payments, SHA claims, audit logs, and notifications.
- [ ] Login and core workflows tested against PostgreSQL.
- [ ] Railway/MySQL rollback path remains available.

## Functional smoke tests

- [ ] Super admin bootstrap instructions verified.
- [ ] Login tested.
- [ ] Facility and branch scoping tested.
- [ ] Patient registration/search tested.
- [ ] Triage tested.
- [ ] Doctor queue tested.
- [ ] Consultation workspace tested.
- [ ] Prescription creation tested.
- [ ] Pharmacy dispensing tested.
- [ ] Pharmacy stock movement tested.
- [ ] Billing and invoices tested.
- [ ] Payments tested.
- [ ] M-Pesa callback URL checked.
- [ ] Reports tested.
- [ ] Medical reports tested.
- [ ] PDF/printout output tested.
- [ ] Platform administration tested.
- [ ] Error, loading, empty, modal, form, and table states reviewed.

## Security

- [ ] No secrets committed.
- [ ] Production `JWT_SECRET` is not reused from development.
- [ ] Daraja/M-Pesa credentials are backend-only.
- [ ] Frontend environment variables contain no backend secrets.
- [ ] CORS production origins are explicit.
- [ ] Health endpoints are unauthenticated but do not expose secrets.
- [ ] Audit logging is enabled for critical actions.
- [ ] Audit, callback, data-outbox, and notification payloads are not storing secrets or large raw request bodies.
- [ ] Feature flags are reviewed before enabling AI, SMS, WhatsApp, patient portal, or data warehouse features.

## Final release approval

- [ ] Render backend deploy verified.
- [ ] Render frontend deploy verified.
- [ ] `/health/live` passes.
- [ ] `/health/ready` passes after database configuration.
- [ ] Production smoke test completed.
- [ ] Rollback plan reviewed with the release owner.
