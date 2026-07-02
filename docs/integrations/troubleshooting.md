# Integration Troubleshooting Guide

## First stops

1. `GET /integrations/etims/status` / `GET /integrations/dha/status` —
   confirm the flag, mode, and queue counts.
2. `integration_api_logs` table — every external attempt with endpoint,
   HTTP status, latency, retry count, and `correlationId`.
3. Application logs — filter by the same `correlationId` (propagated from
   the `X-Request-Id` of the originating API call).

## Common issues

### Invoice paid but no eTIMS document
- `ETIMS_ENABLED` must be `true` on the process handling billing.
- The invoice must have a positive total and at least one non-removed
  item; validation failures are logged and audited at trigger time.
- An already-fiscalized invoice is skipped by design
  (`ALREADY_FISCALIZED`) — check
  `GET /integrations/etims/invoices/:invoiceId`.

### Documents stuck in QUEUED
- The worker may be off: check `INTEGRATION_WORKER_ENABLED` and that at
  least one process runs it.
- KRA may be down: `integration_api_logs` will show `TIMEOUT` /
  `NETWORK_ERROR` / 5xx outcomes. The queue retries automatically with
  exponential backoff up to `ETIMS_MAX_ATTEMPTS`; nothing to do unless it
  dead-letters.
- Force an immediate drain: `POST /integrations/etims/sync`.

### Requests in DEAD_LETTER
- Inspect `GET /integrations/etims/queue/dead-letters` — `lastError` and
  `lastHttpStatus` say why (exhausted retries, KRA rejection, missing
  handler).
- After fixing the cause: `POST /integrations/etims/queue/:id/requeue`
  (resets the retry budget).
- KRA `801` (duplicate) means the CU already has that `invcNo`; check
  whether an earlier attempt actually succeeded before resubmitting.

### Document REJECTED
- KRA refused the payload permanently (validation, duplicate, bad codes).
  The reason is in `etims_invoices.errorMessage` and the audit log. Fix the
  underlying data, then resubmit manually via
  `POST /integrations/etims/invoices/:invoiceId/submit` (a fresh document
  is created only if no active one exists).

### DHA 401 loops
- One automatic token refresh is attempted per call. Persistent 401 means
  bad `DHA_CLIENT_ID`/`DHA_CLIENT_SECRET` or a wrong `DHA_TOKEN_URL`.

### App refuses to boot after enabling an integration
- Environment validation requires `ETIMS_BASE_URL`/`ETIMS_TIN`/
  `ETIMS_CMC_KEY` (or the DHA equivalents) once the mode is
  `sandbox`/`production`. The error message names the missing variable.

### Worker seems to double-process
- It cannot: rows are claimed with a guarded `PENDING → PROCESSING`
  update. If a process crashes mid-flight, the row is auto-recovered to
  `PENDING` after `INTEGRATION_STUCK_REQUEST_MS` (default 10 minutes).

## Support data to collect

When escalating, include: the `correlationId`, the
`integration_outbound_requests` row (status, attemptCount, lastError), the
matching `integration_api_logs` rows, and the fiscal document /
`dha_transactions` row. None of these contain secrets.
