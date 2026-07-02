# Changelog

Authoritative history lives in the root [CHANGELOG.md](../CHANGELOG.md);
this copy summarizes releases for the documentation set.

## Unreleased

- **DHA & KRA eTIMS integration layer** (PR #114): ports-and-adapters
  government connectivity, durable offline retry queue, fiscal documents
  with CU numbers + QR codes, FHIR R4 DHA connector, 169-test suite with
  CI coverage gates, security scanning in CI, dependency remediations
  (multer override, qs).
- **Comprehensive system documentation** (this PR): full reverse-engineered
  `/docs` set — architecture, API reference (auto-generated, 341
  endpoints), database, workflows, security, operations, UI, master
  document + PDF export.
- Version 2 release cleanup: fixed professional light theme; dark-mode
  code removed; storage-efficiency tooling; compact payload handling.

## 2.0.0 — Release Candidate

- Render production deployment (backend + frontend) with PostgreSQL
  migration path (MySQL rollback preserved).
- Official printout/PDF foundations (invoices, receipts, medical reports,
  SHA forms).
- Consultation, prescription, pharmacy, stock, billing, and revenue
  workflow improvements; OTC sales foundation.
- Platform administration: facilities, branches, users, roles, settings,
  audit visibility; facility subscriptions & compliance gates.
- M-PESA hardening: per-facility credentials, callback safety,
  reconciliation foundations.
- Security hardening: password policy, lockouts, single active session,
  rate limits, audit redaction, production secret checks.
- Observability: health checks, structured logging, pagination, scoped
  search, cache/queue configuration.

### Known limitations (2.0.0)

- MySQL → Render PostgreSQL cutover requires a rehearsed import +
  validation window.
- Legacy backend Jest specs need provider cleanup before the full suite
  passes (integration-layer suite is green and gated in CI).
- AI, SMS, WhatsApp, data warehouse, patient portal remain feature-flagged.

## Earlier

Iterative hardening of auth, billing, IPD, pharmacy, labs, reporting, and
multi-tenancy — see root changelog and git history for detail.
