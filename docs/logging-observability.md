# Logging And Observability

Invinceible Core HMS logs operational, clinical workflow, financial, and security events with a request ID where available. Logs are designed for managed production hosts such as Railway and Render where stdout/stderr are the main observability stream.

## What Is Logged

- HTTP method, route, status, duration, request ID, user ID, role, facility ID, and branch ID where safe.
- Slow list and workspace endpoints using `SLOW_LIST_MS`, `SLOW_CONSULTATION_WORKSPACE_MS`, or `SLOW_REQUEST_MS`.
- Authentication and authorization failures through the existing auth/resilience layer.
- Notification list pressure, service tariff list pressure, pharmacy stock list pressure, and consultation workspace load time.
- M-Pesa prompt/callback/status events with safe identifiers only.
- Prescription creation, pharmacy dispensing, doctor-room direct dispensing, doctor-room injection administration, IPD medicine administration, and stock movement audit records.
- PDF/report downloads through audit logs where implemented.

## Redaction Rules

Never log:

- Passwords or password hashes.
- JWTs, refresh tokens, reset tokens, cookies, or authorization headers.
- M-Pesa consumer secrets, passkeys, access tokens, or raw credentials.
- Database URLs or full `process.env`.
- Raw patient clinical narratives in request logs.
- Raw external callback payloads if they may contain sensitive values.

Use `SafeLoggerService` for backend logs. It redacts known secret-like keys and keeps logs structured enough for filtering.

## Recommended Alert Rules

- Repeated failed logins or account lockouts.
- Many 403 responses from one IP/user.
- Slow `/consultations/:id/workspace` responses.
- Slow notification, tariff, pharmacy stock, dashboard, report, and PDF endpoints.
- M-Pesa prompt failures or duplicate prompt blocks.
- Database or Redis health check failures.
- Queue worker failures.
- Stock administration failures or negative-stock prevention events.

## Production Host Notes

- Set `LOG_LEVEL=info` in production.
- Set `SLOW_REQUEST_MS=1000`, `SLOW_LIST_MS=750`, and tune lower after observing real traffic.
- Keep deployment variables private. Do not paste secrets into logs, comments, PRs, or screenshots.
- On Render, verify service logs after deploy and confirm `/health/live` and `/health/ready` status before moving traffic.
