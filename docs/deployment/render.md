# Render production deployment

This guide prepares Invinceible Core HMS to move production hosting from the
current Railway backend and Vercel frontend setup to Render. Keep Railway and
Vercel active until the Render backend, frontend, health checks, payments, and
database access have been verified.

## Current deployment shape

| Area | Current repository path | Runtime | Render service |
| --- | --- | --- | --- |
| Backend API | `backend/` | NestJS on Node 22 | Web service |
| Frontend | `frontend/` | Next.js on Node 22 | Web service |
| Database | `backend/prisma/schema.prisma` and `backend/prisma-postgresql/schema.prisma` | MySQL today, PostgreSQL for Render cutover | External MySQL first, Render PostgreSQL after tested migration |
| Cache/queues | Optional `REDIS_URL` | Redis-compatible URL when configured | External Redis or Render Key Value |

The canonical Prisma datasource is still MySQL:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

The Render PostgreSQL cutover uses `backend/prisma-postgresql/schema.prisma`,
which is generated from the canonical MySQL schema by
`npm run prisma:schema:postgres`. Do not remove MySQL support until the
PostgreSQL import, validation checklist, and rollback plan have been tested.

## Render Blueprint

The repository includes `render.yaml` at the repo root.

It defines:

- `invinceible-core-hms-api`: backend web service.
- `invinceible-core-hms-web`: frontend Next.js web service.
- `invinceible-core-hms-postgres`: Render PostgreSQL database.

The blueprint is PostgreSQL-ready and wires backend `DATABASE_URL` from the
Render PostgreSQL internal connection string. Use this only after the
MySQL-to-PostgreSQL migration has been rehearsed. If you need the interim
external MySQL mode, override the backend build/pre-deploy commands and set
`DATABASE_URL` manually as described below.

## Database modes

### Mode 1: Render app with external MySQL

Use this mode while Render hosting is being validated without changing the
database engine.

| Setting | Value |
| --- | --- |
| Backend build command | `npm ci && npx prisma generate && npm run build` |
| Backend pre-deploy command | `npx prisma migrate deploy` |
| `DATABASE_URL` | Existing MySQL connection string entered as a Render secret |

### Mode 2: Render app with Render PostgreSQL

Use this mode only after a dry-run import and data validation pass.

| Setting | Value |
| --- | --- |
| Backend build command | `npm ci && npm run prisma:generate:postgres && npm run build` |
| Backend pre-deploy command | `npm run prisma:migrate:postgres` |
| `DATABASE_URL` | Render PostgreSQL internal connection string from Blueprint `fromDatabase` |

## Backend service settings

Use these settings if configuring manually in the Render dashboard:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Runtime | Node |
| Node version | `22` |
| Build command | PostgreSQL mode: `npm ci && npm run prisma:generate:postgres && npm run build` |
| Pre-deploy command | PostgreSQL mode: `npm run prisma:migrate:postgres` |
| Start command | `npm run start:prod` |
| Health check path | `/health/live` |

`/health/live` is intentionally lightweight and unauthenticated. Use
`/health/ready` after deploy when you want to verify database readiness, and
`/health/deep` for deeper diagnostics that include Redis state.

The NestJS bootstrap already listens on `process.env.PORT || 3000`, so Render
can inject the correct runtime port.

## Frontend service settings

Use these settings if configuring manually:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Runtime | Node |
| Node version | `22` |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start` |

The frontend is a Next.js app, so it should run as a Render web service rather
than a static site unless the app is intentionally changed to static export.

## Backend environment variables

Enter secrets only in the Render dashboard or Render secret/environment manager.
Do not commit real values.

Required:

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_PROVIDER` | Optional operational marker. Use `mysql` before cutover and `postgresql` after cutover. |
| `DATABASE_URL` | External MySQL in mode 1, Render PostgreSQL internal connection string in mode 2. |
| `JWT_SECRET` | At least 48 high-entropy characters. The blueprint can generate a value for a new Render service. |
| `JWT_EXPIRES_IN` | Example: `1d` |
| `FRONTEND_URL` | Primary Render frontend URL or custom production domain. |
| `FRONTEND_ORIGINS` | Comma-separated allowed frontend origins, including custom domain and Render frontend URL. |
| `PASSWORD_RESET_BASE_URL` | Example: `https://your-frontend.example.com/reset-password` |

Recommended:

| Variable | Notes |
| --- | --- |
| `TRUST_PROXY` | `true` on Render so Express trusts proxy headers. |
| `BODY_LIMIT` | Default `4mb`. |
| `REQUEST_TIMEOUT_MS` | Default `30000`. |
| `REDIS_URL` | Optional but recommended for production cache, rate limits, queues, and request coalescing. |
| `CACHE_PREFIX` | Example: `inv_hms`. |
| `CACHE_DEFAULT_TTL_SECONDS` | Default `60`. |
| `CACHE_DASHBOARD_TTL_SECONDS` | Default `30`. |
| `CACHE_REFERENCE_TTL_SECONDS` | Default `300`. |
| `CACHE_IN_MEMORY_MAX_ITEMS` | Default `10000` for fallback mode. |
| `PDF_IMAGE_MAX_BYTES` | Optional PDF logo/image cap. Default `512000`; keep low to avoid storing or fetching oversized image payloads for official printouts. |
| `RATE_LIMIT_TTL_SECONDS` | Default `60`. |
| `RATE_LIMIT_MAX` | Default `120`. |
| `AUTH_RATE_LIMIT_MAX` | Default `10`. |
| `SEARCH_RATE_LIMIT_MAX` | Default `60`. |
| `DASHBOARD_RATE_LIMIT_MAX` | Default `120`. |
| `PDF_RATE_LIMIT_MAX` | Default `20`. |
| `PUBLIC_VERIFY_RATE_LIMIT_MAX` | Default `30`. |
| `QUEUE_ENABLED` | `true` unless queue-backed jobs are intentionally disabled. |
| `QUEUE_CONCURRENCY` | Default `5`. |
| `QUEUE_PREFIX` | Example: `inv_hms`. |
| `WORKER_MODE` | `false` for the API service. |

