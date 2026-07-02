# DHA Integration

Connects the HMS to the Digital Health Agency's interoperability platform
using FHIR R4 payloads. Implemented in `backend/src/integration/dha/`.

## Supported operations

| Operation | Style | FHIR resource | Trigger |
| --- | --- | --- | --- |
| Patient verification | synchronous | – | `POST /integrations/dha/patients/verify` |
| Practitioner verification | synchronous | – | `POST /integrations/dha/practitioners/verify` |
| Facility verification | synchronous | – | `POST /integrations/dha/facilities/verify` |
| Eligibility check | synchronous | `CoverageEligibilityRequest` | `POST /integrations/dha/eligibility` |
| Consent handling | synchronous | `Consent` | `POST /integrations/dha/consent` |
| Encounter submission | queued | `Bundle` (Patient, Organization, Practitioner, Encounter) | `POST /integrations/dha/encounters/consultation/:id` |
| Referral | queued | `ServiceRequest` | `POST /integrations/dha/referrals` |
| Health-record exchange | adapter method | `Bundle` (document) | `DhaClientPort.exchangeHealthRecord` |
| SHA claim submission | queued | `Bundle` (Patient, Organization, Claim) | automatic when a SHA claim first moves to `SUBMITTED` |
| Audit events | adapter method | `AuditEvent` | `DhaClientPort.submitAuditEvent` |

Every operation writes a `dha_transactions` row with the FHIR request,
the DHA response, the DHA-side reference, correlation id, and API version —
a complete interoperability audit trail.

Synchronous operations call the adapter inline and record
`COMPLETED`/`FAILED`. Queued operations ride the durable retry queue: DHA
downtime leaves them `QUEUED` with automatic backoff retries, and DHA
rejections mark them `FAILED` without retry (dead-lettered for review).

## SHA claims flow

`ShaClaimsService.update()` detects the first transition to `SUBMITTED`
and calls `DhaService.onShaClaimSubmitted(claimId)`. A FHIR transaction
bundle (Patient + Organization + Claim with ICD-10 diagnosis coding) is
queued for the DHA/SHA platform. Local claim handling never fails because
of DHA issues; failures are visible in the transaction trail.

## FHIR mapping

`FhirMapperService` (pure, fully unit-tested) maps HMS entities to
minimal FHIR R4 resources:

- `Patient` → identifiers (HMS patient number, optional national id),
  name, telecom, gender, birth date
- `Facility` → `Organization` with KMHFL-style identifier and address
- `Staff` → `Practitioner` with board registration number and cadre
- `Consultation` → `Encounter` (class AMB, ICD-10 reason codes, period,
  practitioner participant, service provider)
- Referrals → `ServiceRequest` (intent `order`)
- Consent → `Consent` with permit/deny provisions
- Eligibility → `CoverageEligibilityRequest`

## Adapters and API versioning

- **`DhaMockClient`** (`DHA_MODE=mock`, default) — deterministic responses;
  identifiers containing `UNKNOWN` simulate not-found/ineligible for
  negative-path testing. This adapter stands in until production DHA
  endpoints and credentials are available and is replaced purely by
  configuration.
- **`DhaHttpClient`** (`sandbox`/`production`) — OAuth2 client-credentials
  authentication with cached, single-flight token refresh; a `401`
  invalidates the token and retries once. Endpoints are versioned
  (`/api/{DHA_API_VERSION}/...`) and exchange `application/fhir+json`, with
  `X-API-Version` and `X-Facility-Code` headers on every call.

## Assumptions (pending official API documentation)

- Endpoint paths follow FHIR REST conventions
  (`/api/v1/Encounter`, `/api/v1/Claim`, `/api/v1/patients/verify`, …).
  When the official DHA specification is published, only `DhaHttpClient`
  changes — the `DhaClientPort` contract and all business logic stay
  stable.
- OAuth2 client credentials is assumed as the authentication scheme.
- Identifier systems (`https://dha.go.ke/identifier/...`) are placeholders
  until DHA publishes canonical URIs.
