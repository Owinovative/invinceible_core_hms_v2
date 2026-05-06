# Communication Notifications

SMS, WhatsApp, and email communication must be queued and provider-driven. No request path should wait for a telecom provider.

## Feature flags

- `SMS_ENABLED=false`
- `WHATSAPP_ENABLED=false`

## Foundation

`CommunicationService.queueMessage()` validates the channel, recipient, and template key, then queues a `NOTIFICATION_DELIVERY` job with an idempotency key.

## Message types

- appointment reminders
- payment receipt notification
- lab result ready notification
- follow-up reminders
- pharmacy pickup alerts
- admission updates
- discharge follow-up
- payment pending reminders

Do not include sensitive lab or clinical details in SMS/WhatsApp by default.
