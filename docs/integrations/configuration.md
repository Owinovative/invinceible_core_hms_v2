# Integration Configuration Guide

All settings live in environment variables (see `backend/.env.example`).
Secrets must never be committed; use your platform's secret manager
(Render environment groups, GitHub Actions secrets, etc.).

## Setup instructions

1. Apply the database migration (adds `etims_invoices`,
   `integration_outbound_requests`, `integration_api_logs`,
   `dha_transactions`):

   ```bash
   cd backend
   npm run prisma:migrate:deploy          # MySQL
   npm run prisma:migrate:postgres        # PostgreSQL deployments
   ```

2. Start in **mock mode** first (no external connectivity needed):

   ```bash
   ETIMS_ENABLED=true ETIMS_MODE=mock \
   DHA_ENABLED=true  DHA_MODE=mock  npm run start:dev
   ```

3. Verify with `GET /integrations/etims/status` and
   `GET /integrations/dha/status`, then complete a test payment and check
   `GET /integrations/etims/invoices/:invoiceId`.

4. Switch to `sandbox` and finally `production` once credentials are
   issued. Environment validation refuses to boot if required variables
   are missing for the selected mode.

## KRA eTIMS variables

| Variable | Default | Description |
| --- | --- | --- |
| `ETIMS_ENABLED` | `false` | Master switch. Billing is unaffected when off. |
| `ETIMS_MODE` | `mock` | `mock`, `sandbox`, or `production` (selects the adapter). |
| `ETIMS_BASE_URL` | – | OSCU API base URL. **Required** for sandbox/production. |
| `ETIMS_TIN` | – | Facility KRA PIN. **Required** for sandbox/production. |
| `ETIMS_BHF_ID` | `00` | KRA branch office id. |
| `ETIMS_CMC_KEY` | – | Device communication key issued at device init. **Secret. Required** for sandbox/production. |
| `ETIMS_DEVICE_SERIAL` | – | Device serial registered with KRA. |
| `ETIMS_TIMEOUT_MS` | `15000` | Per-request timeout. |
| `ETIMS_MAX_ATTEMPTS` | `8` | Queue-level retry budget per document. |
| `ETIMS_DEFAULT_TAX_CODE` | `A` | KRA tax type for lines without an override. `A` = VAT-exempt (medical services). |
| `ETIMS_VAT_RATE` | `16` | Standard VAT percent for tax code `B`. |
| `ETIMS_RECEIPT_VERIFY_URL` | KRA default per mode | Override for the QR verification URL. |

## DHA variables

| Variable | Default | Description |
| --- | --- | --- |
| `DHA_ENABLED` | `false` | Master switch. |
| `DHA_MODE` | `mock` | `mock`, `sandbox`, or `production`. |
| `DHA_BASE_URL` | – | DHA API base URL. **Required** for sandbox/production. |
| `DHA_TOKEN_URL` | – | OAuth2 token endpoint (client credentials). |
| `DHA_CLIENT_ID` / `DHA_CLIENT_SECRET` | – | OAuth2 client credentials. **Secret. Required** for sandbox/production. |
| `DHA_API_VERSION` | `v1` | Version segment used in paths and `X-API-Version`. |
| `DHA_FACILITY_CODE` | – | KMHFL facility code sent as `X-Facility-Code`. |
| `DHA_TIMEOUT_MS` | `15000` | Per-request timeout. |
| `DHA_MAX_ATTEMPTS` | `8` | Queue-level retry budget per submission. |

## Queue worker variables

| Variable | Default | Description |
| --- | --- | --- |
| `INTEGRATION_WORKER_ENABLED` | `true` | Starts the background poller when any integration is enabled. Safe to run in web and worker processes concurrently (claiming is atomic). |
| `INTEGRATION_WORKER_POLL_MS` | `5000` | Poll interval. |
| `INTEGRATION_QUEUE_BATCH_SIZE` | `10` | Requests drained per tick. |
| `INTEGRATION_RETRY_BASE_DELAY_MS` | `30000` | First retry delay (doubles each attempt, ±20% jitter). |
| `INTEGRATION_RETRY_MAX_DELAY_MS` | `3600000` | Retry delay cap (1 hour). |
| `INTEGRATION_STUCK_REQUEST_MS` | `600000` | PROCESSING rows older than this are recovered to PENDING (crash recovery). |

## Security notes

- Tokens are cached in memory and refreshed before expiry
  (single-flight); a `401` invalidates the cache and the call is retried
  once with a fresh token.
- The structured logger redacts anything matching secret patterns
  (tokens, keys, passwords) and the API audit table stores metadata only —
  never headers or bodies.
- Environment validation enforces the presence of credentials before the
  app will boot with a live mode enabled.
