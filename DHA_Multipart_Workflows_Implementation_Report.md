# DHA Multipart Workflows Implementation Report

Date: 2026-07-14

## Completed Work

### Shared encrypted attachment path

- Continued use of `DhaWorkflowAttachment` as the sole durable attachment store. Files are AES-256-GCM encrypted, SHA-256 digested, scanned through ClamAV, and only decrypted inside a queue worker.
- Multipart queue payloads contain workflow/step IDs only. They never contain file bytes, decrypted content, consent tokens, or multipart form bodies.
- Multipart execution waits for every linked attachment to have `scanStatus = CLEAN`; scan outages remain retryable and infected files are permanently rejected.

### Multipart workflow actions

`DhaClaimWorkflowService` now supports three persisted action types on the existing `DhaClaimWorkflowStep` aggregate:

| Action | DHA endpoint | Validation |
| --- | --- | --- |
| `PREAUTH_SUBMIT` | `POST /preauths` | Normal, surgical, renal, oncology, optical, and imaging required fields; completed visit/intervention; consent token; supporting attachments. |
| `EMT_SUBMIT` | `POST /claims/emt` | Provider registration number, diagnoses, and interventions; optional scanned attachment set. |
| `OTP_WHITELIST_SUBMIT` | `POST /patients/otp-whitelists` | Beneficiary CR ID, reason type/text, biometric attempts, facility FR code, and supporting attachments. |

- `DhaHttpClient.submitMultipartWorkflow` reconstructs `FormData` only in memory, supplies form fields plus named binary parts, and relies on `fetch` to provide the multipart boundary.
- Existing queue retry/dead-letter behavior applies to all multipart submissions. The worker writes `COMPLETED`, `QUEUED`, or `FAILED`, captures response/error data, updates the parent workflow, and records audit events.
- Duplicate submission idempotency uses the existing durable workflow-step idempotency key. API routes do not expose generic transport endpoints.

### API endpoints

All routes are JWT- and `billing.write`-guarded and use the existing `DhaWorkflowActionDto` payload/idempotency contract:

- `POST /integrations/dha/claim-workflows/:id/preauthorizations`
- `POST /integrations/dha/claim-workflows/:id/emt`
- `POST /integrations/dha/claim-workflows/:id/otp-whitelist`

## Files Modified

- `backend/src/integration/dha/dha-claim-workflow.service.ts`
- `backend/src/integration/dha/dha-claim-workflow.controller.ts`
- `backend/src/integration/dha/dha.types.ts`
- `backend/src/integration/dha/adapters/dha-http.client.ts`
- `backend/src/integration/dha/adapters/dha-mock.client.ts`
- `backend/src/integration/integration.constants.ts`

## External DHA Blockers

1. DHA UAT credentials, facility registration, certificates/mTLS profile, and test data are required to execute the forms and verify response identifiers/statuses.
2. The compiled reference supplies multipart field names but not a version-pinned machine-readable profile for preauth/EMT/whitelist attachment metadata. The implementation uses the documented `title`, `document_type`, and `file_field_name` metadata convention; DHA UAT must confirm exact casing/additional required metadata.
3. DHA callback signature and reconciliation contracts for OTP whitelist and preauthorization review are not issued locally; no callback receiver has been invented.

## Verification

`git diff --check` passed. Build, lint, unit, integration, workflow, and contract suites could not run because the local dependency installation is incomplete: TypeScript standard library files and Nest/Jest executables are absent after `npm ci --ignore-scripts` timed out.
