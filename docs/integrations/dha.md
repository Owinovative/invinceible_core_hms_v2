# DHA HIE Integration

> **Production status:** not certified. `mock` is suitable for local workflow
> development. `sandbox` exposes only routes backed by an identified DHA UAT
> contract. Unverified legacy FHIR submissions fail closed. Production mode is
> blocked unless formal certification evidence is configured.

Connects the HMS to the Digital Health Agency's interoperability platform
using FHIR R4 payloads. Implemented in `backend/src/integration/dha/`.

## Supported operations

| Operation | Style | FHIR resource | Trigger |
| --- | --- | --- | --- |
| Patient verification | synchronous | – | `POST /integrations/dha/patients/verify` |
| Practitioner verification | synchronous | – | `POST /integrations/dha/practitioners/verify` |
| Facility verification | synchronous | – | `POST /integrations/dha/facilities/verify` |
| Eligibility check | synchronous | DHA query | `POST /integrations/dha/eligibility` |
| Consent handling | synchronous | `Consent` | `POST /integrations/dha/consent` |
| Encounter submission | queued | `Bundle` (Patient, Organization, Practitioner, Encounter) | `POST /integrations/dha/encounters/consultation/:id` |
| Referral | queued | `ServiceRequest` | `POST /integrations/dha/referrals` |
| Health-record exchange | adapter method | `Bundle` (document) | `DhaClientPort.exchangeHealthRecord` |
| SHA claim submission | queued | FHIR message `Bundle` (Organization, Coverage, Patient, Practitioner, Claim) | automatic when a SHA claim first moves to `SUBMITTED` |
| Claim status callback | DHA webhook | Basic-auth JSON callback | `POST /integrations/dha/callbacks/claim-status` |
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
and calls `DhaService.onShaClaimSubmitted(claimId)`. A FHIR message bundle is
queued only after strict checks for verified registry IDs, ICD-11 coding,
Coverage, intervention codes, service periods, reference integrity and exact
totals. Local claim handling never fails because of DHA availability issues;
failures are visible in the transaction trail.

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
- **`DhaHttpClient`** (`sandbox`/certified production) — AfyaLink
  `GET /v1/hie-auth` Basic authentication with a consumer key, Bearer API
  calls, nested `message` response handling, registry searches, eligibility,
  claim dispatch and claim-status polling. Visits, biometric authorization,
  referrals and general SHR publication remain fail-closed until exact endpoint
  contracts and UAT scenarios are supplied.

## Certification boundary

Configuration cannot establish compliance. Before enabling production, obtain
the current DHA OpenAPI artifacts, complete PHC/SHIF/ECCIF UAT scenarios,
record the certification reference, complete the DPIA and operational security
evidence, and receive production credentials. See
[`dha-production-readiness.md`](./dha-production-readiness.md).
