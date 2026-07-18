# DHA HIE Production Readiness

This document is the release gate for the HMS/DHA integration. It is an
engineering control, not evidence of certification.

## Current safe operating modes

| Mode | Permitted use | Network behavior |
| --- | --- | --- |
| `mock` | Local development and deterministic CI | No DHA traffic |
| `sandbox` | DHA development/UAT with issued credentials | Only implemented, contract-tested routes |
| `production` | After formal DHA certification | Boot is blocked without activation evidence |

Never use production credentials in development, CI logs, source control or
facility records. Use the deployment platform's secret manager.

## Required environment configuration for UAT

```env
DHA_ENABLED=true
DHA_MODE=sandbox
DHA_BASE_URL=https://ilm-dev.dha.go.ke/uat-middleware/api/v1
DHA_TOKEN_URL=https://issued-uat-base/v1/hie-auth
DHA_USERNAME=issued-by-dha
DHA_PASSWORD=issued-by-dha
DHA_CONSUMER_KEY=issued-by-dha
DHA_AGENT_ID=issued-by-dha
DHA_CALLBACK_USERNAME=generated-for-afyalink-callback
DHA_CALLBACK_PASSWORD=generated-high-entropy-secret
DHA_SPEC_VERSION=version-from-the-approved-contract
DHA_FACILITY_ID=FID-issued-by-the-facility-registry
DHA_FACILITY_ID_TYPE=fr-code
DATA_ENCRYPTION_KEY=base64-encoded-32-byte-key
```

Generate the encryption key outside source control:

```bash
openssl rand -base64 32
```

## Production activation gate

Production additionally requires:

```env
DHA_MODE=production
DHA_PRODUCTION_ACTIVATION_APPROVED=true
DHA_CERTIFICATION_REFERENCE=reference-issued-after-certification
```

These values prevent accidental activation; they do not replace verification
of the certification evidence.

## Engineering completion matrix

| Capability | State | Release requirement |
| --- | --- | --- |
| Token request | Implemented from supplied DHA documentation | Validate against issued UAT credentials |
| Patient registry search | Implemented | Verify response variants in UAT |
| Facility registry search | Implemented | Verify every facility registry ID in UAT |
| Health worker registry search | Implemented | Verify licence-status response variants in UAT |
| Eligibility | Implemented | Contract-test all approved identification types |
| Consent | Partial | Complete OTP, biometric, visit and discharge scenarios |
| Visits/preauthorization | Fail-closed | Implement all required PHC/SHIF/ECCIF paths |
| Claims/status | Implemented with strict FHIR validation | Complete callback, rejection, correction and payment UAT scenarios |
| Terminology | Partial | Enforce ICD-11, LOINC, ICHI and HPT at write boundaries |
| Shared Health Record | Fail-closed | Implement minimum-data-set publication contract |

## External evidence required before production

- DHA-issued development/UAT and production credentials.
- Current OpenAPI schemas and specification version.
- Facility and practitioner registry verification evidence.
- Successful PHC, SHIF and ECCIF UAT scenario results.
- DHA certification and enterprise licence references.
- ODPC registration evidence and an approved DPIA.
- Penetration-test and remediation report.
- Backup restore test, disaster-recovery exercise and recovery objectives.
- Incident/breach response procedure and escalation contacts.
- Data-retention and secure-deletion schedule.

## Deployment checks

1. Apply the matching database migration before starting the new build.
2. Confirm secrets are injected by the platform and never printed.
3. Confirm `/health/ready` succeeds and integration status is expected.
4. Run contract tests against DHA UAT test identities only.
5. Review dead letters and API audit logs without patient payload exposure.
6. Obtain a written go/no-go approval from the compliance and clinical-safety
   owners before changing `DHA_MODE`.
