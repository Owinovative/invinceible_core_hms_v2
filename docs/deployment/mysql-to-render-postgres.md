# MySQL to Render PostgreSQL migration

This guide prepares a safe production database migration from the current
MySQL database to Render PostgreSQL.

This is a database engine migration, not a simple `DATABASE_URL` swap. MySQL
and PostgreSQL differ in SQL syntax, type mapping, sequence behavior, JSON
behavior, identifier quoting, index behavior, and migration history.

## Current state

- Backend: NestJS.
- ORM: Prisma.
- Canonical schema: `backend/prisma/schema.prisma`.
- Current provider: `mysql`.
- Current migrations: `backend/prisma/migrations`.
- Production data: MySQL.
- Target database: Render PostgreSQL.

The current MySQL migrations contain MySQL-native SQL such as:

- backtick-quoted identifiers;
- `AUTO_INCREMENT`;
- `DATETIME(3)`;
- `DOUBLE`;
- `LONGTEXT`;
- MySQL `JSON`;
- MySQL-specific `ALTER TABLE` syntax.

Do not apply `backend/prisma/migrations` to PostgreSQL.

## PostgreSQL readiness added

The repository now has a separate PostgreSQL path:

- `backend/scripts/create-postgres-prisma-schema.mjs`
- `backend/prisma-postgresql/schema.prisma`
- `backend/prisma-postgresql/migrations/000001_render_postgres_baseline/migration.sql`
- `backend/prisma-postgresql/migrations/migration_lock.toml`

The PostgreSQL schema is generated from the canonical MySQL schema:

```bash
cd backend
npm run prisma:schema:postgres
```

Provider-specific mapping:

| MySQL schema feature | PostgreSQL target |
| --- | --- |
| `provider = "mysql"` | `provider = "postgresql"` |
| `@db.LongText` | `@db.Text` |
| `@db.VarChar(n)` | Preserved as PostgreSQL `VARCHAR(n)` |
| `@db.Text` | Preserved as PostgreSQL `TEXT` |
| `Float` | PostgreSQL `DOUBLE PRECISION` |
| `Json` | PostgreSQL JSON-capable Prisma field |
| `Int @default(autoincrement())` | PostgreSQL `SERIAL` baseline |
| `DateTime @default(now())` | PostgreSQL `TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP` |

The app code was inspected for raw SQL. The only runtime raw SQL found is the
health check `SELECT 1`, which is portable across MySQL and PostgreSQL.

## Required scripts

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:schema:postgres
npm run prisma:generate:postgres
npm run prisma:migrate:postgres
npm run db:validate:dry-run
npm run db:validate
npm run db:backup:notes
```

`db:validate` prints row counts only. It does not print patient details,
payment secrets, tokens, or database URLs.

## Backup steps

Before every dry run and production cutover:

1. Take a provider-native MySQL snapshot.
2. Create a logical MySQL dump from a consistent point in time.
3. Store backups outside the application repository.
4. Restore the backup into a disposable MySQL database to prove it is usable.
5. Record backup timestamp, source host, schema version, and migration operator.

Example logical dump shape:

```bash
mysqldump \
  --single-transaction \
  --routines=false \
  --triggers=false \
  --set-gtid-purged=OFF \
  --default-character-set=utf8mb4 \
  --databases invinceible_core_hms_v2 \
  > hms-prod-YYYYMMDD-HHMM.sql
```

Do not commit database dumps.

## Dry-run migration

Use a staging Render PostgreSQL database first.

1. Restore or point to a recent MySQL copy, not live production.
2. Create a Render PostgreSQL test database.
3. Set a temporary backend environment to the PostgreSQL `DATABASE_URL`.
4. Run:

```bash
cd backend
npm ci
npm run prisma:generate:postgres
npm run prisma:migrate:postgres
```

5. Import data using one of the migration options below.
6. Generate the PostgreSQL Prisma client again:

```bash
npm run prisma:generate:postgres
```

7. Run validation:

```bash
npm run db:validate
```

8. Start the backend against PostgreSQL and exercise critical workflows.

## Data migration options

### Option A: pgloader

Use `pgloader` if it supports the source MySQL version, target PostgreSQL
version, and the schema/data volume.

High-level flow:

1. Create the PostgreSQL schema with `npm run prisma:migrate:postgres`.
2. Run pgloader from MySQL into PostgreSQL with careful type and identifier
   settings.
3. Preserve primary key values.
4. Reset PostgreSQL sequences after import.
5. Validate row counts and relationships.

Example shape, with real secrets supplied outside the repository:

```bash
pgloader mysql://SOURCE_USER:SOURCE_PASSWORD@SOURCE_HOST/SOURCE_DB \
  postgresql://TARGET_USER:TARGET_PASSWORD@TARGET_HOST/TARGET_DB
