# Pharmacy Stock Safety

Pharmacy stock is branch-specific. Dispensing must reduce stock safely and must not create negative stock under race conditions.

## Current controls

- Branch stock is checked before dispensing.
- During dispensing, stock is decremented with a guarded update that requires enough available quantity.
- Prescription items are reserved with `DISPENSING` status before stock movement.
- Low stock and out-of-stock notifications are generated.
- Branch prices and reorder levels are tracked separately from the master medicine catalogue.

## Required next controls

- Batch number and expiry tracking per stock lot.
- Approval workflow for stock adjustments.
- Daily stock movement reconciliation.
- Expiry warning dashboard.
- Therapeutic substitute catalogue for safer AI-assisted alternatives.
