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
| OTP/biometric consent | synchronous | DHA eClaims JSON | `/consent/*` clinical endpoints |
| Current eClaims lifecycle | synchronous, audited | DHA eClaims JSON | `POST /integrations/dha/operations/:operation` |
| SHR publication | durable queue | FHIR R4 transaction `Bundle` | clinical event timeline |
| Claim status callback | DHA webhook | Basic-auth JSON callback | `POST /integrations/dha/callbacks/claim-status` |

Every synchronous operation writes a `dha_transactions` row with redacted
request/response evidence, the DHA-side reference, correlation id, and API
version. OTPs, biometric GUIDs and consent tokens are excluded. SHR uses its
own immutable snapshot/attempt/acknowledgement records and the durable
integration queue.

Synchronous operations call the adapter inline and record
`COMPLETED`/`FAILED`. Queued operations ride the durable retry queue: DHA
downtime leaves them `QUEUED` with automatic backoff retries, and DHA
rejections mark them `FAILED` without retry (dead-lettered for review).

## eClaims security boundary

The operation endpoint accepts a local `patientId` and optional
`consentAuthorizationId`; it does not accept browser-supplied consent tokens.
The service verifies facility ownership, loads an active authorization and
decrypts its token only for the outbound request. Routes are selected from a
closed allowlist. The retired `/v1/shr-med/*` claim endpoints are disabled.

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
- **`DhaHttpClient`** (`sandbox`/certified production) — OAuth token exchange
  at `/api/v1/tenants/token`, Bearer API calls, registry and eligibility
  lookup, OTP/biometric visits, preauthorization, claims, emergency workflows,
  and `/clinical/fhir/bundle` SHR publication. Undocumented legacy methods
  fail closed.

## Certification boundary

Configuration cannot establish compliance. Before enabling production, obtain
the current DHA OpenAPI artifacts, complete PHC/SHIF/ECCIF UAT scenarios,
record the certification reference, complete the DPIA and operational security
evidence, and receive production credentials. See
[`dha-production-readiness.md`](./dha-production-readiness.md).
