# Production Security Checklist

Use this checklist before every production deployment.

## Secrets

- Set a unique `JWT_SECRET` with at least 48 high-entropy characters.
- Rotate any local or shared secrets that were ever exposed outside deployment secret storage.
- Keep `DATABASE_URL`, Redis URL, M-Pesa consumer secret, M-Pesa passkey, AI keys, SMTP keys, and provider tokens out of the frontend.
- Never commit `.env`, database dumps, credentials, private keys, or M-Pesa certificates.

## Authentication

- Confirm failed-login lockout is active.
- Confirm progressive delay is active through `AUTH_FAILED_LOGIN_DELAY_MAX_MS`.
- Use admin step-up for dangerous actions when ready by setting `STEP_UP_ENFORCEMENT_ENABLED=true`.
- Keep access tokens short-lived enough for production risk.
- Review super admin users monthly.

## Access Control

- Test facility admin cannot view another facility.
- Test branch users cannot view another branch unless explicitly assigned.
- Test cashier cannot change M-Pesa settings.
- Test doctor cannot manually confirm payments.
- Test lab users cannot change billing.
- Test inactive users cannot log in.

## API Hardening

- Set strict `FRONTEND_URL` or `FRONTEND_ORIGINS`.
- Serve through HTTPS only.
- Keep body upload limits small and explicit.
- Keep public verification, login, search, PDF, and M-Pesa routes rate-limited.
- Verify production errors do not expose stack traces.

## Payments

- Confirm M-Pesa callback URL points to the current production backend, whether Railway during rollback or Render after cutover.
- Confirm facility-level credentials are not returned to the frontend.
- Confirm STK prompt duplicate locks work.
- Confirm one M-Pesa receipt cannot confirm multiple payments.
- Run daily reconciliation for pending and failed payments.

## Operations

- Run database backup before migrations.
- Run Prisma migration in staging first.
- For Render migration, follow [Render production deployment](deployment/render.md) and keep Railway/Vercel active until smoke tests pass.
- Run health checks after deploy: `/health/live`, `/health/ready`, `/health/deep`.
- Ensure queue worker is running when queued jobs are enabled.
- Monitor slow requests, failed logins, M-Pesa failures, queue failures, and DB errors.
