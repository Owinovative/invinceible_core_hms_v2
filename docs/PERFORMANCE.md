# Performance & Scalability

Deep-dive companion: [performance-scalability.md](performance-scalability.md),
[database-storage-efficiency.md](database-storage-efficiency.md).

## 1. Request-path budget

| Control | Mechanism |
| --- | --- |
| Timeouts | `REQUEST_TIMEOUT_MS` global interceptor; 25s frontend fetch timeout |
| Payload caps | `BODY_LIMIT` 4mb; compact-JSON serializer for stored payloads |
| Rate limiting | Category buckets keep abusive/hot endpoints bounded |
| Heavy work off-path | PDFs, bulk reports, reconciliation, and all government API calls run via queues |

## 2. Caching strategy

`CacheService` (Redis-first, bounded in-memory fallback):

| Tier | TTL (default) | Examples |
| --- | --- | --- |
| Reference | 300s | Catalogs, tariffs, settings |
| Dashboard | 30s | Billing/reports widgets |
| Default | 60s | General reads |
| M-PESA status | 10s | Prompt status polling |

Frontend adds TanStack Query staleness windows per operation
(`lib/query-stale-times.ts`), eliminating redundant refetches.

## 3. Database performance

- Deliberate composite indexes on every hot path (tenancy + status +
  time; M-PESA `checkoutRequestId`; queue `status, nextAttemptAt`;
  catalog search) added via dedicated index migrations; audit with
  `npm run db:index:audit`.
- Pagination on all list endpoints (shared helpers).
- Storage hygiene tooling: `db:storage:audit`,
  `db:large-fields:report`, `db:cleanup:dry-run` (LongText/data-URL
  growth control).
- Slow-query flagging at `SLOW_DB_QUERY_MS`.

## 4. Concurrency & correctness under load

- M-PESA prompt locks + `MPESA_MAX_CONCURRENT_PROMPTS` prevent duplicate
  STK storms; payment confirmation is idempotent.
- Integration queue claims are atomic; multiple workers scale linearly
  without double submission.
- Financial recalculation funnels through `recalculateInvoice` for
  consistent balances.

## 5. Load testing

`load-tests/k6-critical-hms.js` exercises the critical path (login →
patient search → queue → billing). Run against staging with production
plans before scale-up; guidance in [load-testing.md](load-testing.md).

## 6. Known bottlenecks & improvement backlog

| Area | Note | Direction |
| --- | --- | --- |
| `billing.service.ts` size (~4.4k lines) | Maintainability more than runtime | Split into invoice/payments/tariff services ([ROADMAP.md](ROADMAP.md)) |
| Float money columns | Rounding done app-side | Migrate to `Decimal` |
| LongText data-URLs (logos/signatures) | Row-size growth | Object storage offload |
| Heavy report rollups | SQL aggregates today | Optional Rust engine (`backend/native/reports-engine`) is the prepared path |
| In-memory fallbacks on multi-instance | Rate limits/caches drift without Redis | Provide `REDIS_URL` when scaling beyond one instance |
