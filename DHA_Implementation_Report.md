# DHA HIE Implementation Report

Date: 2026-07-13

## Result

The repository is **not DHA-certification ready**. The changes in this working
tree correct the contract-backed core defects that can be implemented from the
published DHA HIE documentation without inventing missing workflows. The full
eClaims/preauthorization implementation, referral/SHR transport contract, and
formal DHA certification remain blocked by missing local data models and
DHA-provisioned integration material.

## Implemented

| Area | Change | Evidence |
| --- | --- | --- |
| Tenant authentication | Replaced the assumed Basic-auth `/oauth2/token` request with DHA's `POST /tenants/token` form containing `client_id` and `client_secret`; missing access tokens now fail closed. | `backend/src/integration/dha/adapters/dha-http.client.ts` |
| Registry lookups | Replaced placeholder verify routes with `GET /patients`, `GET /professionals`, and `GET /facilities/search`, using documented query names. | `backend/src/integration/dha/adapters/dha-http.client.ts` |
| Eligibility | Replaced FHIR `CoverageEligibilityRequest` transport with documented `GET /patients/eligibility`; transaction records retain the actual query. | `backend/src/integration/dha/dha.service.ts` |
| Facility context | Replaced unrecognised custom headers with documented `X-Facility-Id` and `X-Facility-Id-Type: fr-code`. | `backend/src/integration/dha/adapters/dha-http.client.ts` |
| Consent and OTP | Replaced assumed consent routes with `/patients/contacts`, `/claims/otp`, `/claims/authorize`, and `/claims/otp/discharge`; corrected local success-status handling and OTP authorization fields. | `backend/src/consent/consent.service.ts`, `backend/src/integration/dha/dha.types.ts` |
| Terminology | Replaced `/concepts` and unsupported discovery routes with `/clinical/concepts` and `/clinical/concepts/mappings`; terminology now uses the DHA base API path. | `backend/src/terminology/adapters/terminology-http.client.ts`, `backend/src/integration/integration-config.service.ts` |
| Callback hardening | Claim and SHR callbacks now fail closed without `DHA_WEBHOOK_SECRET`, compare credentials in constant time, validate essential payload data, and SHR uses injected Prisma rather than a new client. | `backend/src/integration/dha/dha.controller.ts`, `backend/src/shr/shr-webhook.controller.ts` |
| Runtime configuration | Sandbox/production DHA requires HTTPS base URL, client credentials, facility code and callback secret. The example no longer advertises an enabled production integration with empty credentials. | `backend/src/config/env.validation.ts`, `backend/.env.example` |
| eClaims command workflow | Added a queue-backed, DTO-validated DHA eClaims command contract for visit creation, interventions, diagnoses, billable lines, preview, submit, close/discharge, intervention lifecycle actions, line resubmission and biometric authorization rejection. Each command uses the documented endpoint and required fields, carries the facility context, is idempotently queued, and is recorded in the existing DHA transaction and audit trail. Legacy FHIR Claim transactions now fail closed rather than being sent to an undocumented endpoint. | `backend/src/integration/dha/eclaims-contract.ts`, `backend/src/integration/dha/dha.service.ts`, `backend/src/integration/dha/dha.controller.ts` |
| Regression tests | Updated the primary adapter and eligibility unit expectations to the new documented route/form contract. | `backend/src/integration/dha/adapters/dha-http.client.spec.ts`, `backend/src/integration/dha/dha.service.spec.ts` |

## Intentionally Not Implemented

| Requirement | Reason |
| --- | --- |
| Full virtual-claim workflow | The documented JSON command transport is implemented for the core visit, intervention, diagnosis, line, preview, submit, discharge/close and lifecycle actions. The existing `ShaClaim` automation still only holds a local summary and does not persist DHA consent tokens, intervention/line identifiers, visit GUIDs, attachments, preauth data or workflow transitions, so it cannot yet autonomously construct the required command sequence. Sending its generic FHIR Bundle remains rejected as noncompliant. |
| Preauth, emergency/EMT, prescriptions and dispensing | No matching local domain models/controllers/UI workflows exist for the mandatory DHA request fields or multipart attachments. Implementing them as loose JSON pass-through endpoints would bypass the application's DTO, queue and workflow architecture. |
| Referral and SHR DHA transport | The compiled DHA documentation does not expose an official referral or SHR publish endpoint/profile/callback signature. The existing FHIR REST assumptions cannot be treated as a DHA contract. |
| mTLS / signed DHA callback verification | DHA must provision the certificate, trust chain and exact signature/JWT rules. A local shared-secret guard is a defence-in-depth interim control, not certification evidence. |
| DHA certification | Requires DHA UAT tenant/facility onboarding, test data, approved certificates, formal UAT execution and DHA acceptance. None is available in the repository. |

## Verification

- Static route verification confirmed the primary adapter contains `/tenants/token`, `/patients`, `/professionals`, `/facilities/search`, `/patients/eligibility`, `/claims/otp`, `/claims/authorize`, `/claims/otp/discharge`, `/clinical/concepts`, and `/clinical/concepts/mappings`.
- `npm run build` could not start because the supplied source archive did not contain backend dependencies (`nest` was unavailable).
- `npm ci --ignore-scripts` was attempted but did not complete within the execution limit, so build, lint and tests remain **not run**.

## Certification Assessment

Readiness is improved from the earlier contract-placeholder state, but remains **not ready for DHA certification**. Do not enable DHA sandbox or production traffic until the blocked DHA contracts, data models, UAT credentials and certification evidence are complete.