M-Pesa / Daraja:

| Variable | Notes |
| --- | --- |
| `MPESA_ENV` | `sandbox` during validation, `production` after Safaricom production activation. |
| `MPESA_CONSUMER_KEY` | Secret. Backend only. |
| `MPESA_CONSUMER_SECRET` | Secret. Backend only. |
| `MPESA_PASSKEY` | Secret. Backend only. |
| `MPESA_SHORTCODE` | Production shortcode, paybill, or till context as configured. |
| `MPESA_CALLBACK_URL` | `https://<render-backend-or-api-domain>/billing/payments/mpesa/callback` |
| `MPESA_TRANSACTION_TYPE` | Usually `CustomerPayBillOnline` for paybill. |
| `MPESA_PROMPT_LOCK_SECONDS` | Default `90`. |
| `MPESA_MAX_CONCURRENT_PROMPTS` | Default `20`. |
| `MPESA_REQUEST_TIMEOUT_MS` | Default `15000`. |
| `MPESA_STATUS_CACHE_SECONDS` | Default `10`. |

Optional feature/provider variables:

| Variable | Notes |
| --- | --- |
| `AI_ENABLED` | Keep `false` unless AI use is approved for patient data. |
| `GEMINI_API_KEY` | Secret. Required only when AI is enabled. |
| `GEMINI_MODEL` | Example: `gemini-2.5-flash-lite`. |
| `SMS_ENABLED` | `false` until an approved provider is configured. |
| `WHATSAPP_ENABLED` | `false` until an approved provider is configured. |
| `SHA_ENABLED` | Current default `true`. |
| `PATIENT_PORTAL_ENABLED` | Current default `false`. |
| `DATA_WAREHOUSE_ENABLED` | Current default `false`. |
| `CLINICAL_DECISION_SUPPORT_ENABLED` | Current default `true`. |
| `MOBILE_OPTIMIZED_VIEWS_ENABLED` | Current default `true`. |

## Frontend environment variables

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Public Render backend URL, for example `https://invinceible-core-hms-api.onrender.com`. |
| `NEXT_PUBLIC_APP_URL` | Public Render frontend URL or custom production domain. |

Never place backend secrets, database URLs, JWT secrets, Daraja credentials, AI
keys, or provider credentials in frontend environment variables.

## Database migration safety

The PostgreSQL database migration is not an environment-variable-only change.
Follow [MySQL to Render PostgreSQL migration](mysql-to-render-postgres.md)
before switching production traffic.

Safest first hosting migration:

1. Keep the existing production MySQL database.
2. Set Render backend `DATABASE_URL` to that external MySQL connection string.
3. Run `npx prisma migrate deploy` through Render pre-deploy after taking a
   fresh backup.
4. Verify `/health/ready` before sending production users to Render.

PostgreSQL cutover:

1. Provision Render PostgreSQL from the Blueprint.
2. Generate the PostgreSQL Prisma schema with `npm run prisma:schema:postgres`.
3. Apply PostgreSQL baseline migrations with `npm run prisma:migrate:postgres`.
4. Import data from a fresh MySQL snapshot into Render PostgreSQL.
5. Run data integrity checks for facilities, branches, users, patients,
   invoices, payments, stock, SHA claims, and audit logs.
6. Point Render backend to the PostgreSQL `DATABASE_URL` only after validation.

## Deploy order

1. Create the Render Blueprint from `render.yaml`.
2. Enter all backend secrets and public URLs in the Render dashboard.
3. Deploy the backend first.
4. Verify `GET /health/live`.
5. Verify `GET /health/ready`.
6. Configure the frontend `NEXT_PUBLIC_API_BASE_URL` to the Render backend URL.
7. Deploy the frontend.
8. Add the Render frontend URL and any custom domain to backend
   `FRONTEND_URL`/`FRONTEND_ORIGINS`.
9. Review database storage size with `npm run db:storage:audit` and cleanup
   candidates with `npm run db:cleanup:dry-run`.
10. Validate login, patient search, clinical flows, invoices, PDF downloads,
   M-Pesa sandbox or production callbacks, and admin reports.
11. Move DNS or production traffic only after smoke testing passes.

## Rollback plan

- Keep Railway backend and Vercel frontend active until Render is fully verified.
- Do not remove Railway/Vercel env vars during the Render trial.
- If Render fails, point frontend API env/DNS back to Railway and keep the
  existing Vercel deployment serving users.
- Keep the MySQL database read-only but available during PostgreSQL validation.
- If PostgreSQL validation fails before cutover, keep production on MySQL.
- If cutover fails after traffic moves, point the backend `DATABASE_URL` and
  frontend API URL back to the Railway/MySQL stack and restore from the latest
  backup only if MySQL received writes during the failed window.

## Secrets policy

- Do not commit `.env` files.
- Do not commit real database URLs.
- Do not commit Daraja consumer keys, consumer secrets, passkeys, or callback
  credentials.
- Do not commit JWT secrets.
- Do not paste secrets into PRs, issue comments, logs, or screenshots.