```

Review pgloader output carefully. Do not allow it to silently rename tables or
drop data. This application uses explicit Prisma `@@map` table names, so table
names must remain stable.

### Option B: controlled Prisma/Node migration

Use this when pgloader is not suitable or when more transformation control is
needed.

Requirements for a custom importer:

- Source MySQL connection is read-only.
- Target PostgreSQL connection is a staging or newly provisioned database.
- Dry-run mode must be available.
- Records must be imported in dependency order.
- Primary IDs should be preserved where safe.
- `createdAt` and `updatedAt` must be preserved.
- Batches must be resumable.
- Logs must show table names/counts only, not patient details.
- No secrets may be printed.
- PostgreSQL sequences must be reset after preserving integer IDs.

Suggested dependency order:

1. `facilities`
2. `branches`
3. `roles`
4. `users`
5. `departments`
6. `staff_members`
7. `patients`
8. location/session tables
9. clinics, wards, beds, catalog tables
10. appointments and triage
11. consultations
12. lab orders, items, and results
13. prescriptions, prescription items, dispenses, dispense items
14. admissions and IPD clinical tables
15. billing services, service tariffs, invoices, invoice items
16. SHA claims and payments
17. notifications, feedback, audit logs, outbox events
18. stock tables and subscription payments

After ID-preserving import, reset sequences:

```sql
SELECT setval(pg_get_serial_sequence('"facilities"', 'id'), COALESCE(MAX("id"), 1), true) FROM "facilities";
```

Repeat for every `SERIAL` primary key table.

## Staging test checklist

Run these checks against Render PostgreSQL staging:

- `GET /health/live` returns `ok`.
- `GET /health/ready` returns `ready`.
- Login works for a known non-production test user.
- Facility/branch scoping still applies.
- Patient search and patient creation work.
- Appointment creation works.
- Consultation workspace loads.
- Prescription creation works.
- Stock movement and low-stock views work.
- Invoice creation and invoice detail work.
- Payment creation and M-Pesa records work in sandbox.
- SHA claim list/detail work.
- PDF endpoints still generate documents.
- Reports dashboard and system health reports load.
- Audit logs are written for sensitive actions.
- Password reset link generation points to the Render frontend URL.

## Data validation checklist

Compare MySQL source and PostgreSQL target counts for:

- `facilities`
- `branches`
- `roles`
- `users`
- `staff_members`
- `patients`
- `appointments`
- `triages`
- `consultations`
- `lab_orders`
- `lab_order_items`
- `lab_results`
- `medicines`
- `prescriptions`
- `prescription_items`
- `branch_medicine_stocks`
- `invoices`
- `invoice_items`
- `payments`
- `sha_claims`
- `audit_logs`
- `notifications`
- `data_outbox_events`

Spot-check without exposing PHI:

- A known facility has expected branches.
- A known patient has expected invoices, payments, prescriptions, and lab
  orders.
- A known invoice balance matches source.
- M-Pesa checkout/request IDs are preserved.
- Audit log timestamps and actor references are preserved.
- User password hashes are unchanged.
- PostgreSQL sequences are higher than current maximum IDs.

## Production cutover

Recommended downtime: schedule a short maintenance window. The safest path is
write downtime because clinical, billing, pharmacy, and payment writes must not
split across MySQL and PostgreSQL.

1. Announce maintenance window.
2. Put the app into maintenance mode or stop write traffic.
3. Confirm no active M-Pesa callbacks are in flight.
4. Take final MySQL backup.
5. Provision or confirm Render PostgreSQL target.
6. Apply PostgreSQL baseline migrations.
7. Import final MySQL data into PostgreSQL.
8. Reset PostgreSQL sequences.
9. Run data validation checklist.
10. Deploy backend with:

```bash
npm run prisma:generate:postgres
npm run prisma:migrate:postgres
npm run build
npm run start:prod
```

11. Set backend `DATABASE_URL` to the Render PostgreSQL internal connection
    string.
12. Verify `/health/live`, `/health/ready`, login, patient search, invoice
    detail, payment detail, report summary, and PDF generation.
13. Update Daraja callback URL only after backend validation.
14. Reopen traffic.

## Rollback plan

Rollback before traffic cutover:

- Keep production on MySQL.
- Destroy or archive the failed PostgreSQL staging target.
- Fix the migration plan and rerun dry run.

Rollback after traffic cutover:

- Stop writes immediately.
- Determine whether PostgreSQL accepted production writes.
- If no PostgreSQL-only writes occurred, point backend `DATABASE_URL` and
  frontend API URL back to the Railway/MySQL deployment.
- If PostgreSQL-only writes occurred, decide whether to replay those writes into
  MySQL or restore from the latest backup. Do not silently discard clinical,
  payment, stock, or audit data.
- Keep all migration logs and validation outputs for incident review.

## Known risks

- MySQL and PostgreSQL handle case sensitivity and identifier quoting
  differently.
- PostgreSQL sequences must be reset after ID-preserving imports.
- Floating money fields currently use `Float`; this preserves current behavior
  but remains less precise than `Decimal`.
- Very large `TEXT` fields may require import batch tuning.
- JSON payloads must be valid JSON for PostgreSQL import.
- MySQL zero dates, if present, will fail PostgreSQL import and must be cleaned.
- Existing MySQL migration history cannot be replayed on PostgreSQL.
- External M-Pesa callbacks during downtime can create payment state drift.

## Manual Render dashboard steps

1. Add or verify Render PostgreSQL service.
2. Confirm the backend `DATABASE_URL` uses the internal PostgreSQL connection
   string after cutover.
3. Keep MySQL credentials available only for rollback and validation windows.
4. Keep Daraja credentials on the backend service only.
5. Set `DATABASE_PROVIDER=postgresql` as an operational marker.
6. Keep Railway/Vercel live until the Render PostgreSQL cutover passes smoke
   testing.
