# DHA SHR & Clinical Exchange Implementation Report

Date: 2026-07-14

## Completed Local Implementation

### Durable SHR publication lifecycle

- `ShrPublisher` now registers the previously missing `DHA:PUBLISH_SHR_BUNDLE` queue handler.
- A publication call resolves the immutable snapshot, creates a durable `ShrPublicationAttempt`, queues only its attempt ID, records the queue request ID, and moves the parent publication to `QUEUED`.
- The worker is intentionally fail-closed until DHA supplies the SHR transport profile. It records a `ShrPublicationError`, transitions the attempt/publication to `DEAD_LETTER`, writes an integration audit event, and raises a non-retryable queue error. This prevents a false claim of clinical delivery.
- Raw FHIR bundle payloads are no longer copied into queue JSON.

### Persistence and recovery hardening

- Replaced unmanaged `new PrismaClient()` instances in `ShrService`, `ShrBundleRepository`, and `DeadLetterRecoveryService` with the application-owned `PrismaService`.
- Dead-letter replay now creates a new durable publication attempt through `ShrPublisher`, preserving the immutable snapshot.
- The existing SHR retry coordinator remains present but is not used for transport retries while the DHA transport contract is unavailable; its status-only retry state cannot honestly promise delivery without a DHA endpoint/profile.

### Clinical exchange fail-closed behavior

- `ShrTimelineService` no longer follows commented-out assembly/validation/storage/publish calls or permits an empty bundle to proceed. It records the publication intent and fails the publication when the DHA clinical exchange/profile contract is unavailable.
- The previously speculative SHR webhook payload parser and bearer-secret validation were removed. The callback endpoint returns `503` until DHA issues a callback signature and acknowledgement schema.

## Affected Modules

- `backend/src/shr/shr-publisher.service.ts`
- `backend/src/shr/engine/shr-timeline.service.ts`
- `backend/src/shr/shr-webhook.controller.ts`
- `backend/src/shr/shr.service.ts`
- `backend/src/shr/repository/shr-bundle.repository.ts`
- `backend/src/shr/workers/dead-letter.service.ts`
- `backend/src/integration/integration.constants.ts`

## DHA-Issued Dependencies Still Required

1. SHR target endpoint(s), authentication/mTLS profile, request headers, FHIR profile/version, and synchronous/asynchronous acknowledgement semantics.
2. Callback URL registration, signature algorithm/key distribution, replay rules, and callback payload schema.
3. A DHA UAT tenant, certificates, test patients, consent policy, and reconciliation expectations.
4. A version-pinned clinical resource profile that identifies which local FHIR builders/resources are allowed for each SHR publication policy.

## Verification

`git diff --check` passed. Build, lint, tests, migration validation, and UAT could not be run because the local dependency installation is incomplete (missing TypeScript library files and Nest/Jest executables).
