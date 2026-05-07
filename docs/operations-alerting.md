# Operations Alerting

Production alert channels can be email, WhatsApp, Telegram, Slack, hosting alerts, database alerts, or uptime monitoring.

## Required Alerts

- Backend readiness failing.
- Deep health check failing.
- Database unavailable or slow.
- Redis unavailable for more than five minutes.
- Queue worker stopped while `QUEUE_ENABLED=true`.
- Queue failures above baseline.
- M-Pesa STK failures above baseline.
- M-Pesa callbacks delayed.
- Failed login spikes.
- Locked account spikes.
- High 401/403 rate.
- High 429 rate.
- Slow endpoint rate above baseline.
- Memory or CPU saturation.
- Failed backups.
- Failed migrations.

## Suggested Thresholds

- Slow request: greater than `SLOW_REQUEST_MS`.
- Slow DB operation: greater than `SLOW_DB_QUERY_MS`.
- Error rate: more than 2 percent for five minutes.
- Queue depth: growing for ten minutes without completed jobs.
- Login failures: more than 20 failures for one facility in five minutes.
- Public verification: more than 30 requests per minute from one IP.

## Response Pattern

1. Check `/health/live`.
2. Check `/health/ready`.
3. Check `/health/deep`.
4. Confirm database and Redis state.
5. Check queue worker logs.
6. Check recent M-Pesa callback logs.
7. Check recent deploy and migration history.
8. Switch to documented degraded mode if writes are unsafe.
