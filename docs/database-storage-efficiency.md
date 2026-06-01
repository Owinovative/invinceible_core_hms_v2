# Database storage efficiency and retention

This guide describes the Version 2 storage-efficiency posture for Invinceible Core HMS. The goal is to keep the Render PostgreSQL database small and fast without losing hospital history, billing integrity, stock traceability, SHA/insurance records, M-Pesa evidence, or legal auditability.

## What changed in Version 2

- Audit request snapshots are compacted before storage. Nested payloads are depth-limited, arrays are capped, long strings are truncated, secrets are redacted, and phone-like values are masked.
- Audit and notification list responses now select compact actor/facility/branch relation fields instead of full related rows.
- M-Pesa callback payload storage is compacted and redacted. The payment row keeps the operational identifiers needed for reconciliation, including checkout request ID, merchant request ID, receipt number, amount, phone, status, and timestamps.
- Data warehouse outbox payloads are compacted before storage when the feature flag is enabled.
- PDF logo loading now rejects oversized data URLs or remote images. The default cap is `PDF_IMAGE_MAX_BYTES=512000`.
- Storage audit, large-field reporting, index audit, and safe cleanup scripts were added under `backend/scripts`.

## What must not be deleted automatically

Never automatically delete these production records:

- Patients, visits, consultations, prescriptions, lab requests/results, IPD admissions, ward/bed history, medical reports, and clinical notes.
- Invoices, invoice items, payments, receipts, cashier closes, SHA claims, M-Pesa payment records, and reconciliation evidence.
- Pharmacy catalog rows, branch stock, stock movements, dispensing records, returns, adjustments, and reorder history.
- Audit logs for security, billing, payments, stock, prescriptions, reports, user changes, and facility administration.

Those records are clinical, financial, legal, or operational history. Any archival process for them must be policy-approved, backed up, reversible, and validated in staging first.

## Large field policy

Large fields should be exceptional. The database should store file metadata, not raw files.

Preferred file metadata:

- storage key or URL
- MIME type
- byte size
- checksum/hash
- uploaded timestamp
- uploader reference
- document type/status

Avoid:

- base64 images in text fields
- raw PDFs in database columns
- full request or callback bodies in audit logs
- repeated generated report copies
- large JSON blobs in list endpoints

Existing large fields that need ongoing monitoring include audit before/after data, system settings, user-agent fields, facility logo URLs, lab attachment data URLs, SHA signature/stamp URLs, geolocation snapshots, and data outbox payloads.

## M-Pesa callback storage

M-Pesa payment rows should preserve reconciliation facts, not unlimited callback envelopes.

Keep:

- `checkoutRequestId`
- `merchantRequestId`
- `mpesaReceiptNumber`
- amount
- payment status/result
- paid/confirmed/requested timestamps
- phone number where business-required
- compact redacted callback/status query summary

Do not store:

- Daraja access tokens
- passkeys, consumer secrets, authorization headers, cookies, or JWTs
- full request headers
- repeated previous callback payloads nested inside newer payloads

## Audit log policy

Audit logs must remain useful and compact.

Keep:

- module/action code
- entity type and ID
- actor user/staff IDs
- facility/branch scope
- timestamp
- short description
- compact before/after diff only when useful
- IP and user-agent when available

Do not store:

- full patient records
- password hashes or reset tokens
- JWTs, cookies, authorization headers, Daraja secrets, database URLs, or API keys
- raw PDFs, base64 images, or full uploaded files
- giant request bodies

## Safe retention and cleanup

Cleanup is dry-run first and intentionally limited to non-clinical operational records.

Available commands from `backend/`:

```bash
npm run db:storage:audit
npm run db:large-fields:report
npm run db:index:audit
npm run db:cleanup:dry-run
npm run db:cleanup -- --confirm=COMPACT_SAFE_CLEANUP
```

`db:cleanup` refuses to delete anything unless `--confirm=COMPACT_SAFE_CLEANUP` is supplied. It only targets:

- expired password reset tokens
- old revoked sessions
- old resolved/read notifications
- old non-pending data outbox events
- expired IP geolocation cache rows
- old request-level user location events

It does not delete patient, clinical, stock, billing, payment, SHA, audit, lab, prescription, or medical report records.

Retention defaults:

- revoked sessions: 30 days
- resolved/read notifications: 180 days
- user location request events: 90 days
- processed outbox events: 30 days

Override example:

```bash
npm run db:cleanup:dry-run -- --notification-days=365 --location-event-days=30
```

## API payload rules

List endpoints should return compact rows. Heavy relations, document data, callback payloads, and long history should be excluded unless a detail endpoint explicitly needs them.

Recommended API shape:

- paginated list endpoints
- compact DTOs with selected fields
- detail endpoints for heavy records
- separate file/PDF download or streaming endpoints
- optional expansion flags only when scoped and authorized

High-priority endpoints to keep compact are patients, doctor queue, consultations, pharmacy stock, billing/invoices, reports, audit logs, notifications, lab results, and IPD summaries.

## CSV import storage rules

CSV imports should keep catalogs normalized and small:

- trim whitespace
- normalize casing and codes
- cap field lengths before insert
- validate rows before writing
- skip unchanged duplicates
- batch writes
- store import summaries, not uploaded CSV contents

Medicine catalog rows should not duplicate branch stock. Facility/branch price overrides should remain separate from platform master catalog rows.

## PostgreSQL and Render notes

Render PostgreSQL is suitable for Version 2, but storage must be monitored.

Recommended operations:

- monitor database size and row growth weekly after cutover
- inspect table/index sizes with `npm run db:storage:audit`
- inspect large text/json fields with `npm run db:large-fields:report`
- inspect index size and scan counts with `npm run db:index:audit`
- use PostgreSQL `VACUUM`/`ANALYZE` maintenance through managed database tooling where needed
- watch TOAST growth from large `text`/`jsonb` values
- use connection pooling appropriate to the Render plan
- upgrade the database plan before storage or connection limits become urgent

Render free/small plans are not appropriate for long-term production hospital history. Upgrade when clinical volume, audit logs, attachments, reports, or payment volume increases.

## Future schema hardening

This PR intentionally avoids destructive type migrations. Future staged migrations can further reduce storage by:

- moving remaining base64/data URL attachments to object storage
- replacing money-like `Float` fields with `Decimal`
- reducing oversized `Text` fields where measured production values are short
- adding archive tables or cold storage for long-retention operational telemetry
- introducing verified file storage metadata tables for lab attachments and official documents
