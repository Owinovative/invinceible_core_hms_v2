# Invinceible Core HMS Reports Engine

This is an optional Rust foundation for future high-volume HMS workloads.

It is not on the production request path today. The NestJS backend can build and deploy without Rust installed.

Planned use cases:

- fast billing summaries
- SHA claim rollups
- stock reconciliation
- audit log analysis
- duplicate patient scoring
- large CSV parsing
- export preparation

Current contents:

- `summarize_money_lines` for safe gross/cost/profit calculation
- `duplicate_patient_score` as a small deterministic scoring primitive
- unit tests proving the library can be compiled independently

Run locally:

```bash
cargo test
```

Future integration should happen through a worker boundary, not direct request-path calls, unless the deployment pipeline is updated to install Rust reliably.
