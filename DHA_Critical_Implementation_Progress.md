# DHA Critical Implementation Progress

Date: 2026-07-14

## Completed In This Checkpoint

| Item | Status | Evidence |
| --- | --- | --- |
| Legacy generic eClaims HTTP entry point removed | Completed | `backend/src/integration/dha/dha.controller.ts` no longer exposes `POST /eclaims/:operation`. |
| Legacy FHIR SHA-claim submission made fail-closed | Completed | `DhaService.onShaClaimSubmitted` records `DHA_WORKFLOW_REQUIRED` instead of queuing a FHIR Claim that the worker rejects. |
| Durable claim-workflow schema | Completed | `DhaClaimWorkflow`, ordered `DhaClaimWorkflowStep`, encrypted `DhaWorkflowAttachment`, transaction workflow reference, and migration `20260714120000_add_dha_claim_workflows`. |
| Workflow-specific API surface | Completed foundation | `DhaClaimWorkflowController` exposes separate authorize, visit, intervention, diagnosis, item, preview, submit, discharge, and close commands. |
| Queue linkage and audit state | Completed foundation | Workflow actions create a durable step and DHA transaction; worker completion/failure writes step/workflow state and documented DHA identifiers. |
| Encrypted attachment staging | Completed | Multipart intake requires DHA `document_type` and `intervention_code`, requires completed visit and intervention steps, validates size/MIME, AES-256-GCM encrypts file bytes, and stores a SHA-256 digest. Raw file bytes never enter queue JSON. |
| Malware scanning | Completed locally | `DhaClaimWorkflowService` registers a durable scan worker using ClamAV `INSTREAM`; non-mock environments require `DHA_ATTACHMENT_CLAMAV_HOST`, reject infected files permanently, and retry scanner outage/indeterminate results. |
| DHA claim-attachment multipart worker | Completed locally | The upload worker reads only an attachment ID from the queue, decrypts after a `CLEAN` result, reconstructs `FormData` in memory, and calls the documented `POST /claims/attachments` form fields: `consent_token`, `document_type`, `intervention_code`, and `file_blob`. |
| Queue-safe attachment lifecycle | Completed locally | States cover scan queueing/scanning/clean/rejected/scan failure and upload queueing/uploading/uploaded. Queue idempotency keys are attachment- and phase-specific. |

## Still Blocking Critical Certification

| Blocker | Why it remains blocked |
| --- | --- |
| DHA attachment UAT verification | The local implementation uses the documented claim-attachment field names and a production ClamAV transport, but DHA UAT credentials, an issued facility, test consent token, and an accepted sample document are required to verify the actual multipart response/acknowledgement. |
| Preauthorization, EMT, and OTP-whitelist submission profiles | The source material in this repository does not provide a version-pinned authoritative request schema, callback signature, or UAT examples for their polymorphic multipart variants. Implementing guessed fields or endpoint behavior would be non-compliant; these remain explicit DHA-issued contract dependencies. |
| SHR publication delivery | DHA has not supplied an approved SHR endpoint, profile, authentication/callback signature contract, or UAT tenant material. The existing queue operation remains intentionally unimplemented rather than sending an assumed FHIR route. |
| Workflow UAT verification | `npm ci --ignore-scripts` times out in this environment after partially materializing packages. TypeScript then fails before source analysis because `node_modules/typescript/lib/lib.es2023.full.d.ts` is absent. DHA UAT credentials/test data/certificates are also absent. |

## Next Work

1. Obtain DHA-issued, version-pinned multipart schemas and UAT examples for preauthorization, EMT/emergency, attachment-upload variants, and OTP-whitelist callbacks; then add typed aggregate commands and contract tests without assumptions.
2. Obtain DHA SHR/callback/mTLS specifications and implement the registered SHR worker against that contract.
3. Restore a complete dependency installation, run Prisma generation/migration validation, and execute the build, lint, unit, integration, workflow, and contract test matrix.
4. Provision a private ClamAV service, DHA UAT tenant/facility credentials, certificates, and test consent tokens; run a controlled end-to-end attachment submission and reconciliation exercise.
