# Integration Layer Deployment Guide

## Rollout order

1. **Deploy with both integrations disabled** (default). The new tables
   are created by the migration; nothing else changes behavior.

   ```bash
   cd backend
   npm ci
   npm run prisma:migrate:deploy        # or prisma:migrate:postgres on Render/PostgreSQL
   npm run build
   npm run start:prod
   ```

2. **Enable mock mode in staging** (`ETIMS_ENABLED=true ETIMS_MODE=mock`,
   `DHA_ENABLED=true DHA_MODE=mock`). Run real billing flows and confirm:
   - `GET /integrations/etims/status` shows queue movement,
   - fiscal documents reach `ACCEPTED` with QR data,
   - SHA claim submissions produce `COMPLETED` DHA transactions.

3. **eTIMS sandbox**: register the OSCU device with KRA, set
   `ETIMS_MODE=sandbox` plus `ETIMS_BASE_URL`, `ETIMS_TIN`,
   `ETIMS_BHF_ID`, `ETIMS_DEVICE_SERIAL`, `ETIMS_CMC_KEY` (secret store).
   Validate a full day of invoices, credit notes, and a cancellation.

4. **Production**: switch `ETIMS_MODE=production` (and later
   `DHA_MODE=sandbox/production` when DHA issues credentials). The app
   refuses to boot if required variables are missing for a live mode.

## Process topology

- **Single process** (default): the integration worker polls inside the
  web process (`INTEGRATION_WORKER_ENABLED=true`).
- **Web + worker** (recommended at scale): run `npm run start:prod:worker`
  alongside the web service. Both may run the integration worker
  concurrently — queue claiming is atomic, so requests are never
  double-processed. To restrict processing to the worker, set
  `INTEGRATION_WORKER_ENABLED=false` on the web service only.

## Operational monitoring

- `GET /integrations/etims/status` / `GET /integrations/dha/status` —
  queue depth per status; alert on growing `PENDING` or any `DEAD_LETTER`.
- `integration_api_logs` — latency and outcome per external call; alert on
  sustained `TIMEOUT` / `NETWORK_ERROR` outcomes.
- Dead letters: inspect via `GET /integrations/etims/queue/dead-letters`,
  fix the cause, then `POST /integrations/etims/queue/:id/requeue`.

## Secrets checklist

- `ETIMS_CMC_KEY`, `DHA_CLIENT_SECRET` (and ids/URLs) live only in the
  environment/secret manager — never in the repo or logs.
- Rotate by updating the environment and restarting; tokens are cached in
  memory only.
