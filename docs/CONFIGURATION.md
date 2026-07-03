# Configuration Reference

All configuration is environment-driven. Backend variables are validated
at startup by
[`backend/src/config/env.validation.ts`](../backend/src/config/env.validation.ts)
— missing or unsafe production values **prevent boot**. Templates:
[`backend/.env.example`](../backend/.env.example) and root
[`.env.example`](../.env.example).

## Backend

### Core

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `production` activates stricter validation + HSTS |
| `DATABASE_PROVIDER` | `mysql` | `mysql` or `postgresql` (selects schema + migrations) |
| `DATABASE_URL` | — **required** | Connection string |
| `TRUST_PROXY` | unset | `true` behind Render/other proxies |
| `BODY_LIMIT` | `4mb` | JSON/urlencoded body cap |
| `REQUEST_TIMEOUT_MS` | `30000` | Global request timeout |
| `FRONTEND_URL` / `FRONTEND_ORIGINS` | — required in prod | CORS allow-list |

### Authentication & security

| Variable | Default | Notes |
| --- | --- | --- |
| `JWT_SECRET` | — **required** | ≥32 chars; production: ≥48 high-entropy (weak values rejected) |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `PASSWORD_MIN_LENGTH` | `12` | Policy floor |
| `AUTH_FAILED_LOGIN_DELAY_MAX_MS` | `2500` | Progressive delay cap |
| `STEP_UP_ENFORCEMENT_ENABLED` | `false` | Enforce step-up re-auth |
| `STEP_UP_TTL_SECONDS` | `300` | Step-up token lifetime |
| `PASSWORD_RESET_BASE_URL` | dev URL | Reset-link base |
| `RETURN_DEV_RESET_TOKEN` | `false` | Dev-only convenience |

### Cache, rate limits, queue

| Variable | Default | Notes |
| --- | --- | --- |
| `REDIS_URL` | empty | Optional; memory fallback everywhere |
| `CACHE_PREFIX` | `inv_hms` | Key namespace |
| `CACHE_DEFAULT_TTL_SECONDS` / `CACHE_DASHBOARD_TTL_SECONDS` / `CACHE_REFERENCE_TTL_SECONDS` | 60 / 30 / 300 | TTL tiers |
| `CACHE_IN_MEMORY_MAX_ITEMS` | `10000` | Fallback cache bound |
| `RATE_LIMIT_TTL_SECONDS` / `RATE_LIMIT_MAX` | 60 / 120 | Global bucket |
| `AUTH_RATE_LIMIT_MAX` / `SEARCH_RATE_LIMIT_MAX` / `DASHBOARD_RATE_LIMIT_MAX` / `PDF_RATE_LIMIT_MAX` / `MPESA_RATE_LIMIT_MAX` / `PUBLIC_VERIFY_RATE_LIMIT_MAX` | 10/60/120/20/5/30 | Category buckets |
| `QUEUE_ENABLED` / `QUEUE_CONCURRENCY` / `QUEUE_PREFIX` | true / 5 / `inv_hms` | Job queue |
| `WORKER_MODE` | `false` | `true` in the dedicated worker process |
| `SLOW_REQUEST_MS` / `SLOW_DB_QUERY_MS` | 1000 / 500 | Slow-op logging thresholds |
| `LOG_LEVEL` | `info` | `debug` enables verbose logs |

### Feature flags

| Variable | Default | Feature |
| --- | --- | --- |
| `SHA_ENABLED` | `true` | SHA claims workflow |
| `PATIENT_PORTAL_ENABLED` | `false` | Patient portal APIs |
| `AI_ENABLED` | `false` | Gemini clinical assistant |
| `SMS_ENABLED` / `WHATSAPP_ENABLED` | `false` | Messaging channels (stubs until providers configured) |
| `CLINICAL_DECISION_SUPPORT_ENABLED` | `true` | Safety checks |
| `DATA_WAREHOUSE_ENABLED` | `false` | Outbox feed |
| `MOBILE_OPTIMIZED_VIEWS_ENABLED` | `true` | Mobile variants |

### Payments (M-PESA Daraja)

| Variable | Default | Notes |
| --- | --- | --- |
| `MPESA_ENV` | `sandbox` | `sandbox`/`production` |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_PASSKEY` | — | **Secrets**; per-facility credentials can override in-app |
| `MPESA_SHORTCODE` | `174379` | Paybill/till |
| `MPESA_CALLBACK_URL` | — | Public callback URL |
| `MPESA_TRANSACTION_TYPE` | `CustomerPayBillOnline` | Or `CustomerBuyGoodsOnline` |
| `MPESA_PROMPT_LOCK_SECONDS` / `MPESA_MAX_CONCURRENT_PROMPTS` / `MPESA_REQUEST_TIMEOUT_MS` / `MPESA_STATUS_CACHE_SECONDS` | 90 / 20 / 15000 / 10 | Operational guards |

### Government integrations (KRA eTIMS, DHA)

Full reference in [integrations/configuration.md](integrations/configuration.md).
Summary: `ETIMS_ENABLED`/`ETIMS_MODE`/`ETIMS_BASE_URL`/`ETIMS_TIN`/
`ETIMS_BHF_ID`/`ETIMS_CMC_KEY`/`ETIMS_DEVICE_SERIAL`/tax + timeout knobs;
`DHA_ENABLED`/`DHA_MODE`/`DHA_BASE_URL`/`DHA_TOKEN_URL`/`DHA_CLIENT_ID`/
`DHA_CLIENT_SECRET`/`DHA_API_VERSION`/`DHA_FACILITY_CODE`;
`INTEGRATION_WORKER_*` and `INTEGRATION_RETRY_*` queue tuning. Live modes
require their credentials at boot.

### AI assistant

| Variable | Notes |
| --- | --- |
| `GEMINI_API_KEY` | Backend-only secret |
| `GEMINI_MODEL` | Default `gemini-2.5-flash-lite` |

## Frontend

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL (required on deployments; localhost guard otherwise) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for links/QRs |

## Configuration principles

1. **Fail fast** — invalid production config aborts startup with a named
   variable in the error.
2. **Safe defaults** — everything optional defaults to the safest
   behavior (features off, mock adapters, memory fallbacks).
3. **No secrets in code or logs** — enforced by validation + redacting
   logger + CI secret scan.
