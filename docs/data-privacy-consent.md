# Data Privacy And Consent

The system must expose the minimum data needed for a user’s role and facility scope.

## Rules

- Patient data must not cross facility boundaries.
- Patient portal users only see their linked patient record.
- Password hashes are never returned.
- M-Pesa credential fields are write-only where possible.
- Exports are guarded and audited.
- Staff-only clinical notes must not be exposed to patients.
- Logs must avoid clinical details unless required for safe audit.

## Consent foundation

Before patient-facing or communication features go live, record:

- patient portal consent
- SMS consent
- WhatsApp consent
- email consent
- data access acknowledgement

Production JWT and database secrets must be strong, environment-only, and rotated if exposed during development.
