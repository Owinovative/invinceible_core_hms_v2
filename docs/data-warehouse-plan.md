# Data Warehouse Plan

The main MySQL database remains the operational source of truth. A future warehouse should receive copied events and summary data for analytics.

## Current foundation

`DataOutboxEvent` stores future analytics events with:

- event type
- entity type
- entity ID
- facility ID
- branch ID
- JSON payload
- status
- timestamps

Outbox writes are disabled unless `DATA_WAREHOUSE_ENABLED=true`.

## Future plan

- Background worker reads pending outbox events.
- Worker writes to warehouse tables or external analytics storage.
- Reports query the warehouse or read replica, not the main operational DB.
- Failed outbox events remain retryable.
