# DHA Core Claim Workflow Completion Report

Date: 2026-07-14

## Completed

The core DHA claim workflow now persists and drives the following transitions through one aggregate and one durable outbound queue:

`DRAFT -> AUTHORIZE -> VISIT -> INTERVENTION -> DIAGNOSIS -> BILLABLE_ITEM -> PREVIEW -> SUBMIT -> DISCHARGE/CLOSE`.

- Workflow creation stores facility, patient, service type, intervention plan, and an ordered initial step: `backend/src/integration/dha/dha-claim-workflow.service.ts`.
- Each workflow action has a fixed DHA operation, prerequisite guard, persisted idempotency key, durable step, DHA transaction, and outbound queue record.
- Authorization/visit tokens returned by DHA are retained on the workflow. Downstream actions inject the workflow token only at transport time; bearer-equivalent tokens are removed from persisted queue JSON.
- The worker resolves the workflow token first, falls back to a valid local consent only when necessary, updates transaction/step/workflow state, persists DHA references, and writes integration audit events: `backend/src/integration/dha/dha.service.ts`.
- Repeated client commands with the same workflow idempotency key return the existing transaction instead of creating a duplicate DHA operation.
- Retryable worker errors keep the step queued and retain its error. Permanent failures mark the step and aggregate `FAILED`.
- `POST /integrations/dha/claim-workflows/:id/recover` resumes queued/failed persisted transactions through the normal durable queue and writes a recovery audit event. It never rebuilds a DHA request from mutable UI state.
- Controller routes remain permission-gated under `billing.write`: `backend/src/integration/dha/dha-claim-workflow.controller.ts`.

## Files Modified

- `backend/src/integration/dha/dha-claim-workflow.service.ts`
- `backend/src/integration/dha/dha.service.ts`
- `backend/src/integration/dha/dha-claim-workflow.controller.ts`

## Architectural Decisions

- The existing `DhaClaimWorkflow`, `DhaClaimWorkflowStep`, `DhaTransaction`, and `IntegrationOutboundRequest` remain the sole workflow, transaction, and retry sources of truth.
- Recovery acts on the original persisted transaction, preserving the original command, identity, and workflow linkage.
- Token material remains outside queue payload JSON. Workflow token lookup is intentionally inside the worker immediately before DHA transport.
- Attachments remain a separate encrypted/scanned queue path and are not duplicated by claim commands.

## External DHA Dependencies

- DHA UAT tenant, issued credentials/certificates, facility registration, and an accepted test consent/visit are required to execute and reconcile this workflow against DHA.
- DHA’s final response-envelope/profile version is required to confirm every returned identifier name and response status mapping.
- DHA mTLS, callback signing, and reconciliation contract details remain external certification dependencies.

## Verification

`git diff --check` passed. Build, lint, unit, integration, workflow, and UAT suites could not be run because the repository’s dependency installation remains incomplete: TypeScript standard library files and local Nest/Jest executables are absent after `npm ci --ignore-scripts` timed out.
