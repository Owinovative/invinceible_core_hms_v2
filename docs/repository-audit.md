# Repository Audit

This audit was prepared for the `super/hms-speed-security-prescription-ui-pdf-upgrade` branch. It focuses on production risk, workflow completeness, repo presentation, and benchmark gaps.

## Current Strengths

- NestJS backend with Prisma models for patients, triage, consultations, prescriptions, pharmacy stock, billing, payments, M-Pesa, SHA, IPD, reports, audit logs, users, facilities, and branches.
- Next.js frontend with dashboard, platform administration, patient portal foundations, public pages, and clinical/billing/pharmacy workflows.
- Existing resilience foundation: request IDs, safe error handling, health endpoints, Redis/in-memory cache fallback, rate limiting, and queue scaffolding.
- Facility and branch scoping helpers are present and used in several high-risk services.
- M-Pesa/Daraja has facility-level settings, prompt locks, callback handling, and reconciliation foundations.
- Repo already includes README, license, security, support, roadmap, changelog, CI, and operational docs.

## Highest Risk Areas

- Clinical workflows must keep moving from notes-only records into structured data. Prescriptions were the most urgent example and are now upgraded to structured drug items.
- Large lists must continue moving toward paginated/search endpoints. Branch medicine search now uses a scoped debounced search path instead of forcing the doctor page to rely on huge local filtering.
- Report/PDF generation must stay server-side for official documents. Consultation medical reports now have a real PDF endpoint instead of relying only on browser print behavior.
- Any payment, stock, and prescription mutations must remain transactional and audited.
- Cross-facility and cross-branch leakage must keep being tested as modules grow.

## Missing Or Weak Areas

- More endpoint-level tests are needed for branch isolation, structured prescribing, partial dispensing, and PDF export authorization.
- Some legacy frontend pages still use large cards/tables and should be moved into shared `DataTable`, `PageHeader`, and `PrintToolbar` components.
- Some reports still need queued PDF/CSV exports for very large datasets.
- Radiology/imaging and advanced clinical safety engines remain foundations rather than complete modules.
- HL7/FHIR interoperability is documented as future architecture, not yet implemented.

## Work Completed In This Branch

- Prescription items now support route, medicine name snapshot, stock status at prescribing time, and accepted alternative tracking.
- Doctors can continue prescribing an out-of-stock medicine only after explicit confirmation, or choose a suggested in-stock alternative.
- Pharmacy receives structured prescription items and can dispense partial quantities without forcing all items to be dispensed at once.
- Pharmacy dispensing continues to deduct stock in a backend transaction and avoids negative stock.
- Consultation medical reports now download as real server-generated PDFs.
- Frontend prescription/pharmacy services were corrected to use real backend routes and structured payloads.
- Platform/repo documentation was extended for benchmark, prescription/pharmacy, PDF/report, and audit clarity.

## Recommended Next Roadmap

1. Add automated tests for prescription item creation, stock snapshots, accepted alternatives, and partial dispense transactions.
2. Move remaining large frontend lists to paginated API-backed data tables.
3. Queue large report and bulk PDF generation.
4. Expand clinical safety: allergies, drug interactions, duplicate prescription alerts, pregnancy/age warnings, and override audit.
5. Add radiology/imaging order workflow and document storage policies.
6. Add interoperability layer for HL7/FHIR only after core workflow stability is verified.
