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

### 2. Current eClaims contract
Visits, preauthorization, claim lines, diagnoses, preview, submission,
discharge and emergency workflows use a closed operation allowlist. Retired or
undocumented routes are rejected before any network request is made.

### 3. Authentication Layer
- Uses the single `DhaHttpClient` adapter to obtain a token from
  `/api/v1/tenants/token` using DHA-issued OAuth client credentials.
- Implements an in-memory Promise mutex to prevent stampeding herd issues when refreshing tokens.
- Tokens are aggressively cached and proactively refreshed 5 minutes before expiration.

## Sequence: governed DHA operation
1. An authenticated, facility-scoped user selects a local patient and active
   encrypted consent authorization.
2. `DhaService` verifies patient/facility ownership and decrypts the token only
   in memory.
3. The allowlisted operation validates required fields and sends the request
   through the OAuth adapter.
4. Redacted transaction evidence is stored; OTPs and consent tokens are never
   persisted in request/response audit payloads.
