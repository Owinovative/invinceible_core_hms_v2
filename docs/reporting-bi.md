# Reporting And BI

Reports must not overload the operational database. Large exports should be queued, scoped, cached, and paginated.

## Reports

- daily revenue
- cashier close
- M-Pesa reconciliation
- unpaid invoices
- doctor workload
- lab turnaround time
- pharmacy stock
- low stock and expiry
- patient visits
- facility performance
- branch performance
- SHA claims
- audit activity
- admission and discharge summary
- department performance

## Rules

- Always apply facility and branch scope.
- Use aggregates instead of loading full records.
- Cache dashboard summaries with short TTL.
- Queue large exports.
- Audit every export.
