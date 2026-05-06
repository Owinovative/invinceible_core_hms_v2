# Operations Dashboard

Platform operations should show system health and operational risk without exposing secrets.

## Metrics

- backend health
- database health
- Redis health
- queue health
- failed jobs
- M-Pesa failures
- slow endpoints
- error rates
- failed login attempts
- backup status
- SMS/notification failures

## Alert channels

- hosting alerts
- database provider alerts
- email
- WhatsApp or Telegram
- Slack or Teams

Never place secrets in dashboard cards, logs, notifications, or downloadable reports.
