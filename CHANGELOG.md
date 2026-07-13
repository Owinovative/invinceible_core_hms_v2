# Changelog

## [v0.3.0] - 2026-07-12
### Added
- **Phase 3: Shared Health Record (SHR) Publisher**
  - Implemented event-driven `ShrTimelineService` and strict `ShrStateMachine`.
  - Added robust modular `FhirBuilder` architecture with dependency enforcement mapping HMS records to FHIR R4 standard.
  - Implemented `ShrBundleAssembler` mapping `Patient`, `Encounter`, `Condition`, `Observation`, `Procedure`, `MedicationRequest`, `DiagnosticReport`, and `Provenance` resources.
  - Introduced immutable `ShrBundleSnapshot` versioning and hashing (`BundleVersionManager`).
  - Added strict `FhirProfileRegistry` enforcing Kenya DHA specific extensions and constraints.
  - Added `DhaComplianceEngine` to enforce Terminology validity and Consent requirements before publication.
  - Added robust retry coordination and `DeadLetterRecoveryService` connected to `IntegrationQueueService`.
  - Added SHR Administrative Dashboard (Frontend Command Center) with dry-run simulation and bundle inspection capabilities.

## [v0.2.0] - 2026-07-11
### Added
- **Phase 2: Terminology Gateway**
  - Integrated full clinical terminology standardization across the HMS.
  - Replaced legacy free-text diagnoses with standardized `TerminologyConcept` entities.
  - Added caching layers and strict validation for LOINC, ICD-11, and SNOMED codes.
  - Implemented `TerminologySyncWorker` ensuring continuous alignment with the master DHA Terminology service.

## [v0.1.0] - 2026-07-10
### Added
- **Phase 1: Foundation & Registries**
  - Established base integrations for Facility Registry and Provider Registry.
  - Implemented `ClientRegistryService` for cross-facility Patient resolution.
  - Implemented robust `ConsentService` to track and enforce patient privacy directives.
  - Standardized OAuth2 client credential flows for DHA API access.

## Unreleased

- Prepared Version 2 release cleanup with a fixed professional light-theme HMS interface.
- Removed unused dark mode/theme switching code to simplify and stabilize the UI.
- Added Version 2 release notes and release-readiness checklist.
- Added database storage-efficiency tooling, compact audit/callback payload handling, PDF image size caps, and safe dry-run cleanup guidance for Version 2.

## 2.0.0 - Release Candidate

- Added Render production deployment support for backend and frontend services.
- Added Render PostgreSQL migration preparation while preserving the MySQL rollback path.
- Improved official printout/PDF foundations for invoices, receipts, medical reports, and SHA workflows.
- Improved consultation, prescription, pharmacy, stock, billing, and revenue workflows.
- Expanded platform administration for facilities, branches, users, roles, settings, and audit visibility.
- Strengthened M-Pesa/facility payment configuration, callback safety, and reconciliation foundations.
- Hardened authentication, password policy, session handling, rate limits, audit redaction, and production secret checks.
- Improved logging, observability, health checks, pagination, scoped search, and cache/queue configuration.
- Removed unused dark mode/theme switching code to simplify and stabilize the UI.
- Documented known production limitations, Render environment requirements, PostgreSQL migration safety, and release validation steps.

Known limitations:

- MySQL to Render PostgreSQL production cutover still requires a rehearsed data import, validation, and rollback window.
- Existing backend Jest specs still need test-module provider cleanup before the full suite can pass reliably.
- Optional AI, SMS, WhatsApp, data warehouse, and patient portal features remain controlled by feature flags.

## Earlier hardening work

- Added benchmark gap analysis against five public HMS/HMIS repositories.
- Hardened authentication with stronger password policy, progressive failed-login delay, production JWT secret checks, and step-up token foundation.
- Prevented password hashes from being returned by user management APIs.
- Scoped facility-admin user management to the actor facility and blocked facility admins from creating or managing platform users.
- Added explicit billing, invoice, payment, and report permissions.
- Strengthened M-Pesa manual confirmation/failure scoping and duplicate receipt handling.
- Capped legacy large patient and invoice list responses and added frontend debounced patient search.
- Expanded security redaction in audit logging.
- Added repository security, contribution, support, roadmap, CI, and issue/PR templates.
