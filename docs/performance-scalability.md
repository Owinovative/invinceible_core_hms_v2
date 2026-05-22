# Performance, Scalability, Resilience, and Security

This document covers the critical production controls added for high-concurrency hospital use.

## Goals

- Keep the HMS alive under request floods.
- Avoid duplicate database work for identical expensive requests.
- Avoid duplicate M-Pesa STK prompt storms.
- Return safe errors with request IDs instead of stack traces.
- Keep Redis optional: use Redis when available, fall back safely when it is not.
- Keep facility and branch scoping in cache keys and query filters.

## New Backend Controls

### Request IDs and Safe Errors

Every request receives an `X-Request-Id`.

Production errors return:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "requestId": "..."
}
```

Stack traces are not returned in production.

Logs are sanitized. The logger redacts:

- authorization headers
- cookies
- passwords
- JWTs
- M-Pesa passkeys
- M-Pesa consumer secrets
- database URLs
- tokens and client secrets

### Health Endpoints

- `GET /health/live`: process is alive
- `GET /health/ready`: database is reachable and Redis state is reported
- `GET /health/deep`: database, Redis, memory, and uptime detail

Use `/health/live` for process liveness and `/health/ready` for load balancer readiness.

### Redis Cache With Fallback

Redis is enabled when `REDIS_URL` is present.

If Redis is down or misconfigured:

- the backend does not crash
- safe in-memory cache is used
- logs clearly show Redis fallback

Cache methods:

- `get<T>(key)`
- `set<T>(key, value, ttlSeconds)`
- `del(key)`
- `getOrSet<T>(key, ttlSeconds, loader)`
- `rememberScoped<T>(scope, key, ttlSeconds, loader)`
- `invalidatePattern(pattern)`
- in-flight request coalescing

Scope-aware cache keys must include facility, branch, and role where data differs by scope.

Never cache secrets or global patient clinical detail.

### Request Coalescing

For repeated expensive requests, the first request runs the loader. Identical requests wait for the same promise, then reuse the result.

Applied to high-value areas:

- root app stats
- billing dashboard
- reports dashboard
- service tariffs
- pharmacy medicine catalog
- facility metadata
- patient search suggestions
- M-Pesa status polling

### Rate Limiting

Rate limits use Redis when available and memory fallback when Redis is unavailable.

Protected endpoint groups:

- login and auth
- dashboards
- search and suggestions
- PDF/report routes
- file uploads/imports
- public invoice verification
- M-Pesa STK prompts
- M-Pesa status polling

429 responses include `Retry-After`.

M-Pesa callback routes are not blocked by the normal middleware.

### M-Pesa Safety

The STK prompt path now has:

- per-invoice duplicate lock
- per-phone/facility/user throttle
- idempotency key support
- controlled in-process concurrency
- Safaricom request timeout
- short status query cache
- safe duplicate response instead of sending another prompt

Callbacks remain responsible for idempotent payment updates. Safaricom credentials must never be returned to frontend clients or written to logs.

### Queue Foundation

The queue foundation supports:

- Redis list backend
- in-memory fallback
- idempotency keys
- retries
- dead-letter queue
- worker bootstrap
- safe failure logging

Job types:

- PDF generation
- bulk reports
- SHA claim batches
- CSV imports
- M-Pesa reconciliation
- SMS/email/notification delivery
- stock reconciliation
- audit analysis
- large exports

Worker commands:

```bash
npm run start:worker
npm run start:prod:worker
```

Recommended deployment is a separate worker service running the worker command.

### Database Indexes

The migration adds indexes for high-traffic filters and joins:

- facility and branch scoping
- patient number and phone search
- invoice/payment status and numbers
- M-Pesa checkout, merchant, and receipt lookups
- appointment date and doctor queues
- lab, prescription, admission dashboards
- stock lookups
- audit log review

Deploy migrations during a low-traffic window. For large production tables, check the database engine behavior because MySQL index creation can take locks depending on version and table shape.

## Environment Variables

```bash
REDIS_URL=
CACHE_PREFIX=inv_hms
CACHE_DEFAULT_TTL_SECONDS=60
CACHE_DASHBOARD_TTL_SECONDS=30
CACHE_REFERENCE_TTL_SECONDS=300
CACHE_IN_MEMORY_MAX_ITEMS=10000

RATE_LIMIT_TTL_SECONDS=60
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_MAX=10
SEARCH_RATE_LIMIT_MAX=60
DASHBOARD_RATE_LIMIT_MAX=120
PDF_RATE_LIMIT_MAX=20
MPESA_RATE_LIMIT_MAX=5
PUBLIC_VERIFY_RATE_LIMIT_MAX=30

MPESA_PROMPT_LOCK_SECONDS=90
MPESA_MAX_CONCURRENT_PROMPTS=20
MPESA_REQUEST_TIMEOUT_MS=15000
MPESA_STATUS_CACHE_SECONDS=10

QUEUE_ENABLED=true
QUEUE_CONCURRENCY=5
QUEUE_PREFIX=inv_hms
WORKER_MODE=false

REQUEST_TIMEOUT_MS=30000
BODY_LIMIT=4mb
TRUST_PROXY=false
SLOW_REQUEST_MS=1000
SLOW_DB_QUERY_MS=500
LOG_LEVEL=info
```

Use a production-grade `JWT_SECRET`, secure `DATABASE_URL`, Redis password/TLS where supported, and rotate any secret that has ever been exposed locally.

## Deployment Notes

Recommended services on Railway, Render, or equivalent managed hosting:

- backend web service: `npm run start:prod`
- backend worker service: `npm run start:prod:worker`
- Redis service or managed Redis provider
- MySQL service with adequate CPU, memory, and connection limits

Set `TRUST_PROXY=true` only when the platform or CDN proxy headers are trusted in your deployment. For Render migration details, see [Render production deployment](deployment/render.md).

## Cloudflare or Load Balancer Notes

- Health check `/health/ready`.
- Preserve `X-Request-Id` when present.
- Enable request body limits.
- Add WAF rules for obvious abusive traffic.
- Keep public verification endpoints rate-limited.

## Horizontal Scaling

For 30,000 concurrent users:

- run multiple backend replicas
- use Redis for shared cache and rate limiting
- run separate workers for heavy jobs
- keep M-Pesa concurrency controlled
- ensure database connection pool limits are explicit
- avoid every frontend tab polling dashboards at the same interval

## Future Read Replica Plan

After write safety is stable, route report-heavy read queries to a read replica:

- dashboards
- audit logs
- report summaries
- historical invoice lists

Keep writes, transactions, and M-Pesa callbacks on the primary database.

## Rust Future Plan

Rust is optional today and should remain outside the production request path until CI and deployment install Rust reliably.

Use Rust first for worker jobs:

- large CSV parsing
- high-volume reports
- duplicate patient scoring
- stock reconciliation

## Safe Deployment Order

1. Deploy environment variables.
2. Provision Redis.
3. Run Prisma migration in a controlled window.
4. Deploy backend web.
5. Deploy worker process.
6. Verify `/health/live`, `/health/ready`, `/health/deep`.
7. Run low-volume smoke tests.
8. Increase replicas.
9. Run staged load tests.
