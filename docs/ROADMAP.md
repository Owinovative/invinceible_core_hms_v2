# Roadmap

Consolidated from the root [ROADMAP.md](../ROADMAP.md) plus the
reverse-engineering findings in this documentation set.

## Near term

- Enforce **step-up verification** in production once prompt UX ships.
- Granular invoice permissions (create / line edit / line remove /
  discount approve).
- Move remaining large PDFs & reports fully to background jobs.
- Expand tests: auth flows, branch scoping, payments & M-PESA callbacks,
  stock transactions ([TESTING.md](TESTING.md) priorities).
- Virtualized tables for the largest lists.
- **Documentation debt**: replace placeholder module specs; repo-wide
  lint/format sweep; screenshot pass for [UI_UX_GUIDE.md](UI_UX_GUIDE.md).

## Government & interoperability

- KRA eTIMS: sandbox → production device onboarding; item-catalog sync;
  automatic credit notes on post-fiscalization item removal; patient KRA
  PIN capture; QR/CU on printed receipts.
- DHA/SHA: swap mock adapter for official endpoints when published
  (isolated to `DhaHttpClient`); practitioner registry sync; e-claim
  status polling.
- HL7/FHIR gateway; external laboratory integration.

## Clinical depth

- Radiology order/result workflow (beyond operational-module records).
- Allergy & drug-interaction engine; richer terminology search.
- Lab normal ranges, critical-result escalation.
- IPD ward rounds and nursing chart improvements.

## Platform & architecture

- **Decimal money migration** (Float → Decimal).
- Billing service decomposition (invoices / payments / tariffs).
- Object storage for signatures, logos, photos.
- SMS/WhatsApp and email provider adapters (`communication` module).
- Docker images + IaC for self-hosted deployments.
- Data warehouse + read replicas (`DATA_WAREHOUSE_ENABLED` feed).
- Rust reports engine graduation for high-volume rollups.

## Operations

- Production dashboards (queues, Redis, DB, failed jobs, security
  events, M-PESA failures) and automated backup verification.
- Load-test milestones at 1k / 5k / 10k / 30k concurrent users.
