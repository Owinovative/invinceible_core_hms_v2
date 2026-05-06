# Clinical Workflow

Target flow:

registration -> triage -> doctor queue -> consultation -> lab request -> lab result -> prescription -> pharmacy dispensing -> billing -> payment -> receipt -> admission/discharge/follow-up

## Current strengthening

- Queue sorting now prioritizes critical and urgent triage values before routine cases.
- Prescription dispensing already reserves item status and branch stock inside a database transaction.
- Pharmacy dispensing creates billing lines after stock movement succeeds.
- Patient duplicate checks can warn during registration without blocking emergency care.
- Patient portal foundation exposes only patient-owned data.

## Next safe upgrades

- Add consultation-linked follow-up tasks.
- Add mandatory discharge summary checks for IPD discharge.
- Add result release state before exposing lab results to patient portal.
- Add clinician override audit when clinical safety warnings are bypassed.
