# Rust Worker Plan

This folder documents the future Rust worker boundary for heavy HMS work.

The current production backend remains NestJS. Rust should be introduced as a separate worker service when the deployment stack is ready.

Worker responsibilities:

- heavy report generation
- SHA claim batch summaries
- large CSV imports
- stock reconciliation
- audit analysis
- duplicate patient matching
- export preparation

Integration model:

1. NestJS writes a durable queue job.
2. The Rust worker consumes the job.
3. Results are stored in the database or object storage.
4. NestJS exposes the result through existing authenticated APIs.

Production requirements before enabling:

- CI builds Rust artifacts.
- Railway or worker host has Rust installed.
- Job payloads are versioned.
- Failed jobs are retryable and observable.
- No patient clinical data is logged by the worker.
