# High Availability Architecture

Invinceible Core HMS should run as multiple stateless backend instances behind a load balancer, one production frontend deployment, one primary MySQL database, Redis for cache/rate limits/queues, and separate worker processes for heavy jobs.

## Production topology

- Frontend: Vercel during the current deployment, or Render web service after the Render migration is verified.
- Backend API: Railway during the current deployment, or Render web service after the Render migration is verified. Scale to two or more instances when traffic grows.
- Worker: at least one `start:prod:worker` process for queued reports, imports, notifications, reconciliation, and exports.
- Redis: required for shared cache, rate limits, request coalescing, and queue coordination across backend instances.
- Database: managed MySQL with daily backups and a future read replica for reporting.

## Deployment rules

- Run migrations in a controlled deploy step before scaling new code.
- Keep `/health/live` for process liveness and `/health/ready` for load balancer readiness.
- Do not send traffic to a new backend instance until readiness passes.
- Keep queue workers on the same commit as the API.
- Roll back application code before rolling back database schema unless a migration was explicitly designed to be reversible.
- During Render cutover, keep Railway/Vercel active until Render health checks, CORS, database connectivity, M-Pesa callbacks, and login smoke tests pass.

## Degraded mode

The system should keep safe read paths alive when Redis, M-Pesa, PDF generation, or a worker fails. Clinical and billing writes must fail closed when facility scope, branch scope, payment state, or authorization cannot be verified.
