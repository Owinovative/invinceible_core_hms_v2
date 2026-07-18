# System Integration Architecture: DHA & SHA

## Architecture Overview
The Invinceible Core HMS V2 utilizes a highly resilient, offline-first integration layer to connect with the Kenyan Digital Health Agency (DHA) and Social Health Authority (SHA).

## Core Principles
1. **Asynchronous by Default:** All outbound data (claims, health records, registries) uses an enterprise-grade BullMQ-style backed database queue (`IntegrationQueueService`).
2. **FHIR R4 Compliance:** All clinical and financial data is mapped to strict FHIR R4 resources using the dedicated `FhirMapperService`.
3. **Resilience & Observability:** The system uses exponential backoff for retries and dead-letter queues (DLQs) for permanent failures. 

## Key Modules
### 1. DhaService & IntegrationQueueService
- Business logic delegates all DHA interactions to `DhaService`.
- `DhaService` routes requests to the appropriate DHA registry (Client, Facility, Practitioner) or pushes events to the `IntegrationQueueService`.
- The queue ensures zero data loss during network outages and handles token rotation safely via the `IntegrationHttpClient`.

### 2. SyncJobsModule
A background scheduled process (using NestJS `@nestjs/schedule`) responsible for polling the DHA endpoints for asynchronous updates.
- **Claim Polling:** Regularly checks `/ClaimResponse` for claims in the `PENDING` state and updates the local invoice status to `ACCEPTED` or `REJECTED`.

### 3. Authentication Layer
- Uses `DhaAuthService` to obtain an AfyaLink JWT from the configured
  `/v1/hie-auth` endpoint using Basic credentials and a consumer key.
- Implements an in-memory Promise mutex to prevent stampeding herd issues when refreshing tokens.
- Tokens are aggressively cached and proactively refreshed 5 minutes before expiration.

## Sequence Diagram: Claim Submission
1. **Billing Module:** Emits `claim.submitted` event.
2. **DhaService:** Transforms invoice to FHIR `Claim` bundle.
3. **IntegrationQueueService:** Enqueues request to `POST /Claim`.
4. **IntegrationWorker:** Picks up job, acquires DHA token, and sends HTTP request.
5. **SyncJobsModule:** Periodically polls `/ClaimResponse/{id}`.
6. **DhaController:** Listens for active webhooks on `/api/v1/dha/callbacks/claim-status`.
