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
| Encrypted attachment staging | Completed foundation | Multipart intake validates size/MIME, AES-256-GCM encrypts file bytes, stores a SHA-256 digest, and leaves each attachment in `PENDING` scan state. Raw file bytes are not placed in queue JSON. |

## Still Blocking Critical Certification

| Blocker | Why it remains blocked |
| --- | --- |
| Attachment malware scan and DHA upload execution | No approved scanner integration or DHA attachment/profile-specific workflow has been supplied. Staged files intentionally cannot progress while scan status is `PENDING`; no upload worker is enabled. |
| Full multipart DHA workflows | Preauth creation, EMT, claim attachment, upload, and OTP-whitelist payloads need a scanned attachment reference and DHA-approved multipart profile mapping. The official contract is available for fields, but this repository still needs the scan provider and end-to-end UAT validation. |
| SHR publication delivery | DHA has not supplied an approved SHR endpoint, profile, authentication/callback signature contract, or UAT tenant material. The existing queue operation remains intentionally unimplemented rather than sending an assumed FHIR route. |
| Workflow UAT verification | `backend/node_modules` lacks Nest, TypeScript, and Jest, so build/lint/tests cannot run. DHA UAT credentials/test data/certificates are also absent. |

## Next Work

1. Provision and integrate an approved malware scanner, then add an attachment upload worker that reconstructs `FormData` from encrypted storage only after a clean scan.
2. Add endpoint-specific preauth, EMT, attachment, upload, and whitelist workflow aggregates and UAT schema tests.
3. Obtain DHA SHR/callback/mTLS specifications and implement the registered SHR worker against that contract.
4. Restore reproducible dependency installation and execute the full workflow, contract, security, and UAT test matrix.
