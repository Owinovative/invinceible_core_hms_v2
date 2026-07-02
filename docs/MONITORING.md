# Monitoring & Observability

## 1. Health endpoints

| Endpoint | Checks | Use |
| --- | --- | --- |
| `GET /health/live` | Process up | Render health check / liveness probe |
| `GET /health/ready` | Database reachability | Readiness gates, deploy verification |
| `GET /health/deep` | DB + Redis + queue depths | On-call diagnostics, uptime probes |

## 2. Logging

- All backend logs flow through `SafeLoggerService`: structured
  message + JSON context, secrets redacted, long payloads truncated.
- `RequestLoggingMiddleware` logs each request with method, route,
  status, latency, and request ID; requests slower than
  `SLOW_REQUEST_MS` are flagged, as are DB queries above
  `SLOW_DB_QUERY_MS`.
- Integration API calls log timestamp, endpoint, request ID, response
  code, latency, retry count, and correlation ID — and persist the same
  metadata to `integration_api_logs`.
- `LOG_LEVEL=debug` enables verbose diagnostics.

Correlation flow: client → `X-Request-Id` header → all logs → audit rows
→ integration logs. One ID traces a payment from UI click to KRA response.

## 3. Built-in operational dashboards

| Surface | Content |
| --- | --- |
| `/reports` (frontend) | Billing, revenue-integrity, cashier close, module operations, profit analytics |
| `GET /integrations/etims/status`, `/integrations/dha/status` | Queue depth per status, mode, flags |
| `GET /integrations/etims/queue/dead-letters` | Failed government submissions awaiting action |
| Audit browser (`audit.read`) | Security-relevant events with severity |
| User-location overview | Active sessions, geo anomalies |
| Ops dashboard guide | [operations-dashboard.md](operations-dashboard.md) |

## 4. Alerting recommendations

Wire log-based/HTTP probes to alert on:

1. `/health/ready` failing > 2 min (DB down).
2. Any `DEAD_LETTER` rows in `integration_outbound_requests` (fiscal
   compliance risk) — see [integrations/troubleshooting.md](integrations/troubleshooting.md).
3. Sustained `TIMEOUT`/`NETWORK_ERROR` outcomes in `integration_api_logs`.
4. M-PESA callbacks absent for > N minutes during business hours.
5. 5xx rate above baseline; auth lockout spikes (credential stuffing).
6. Queue depth growth without drain (`/health/deep`).

Full playbook: [operations-alerting.md](operations-alerting.md) and
[logging-observability.md](logging-observability.md).

## 5. Capacity & performance telemetry

Slow-request/query flags plus the k6 critical-path script
(`load-tests/k6-critical-hms.js`) provide the baseline; run it against
staging before capacity changes ([load-testing.md](load-testing.md),
[PERFORMANCE.md](PERFORMANCE.md)).
