# DHA/SHA Frontend Workflows Implementation Report

Date: 2026-07-14

## Completed Frontend Workflows

### Dedicated DHA workflow workspace

Route: `/dha-workflows`  
File: `frontend/app/(dashboard)/dha-workflows/page.tsx`

- Creates durable DHA workflows with local patient ID, service type, and intervention codes.
- Queues every implemented backend core action: authorization, visit, intervention, diagnosis, billable item, preview, submit, discharge, close, and emergency.
- Queues all implemented DHA multipart actions: preauthorization, EMT, and OTP whitelist.
- Supports encrypted attachment intake through the backend multipart endpoint, with document/intervention metadata and clear scan-queue feedback.
- Exposes workflow recovery for recoverable queued/failed actions.
- Provides loading, disabled, success, error, idempotency, and local activity states in a responsive single-column/mobile and two-panel/desktop layout.

### API and upload integration

File: `frontend/services/dha-workflow-service.ts`

- Adds typed frontend calls for workflow creation, action submission, recovery, and attachment upload.
- Maps the workflow action routes explicitly; it does not expose a generic endpoint selector.

File: `frontend/lib/api.ts`

- Corrects multipart behavior: `apiFetch` now omits JSON `Content-Type` for `FormData`, allowing the browser to supply the correct boundary for DHA attachment uploads.

## Route Summary

| Route | User journey |
| --- | --- |
| `/sha-claims` | Existing SHA billing claim, eligibility, and reconciliation surface. |
| `/integration` | Existing DHA queue/integration health surface. |
| `/dha-workflows` | New durable DHA claim/multipart workflow orchestration surface. |

## Remaining Backend Dependencies

1. The workflow controller has no `GET /integrations/dha/claim-workflows/:id` or list endpoint. The workspace therefore displays the locally returned workflow and queued actions, but cannot refresh durable step/attachment/scan/reconciliation state after a browser reload.
2. There is no backend workflow status stream/polling contract, queue-item-to-workflow query, or DHA acknowledgement/reconciliation endpoint for this UI to consume.
3. The current backend permission model enforces `billing.write`; the frontend relies on that authoritative server-side guard. A client-readable permission claim/API would allow proactive button hiding but must not replace backend authorization.
4. DHA UAT credentials, certificates, and accepted test data are required for an actual end-to-end workflow run.

## Screenshots

No screenshot was produced: the local frontend build/runtime could not be started because dependencies are incomplete. The route is structured as a responsive operational workspace rather than a marketing page.

## Verification

`git diff --check` passed. Frontend lint/build could not run because the local dependency installation is incomplete.
