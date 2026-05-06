# Patient Portal

The patient portal foundation is disabled by default using `PATIENT_PORTAL_ENABLED=false`.

## Backend routes

- `GET /patient-portal/profile`
- `GET /patient-portal/appointments`
- `GET /patient-portal/invoices`
- `GET /patient-portal/lab-results`
- `GET /patient-portal/prescriptions`

## Security model

- User role must be `PATIENT`.
- The user must be linked to a patient through `patients.portalUserId`.
- A patient can only see their own data.
- Staff-only clinical notes and audit logs are not exposed.
- M-Pesa credentials are not exposed.

## Frontend routes

- `/patient-access`
- `/patient-access/profile`
- `/patient-access/appointments`
- `/patient-access/invoices`
- `/patient-access/lab-results`
- `/patient-access/prescriptions`

The dashboard already has a staff module route at `/patient-portal`, so the patient-facing public shell uses `/patient-access` to avoid route conflicts.

Enable only after patient identity verification and consent workflows are complete.
