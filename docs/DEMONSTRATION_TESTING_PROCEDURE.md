# Frontend-to-Backend Demonstration Testing Procedure

## 1. Purpose

This runbook provides a repeatable demonstration of the HMS from the Next.js
frontend through the NestJS API and database. The primary scenario follows a
patient from reception through triage, consultation, laboratory, pharmacy,
billing, payment, and reporting.

Use this procedure only with a local, demonstration, or UAT database. Never
enter real patient information or trigger real SMS, M-Pesa, eTIMS, SHA, or DHA
services during a demonstration.

### 1.1 Scope and exclusions

This document is the complete execution procedure for the core outpatient
journey: reception, triage, doctor encounter, lab, pharmacy, cashier, reporting,
audit, and integration-status visibility. It does not certify every HMS module.
IPD, theatre, maternity, emergency, radiology, blood bank, procurement,
patient portal, live M-Pesa, eTIMS fiscalization, DHA sandbox/production,
official SHR exchange, and formal security/performance testing require their
own approved test plans and data. Optional AI and DHA checks are separated in
Section 8 so they cannot accidentally block the core run.

## 2. What the demonstration proves

```text
Browser UI
  -> Next.js frontend (http://localhost:3001)
  -> NestJS API (http://localhost:3000)
  -> authorization and facility/branch scope
  -> Prisma
  -> demonstration database
  -> mock DHA/eTIMS adapters where enabled
```

The presenter should be able to prove:

1. The frontend can reach the backend and establish an HttpOnly session.
2. The current user is restricted to the selected facility and branch.
3. A clinical record progresses through the expected departmental queues.
4. Clinical and financial changes persist after a browser refresh.
5. Payments update the applicable invoices and appear in reports and audit records.
6. Invalid access and invalid financial operations are rejected safely.

### 2.1 Canonical workflow and state transitions

The implemented workflow is queue-driven. Do not try to open a newly
registered patient directly in **Consultations**.

| Handoff                     | Required action                                                     | Expected state/result                                           |
| --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Reception → Triage          | Click **Register & Send to Triage**                                 | Triage record is `WAITING_TRIAGE`                               |
| Triage work                 | Click **Start Triage**                                              | Triage record is `IN_TRIAGE`                                    |
| Triage → Doctor             | Select clinic and doctor, then complete triage                      | Triage is `READY_FOR_DOCTOR`; appointment is `READY_FOR_DOCTOR` |
| Doctor queue → Consultation | Click **Start Consultation**                                        | Appointment is `IN_CONSULTATION`; encounter is created          |
| Consultation → Lab          | Save an active lab order                                            | Order appears in the laboratory queue                           |
| Consultation → Pharmacy     | Save a prescription                                                 | Prescription appears in the dispensing queue                    |
| Doctor completion           | Select a terminology result as the primary diagnosis, then complete | Consultation and appointment are `COMPLETED`                    |
| Charges → Cashier           | Open the patient billing workspace                                  | Generated invoice set shows configured billable items           |
| Cashier → Reports           | Commit each intended payment once                                   | Invoice balances and reports reconcile                          |

The general **Active Queue** contains appointments in `BOOKED`, `CHECKED_IN`,
`READY_FOR_DOCTOR`, and `IN_CONSULTATION`. A patient in `WAITING_TRIAGE`
belongs in **Triage & Vitals**, so their absence from the general active queue
at that point is expected.

## 3. Demonstration roles

The strongest demonstration uses separate accounts for each role:

| Station      | Suggested role | Required demonstration capability                       |
| ------------ | -------------- | ------------------------------------------------------- |
| Reception    | Receptionist   | Search/register patients and create a triage visit      |
| Triage       | Nurse          | Start and complete triage                               |
| Consultation | Doctor         | Open consultation, diagnose, order tests, and prescribe |
| Laboratory   | Lab Technician | View the lab queue and record results                   |
| Pharmacy     | Pharmacist     | View prescriptions and dispense available stock         |
| Billing      | Cashier        | Open invoice, inspect charges, and record cash payment  |
| Review       | Super Admin    | View reports, Platform Audit, and integration status    |

A super administrator can demonstrate the full workflow alone, but that does
not prove role separation. Use role-specific accounts when access control is
part of the audience's acceptance criteria.

## 4. One-time preparation

### 4.0 Workstation prerequisites

Use the same major Node.js version as CI and install from the committed lock
files:

| Requirement | Required state                                                                        |
| ----------- | ------------------------------------------------------------------------------------- |
| Node.js     | Version 22.x (`node --version`)                                                       |
| npm         | Available with Node 22 (`npm --version`)                                              |
| Database    | The provider named by `DATABASE_PROVIDER` is installed and reachable                  |
| Browser     | Current Firefox/Chromium using a clean profile or private window                      |
| Repository  | The intended test commit is checked out and the working tree state is recorded        |
| Network     | Not required for the core flow when DHA/eTIMS/notifications/AI are mocked or disabled |

From the repository root, install both applications independently:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

Do not replace `npm ci` with `npm install` during a controlled test. If it
reports that `package.json` and `package-lock.json` are out of sync, repair and
commit the lock file before declaring the build testable.

### 4.1 Safe environment configuration

The local backend uses `backend/.env`; the frontend uses
`frontend/.env.local`. Confirm these non-production settings:

```env
# backend/.env
PORT=3000
NODE_ENV=development
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/invinceible_core_hms_v2
JWT_SECRET=<unique-random-value-of-at-least-32-characters>
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:3001
FRONTEND_ORIGINS=http://localhost:3001
PUBLIC_API_BASE_URL=http://localhost:3000
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
API_DOCS_ENABLED=true
EVENT_BUS_SECRET=<separate-random-value-of-at-least-32-characters>
REDIS_URL=

# No facility has been onboarded with DHA yet.
DHA_ENABLED=true
DHA_MODE=mock

# Use mock or disabled integrations during a demonstration.
ETIMS_MODE=mock
ETIMS_ENABLED=false
SHR_ENABLED=false
SMS_ENABLED=false
WHATSAPP_ENABLED=false
AI_ENABLED=false
```

Generate separate development secrets without printing them in screenshots or
committing them:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

Use one output for `JWT_SECRET` and the other for `EVENT_BUS_SECRET`. The
database example above is PostgreSQL; use the MySQL provider and URL only when
the local database is actually MySQL. Never copy a production database URL or
real integration credentials into a demonstration recording.

Do not place server secrets in `frontend/.env.local`. It should contain only:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 4.2 Database and master-data readiness

First confirm that the configured database is running. For the local
PostgreSQL installation used by this project:

```bash
pg_isready -h localhost -p 5432

# Run this only when pg_isready reports that PostgreSQL is unavailable.
sudo pg_ctlcluster 15 main start
pg_isready -h localhost -p 5432
```

Do not continue until the second command reports that the server is accepting
connections and `/health/ready` later reports `database.ok: true`.

Apply migrations **before** running any setup scripts, using exactly one command
for the configured provider:

```bash
cd backend

# MySQL only
npm run prisma:migrate:deploy

# PostgreSQL only
npm run prisma:migrate:postgres
```

Then generate the client and preview the non-mutating critical-data check:

```bash
npm run prisma:generate
npm run db:validate:dry-run
```

If a migration fails, stop. Do not use `prisma migrate resolve`, edit migration
history, or reset a shared database merely to continue a demonstration.

Prepare the following before the audience arrives:

- One active demonstration facility and branch.
- Every clinical demonstration account has that facility set as its **Home
  Facility** and an appropriate home/allowed branch. A platform-only,
  unscoped administrator cannot create patient records.
- One clinic or department used for routing.
- Active staff records for the nurse, doctor, lab technician, pharmacist, and
  cashier accounts.
- At least one active lab test in the test catalogue.
- At least one active medicine with positive stock in the selected branch.
- At least one configured consultation/laboratory/medicine tariff.
- Role permissions appropriate to each station.
- A disposable or backed-up demonstration database.

The current basic Prisma seed creates only an administrative user. The demo
setup scripts create the facility, branch, departments, clinic, staff, users,
and synthetic diagnosis concepts. They do **not** create laboratory tests,
medicines, branch stock, or charge tariffs. Those remaining records must be
created through the administrative catalog, pharmacy, and billing screens.

If and only if this is a new disposable database with no administrator, create
one without putting its password in shell history:

```bash
cd backend
read -s -p "Initial super-admin password: " SUPER_ADMIN_PASSWORD
echo
export SUPER_ADMIN_PASSWORD
export SUPER_ADMIN_USERNAME=superadmin
export SUPER_ADMIN_EMAIL=superadmin@localhost
npm run admin:create-super
unset SUPER_ADMIN_PASSWORD SUPER_ADMIN_USERNAME SUPER_ADMIN_EMAIL
```

The password must satisfy the same 12-character complexity rule used for demo
staff. Do not run this bootstrap against production or when the account already
exists.

To create an idempotent synthetic facility and main branch and assign an
existing `SUPER_ADMIN`, `ADMIN`, or `FACILITY_ADMIN`, run:

```bash
cd backend
npm run demo:setup-facility -- <administrator-username>
```

The command refuses to run when `NODE_ENV=production`, does not configure a
real DHA facility identifier, and can be rerun without duplicating the facility
or branch. Sign out and sign in again after it completes.

Create the synthetic departments, OPD clinic, linked staff records, and scoped
login accounts with a password supplied securely in the current terminal:

```bash
cd backend
read -s -p "Demo staff password: " DEMO_STAFF_PASSWORD
echo
export DEMO_STAFF_PASSWORD
npm run demo:setup-staff
unset DEMO_STAFF_PASSWORD
```

The password must contain at least 12 characters, uppercase, lowercase, a
number, and a symbol. The command resets only the purpose-built `demo.*`
accounts and never prints the password. It creates these usernames:

| Username             | Role                   |
| -------------------- | ---------------------- |
| `demo.reception`     | Receptionist           |
| `demo.nurse`         | Triage Nurse           |
| `demo.doctor`        | Doctor and prescriber  |
| `demo.lab`           | Laboratory Technician  |
| `demo.pharmacy`      | Pharmacist             |
| `demo.cashier`       | Cashier                |
| `demo.facilityadmin` | Facility Administrator |

All records are synthetic and attached to **Demonstration Main Branch**. The
doctor available in the triage routing dropdown is **Daniel Demo**, and the
clinic is **Demonstration General Outpatient Clinic**.

Install the local demonstration-only diagnosis catalogue:

```bash
cd backend
npm run demo:setup-terminology
```

The command refuses to run in production. Its synthetic `DEMO-DX-*` concepts
are suitable only for demonstrating diagnosis selection and consultation
completion; they are not valid ICD-11 codes and must never be used for real
patient care, claims, reporting, or DHA exchange.

Before registering the patient, complete the master-data setup in this order:

1. Sign in with the existing super administrator and select **Invinceible
   Demonstration Hospital → Demonstration Main Branch**.
2. Open `/platform/catalogs`. Import the medicine, billing-service, and lab-test
   master records. This frontend area is super-administrator only.
3. Open `/pharmacy-pricing`. Create the medicine's branch stock and prices.
4. Open `/billing/tariffs`. Link active tariffs to the billing service and lab
   test for the selected facility and branch.
5. Sign out and sign in as each departmental account once to prove that the
   account is active and has the correct scope.

Use these safe minimum example records:

| Area                | Example values                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Medicine master     | Code `DEMO-PARA-500`; name `Demonstration Paracetamol`; form `Tablet`; strength `500 mg`; default price KES 5; active |
| Branch pharmacy     | Stock 100; reorder level 20; buying price KES 3; selling price KES 5; active                                          |
| Lab master          | Name `Demonstration Full Blood Count`; category `HEMATOLOGY`; specimen `Blood`; active                                |
| Billing service     | Code `DEMO-GP-CONSULT`; name `Demonstration GP Consultation`; category `CONSULTATION`; default KES 500; active        |
| Consultation tariff | Link the demonstration consultation service; KES 500; active in Demonstration Main Branch                             |
| Laboratory tariff   | Link the demonstration lab test; KES 300; active in Demonstration Main Branch                                         |

For a new or empty catalog, download each template and retain its exact header.
The minimum medicine file is:

```csv
id,code,name,dosageForm,strength,manufacturer,unitPrice,stockQuantity,reorderLevel,isActive
,DEMO-PARA-500,Demonstration Paracetamol,Tablet,500 mg,Demonstration Manufacturer,5,0,0,true
```

The minimum billing-service file is:

```csv
id,code,name,category,defaultPrice,isActive
,DEMO-GP-CONSULT,Demonstration GP Consultation,CONSULTATION,500,true
```

The minimum laboratory-test file is:

```csv
id,testName,category,specimenType,isActive
,Demonstration Full Blood Count,HEMATOLOGY,Blood,true
```

Import one file at a time under its matching catalog tab. A CSV intended for a
different tab must be rejected rather than adapted silently.

The **Master Catalogs** screen supports a safer bulk route: download the CSV
template, add the demonstration row without changing its headers, then import
it and confirm `created` or `updated` is non-zero. Branch stock and tariff
screens provide equivalent download/edit/import workflows.

Complete this data gate in **Demonstration Main Branch**:

| Data gate     | Minimum configuration                                                    | Verification                                                                      |
| ------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Clinic/doctor | Demonstration General Outpatient Clinic and Daniel Demo                  | Both appear in the triage routing selectors                                       |
| Diagnosis     | One active `DEMO-DX-*` concept                                           | Searching `DEMO` in the consultation diagnosis search returns a selectable result |
| Laboratory    | One active test with a price/tariff                                      | The test appears in the consultation order selector                               |
| Medicine      | One active medicine and dispensing unit                                  | It appears in the consultation prescription selector                              |
| Branch stock  | Positive quantity for that medicine in Demonstration Main Branch         | Pharmacy stock shows enough quantity for the prescription                         |
| Billing       | Active consultation/laboratory tariffs and medicine branch selling price | The cashier can calculate the expected total before payment                       |

Stop and fix master data if any row fails. Continuing with missing catalog or
stock records will make later queues appear empty even when the application is
working correctly. Never run a database reset against a shared UAT or
production database.

After setup, run the real read-only count validation to prove that all critical
Prisma model delegates can query the configured database:

```bash
cd backend
npm run db:validate
```

This command prints table counts only, not row contents. A zero count is valid
for unused clinical modules, but facility, branch, role, user, staff, and branch
medicine stock counts must be non-zero for this procedure.

### 4.3 Pre-demonstration automated checks

Run these checks after the final code change and before the demonstration:

```bash
cd backend
npm ci
npm run build
npm run test:unit:ci
npm run test:e2e
npm run lint:integration
npm run test:integration

cd ../frontend
npm ci
npm test
npm run lint
npm run build
```

For the same integration coverage gate used by CI, replace the final backend
integration command with `npm run test:integration:cov`. The lightweight HTTP
e2e specification validates the root status contract with a mocked Prisma
service; it does not replace the browser/database workflow in this document.

All commands must exit with code `0`. Record failing test names and output; do
not omit a failed suite from the result sheet.

Record the commit hash used for the demonstration:

```bash
git rev-parse HEAD
```

Run the frontend build only after stopping any `npm run dev` process. Both use
the `.next` directory, and running them concurrently can corrupt development
artifacts or make the build appear to hang.

## 5. Start the demonstration environment

Open two terminals after the database readiness check has passed.

Terminal 1 — API:

```bash
cd backend
npm run start:dev
```

Terminal 2 — web application:

```bash
cd frontend
npm run dev -- -p 3001
```

Preflight checks:

```bash
curl -fsS http://localhost:3000/health/live
curl -fsS http://localhost:3000/health/ready
```

Expected results:

- `/health/live` returns `status: "ok"`.
- `/health/ready` returns `status: "ready"` and `database.ok: true`.
- `http://localhost:3001/login` displays the login page.
- `http://localhost:3000/api/docs` displays Swagger in development.
- The frontend terminal does not repeatedly log `GET /login`; repeated requests
  indicate a browser reload loop that must be fixed before testing.

`/health/deep` may report Redis as unavailable when Redis is intentionally not
running locally. The database readiness check must still pass.

### 5.1 Go/no-go checklist

Do not register the test patient until every required row is `PASS`:

| Gate                  | Pass condition                                                         | Result |
| --------------------- | ---------------------------------------------------------------------- | ------ |
| Source                | Commit hash recorded; intended branch checked out                      |        |
| Backend dependencies  | `npm ci` completed                                                     |        |
| Frontend dependencies | `npm ci` completed                                                     |        |
| Database              | Correct provider migrated and critical-data count validation completed |        |
| API                   | `/health/live` and `/health/ready` pass                                |        |
| Web                   | `/login` loads once without hydration or reload-loop errors            |        |
| Authentication        | `/auth/login` and subsequent `/auth/me` succeed                        |        |
| Scope                 | Demonstration hospital and main branch appear in the header            |        |
| Staff                 | All seven `demo.*` accounts can log in                                 |        |
| Routing               | Demonstration clinic and Daniel Demo appear in triage                  |        |
| Terminology           | `DEMO` returns selectable diagnosis results                            |        |
| Lab                   | Demonstration Full Blood Count is selectable                           |        |
| Pharmacy              | Demonstration Paracetamol shows 100 units in branch stock              |        |
| Billing               | Consultation/lab tariffs are active and branch-scoped                  |        |
| External safety       | DHA/eTIMS are mock or disabled; AI/SMS/WhatsApp are disabled           |        |

## 6. Browser evidence setup

Before logging in:

1. Open browser developer tools.
2. Select **Network** and enable **Preserve log**.
3. Filter requests by `localhost:3000`.
4. Keep the backend terminal visible or record its logs separately.
5. Do not display passwords, cookies, authorization headers, or patient data in
   screenshots shared outside the demonstration team.
6. Disable browser extensions for the run or use a clean profile. Stack traces
   beginning with `chrome-extension://.../activeContent.js` come from an
   extension and are not reliable application evidence.

For each stage, record the generated patient number, triage number,
appointment/consultation identifier, lab order number, prescription identifier,
invoice number, and receipt/payment reference.

The seven demo accounts share only the password entered during
`demo:setup-staff`; the repository does not contain it. Use **Log out** between
roles and verify `/auth/me` changes to the intended account. Because the
session is stored in one HttpOnly cookie, opening another tab in the same
browser profile does not create a second independent role session. Use
separate browser profiles only if stations must remain logged in concurrently.
After every role change, confirm the header still shows **Invinceible
Demonstration Hospital / Demonstration Main Branch** before loading a queue.

Capture evidence without exposing secrets:

- Screenshot the visible success/status message and selected scope.
- In Network, record method, path, status code, and request ID—not cookie or
  authorization header values.
- After each write, refresh the page and confirm the same record persists.
- Record the before/after quantity and financial totals as numbers.

## 7. Primary end-to-end scenario

Use a unique suffix such as `DEMO-YYYYMMDD-01`. Do not reuse national IDs,
phone numbers, or SHA numbers from real people.

Suggested fictional patient:

| Field                    | Demonstration value                              |
| ------------------------ | ------------------------------------------------ |
| First name               | Amina                                            |
| Last name                | `Demo-<unique suffix>`                           |
| Gender                   | Female                                           |
| Date of birth            | 1990-05-15                                       |
| Phone/email              | Leave blank; outbound notifications are disabled |
| National ID / SHA number | Leave blank; DHA is in mock mode                 |
| Chief complaint          | Headache for two days                            |
| Arrival                  | Walk In                                          |
| Priority                 | Normal                                           |

### Stage A — authentication and scope

1. Open `http://localhost:3001/login` and sign in with the demonstration
   receptionist or administrator account.
2. If prompted, accept the current legal documents.
3. Select the prepared facility and branch in the application scope selector.
4. Refresh the dashboard once to prove the session survives navigation.

Expected evidence:

- `POST /auth/login` returns `200` and sets the `hms_session` HttpOnly cookie.
- `GET /auth/me` returns `200` after login.
- The header shows the intended facility and branch.
- The browser does not store a JWT in local storage.

A `401` from `/auth/me` before login or after logout is expected. A `401`
immediately after a successful login is a failure and normally indicates cookie,
CORS, domain, or `SameSite` configuration.

### Stage B — reception and patient registration

1. Open **Patients** (`/patients`). Do not use `/patients/new` for this test;
   that separate form registers a patient but does not create the triage visit.
2. Select the **Register New Patient** tab.
3. Enter the fictional patient details above.
4. Choose the prepared branch, enter the chief complaint, and select Normal
   priority.
5. Click **Register & Send to Triage**.
6. Record the displayed patient and triage numbers.

If the button is disabled, verify that the user has selected a facility and
branch and that every visibly required field is valid. Do not repeatedly click
the button: one successful action intentionally makes two API calls.

Expected evidence:

| Layer       | Expected result                                             |
| ----------- | ----------------------------------------------------------- |
| Frontend    | Success message contains the patient and triage numbers     |
| API         | `POST /patients` succeeds, followed by `POST /triage`       |
| Persistence | Patient remains searchable after a page refresh             |
| Scope       | Record appears only in the selected facility/branch context |

The patient should now appear in **Triage & Vitals**, not yet in
**Consultations** and not necessarily in the general **Active Queue**.

### Stage C — triage

1. Sign in as `demo.nurse`, or continue as the administrator.
2. Open **Triage & Vitals** (`/triage`).
3. Select the demonstration patient and click **Start Triage**.
4. Enter these safe sample observations:

| Observation       | Value       |
| ----------------- | ----------- |
| Temperature       | 37.2 °C     |
| Blood pressure    | 118/76 mmHg |
| Pulse             | 78 bpm      |
| Respiratory rate  | 16/min      |
| Oxygen saturation | 98%         |
| Weight            | 65 kg       |
| Height            | 168 cm      |
| Pain score        | 3/10        |

5. Select the prepared clinic and doctor.
6. Complete triage with status **Ready for Doctor**.

Expected evidence:

- `PATCH /triage/{id}/start` succeeds.
- `PATCH /triage/{id}/complete` succeeds.
- The patient leaves the waiting-triage queue and appears in the doctor queue.
- A `READY_FOR_DOCTOR` appointment is created for the selected clinic, doctor,
  facility, and branch.
- The saved observations remain visible after refresh.

### Stage D — consultation

1. Sign in as the routed doctor, `demo.doctor`.
2. Open **Active Queue** (`/queue`) and choose **Continue in Doctor Queue**, or
   open `/doctor-queue` directly. The appointment should show
   `READY_FOR_DOCTOR`.
3. Select the demonstration patient and click **Start Consultation**.
4. Open the newly created consultation. The **Consultations** page lists an
   encounter only after this start action succeeds.
5. Record fictional history and examination notes, such as `Headache for two
days; demonstration data only`.
6. In the standardized diagnosis search, enter `DEMO` or `headache`, then
   **click a returned terminology result** and mark it as the primary
   diagnosis. Typing free text alone does not select a diagnosis.
7. Add **Demonstration Full Blood Count**, urgency **Routine**, with clinical
   note `Synthetic demonstration order`, then save the lab order.
8. Add **Demonstration Paracetamol 500 mg** with dosage `500 mg`, route `Oral`,
   frequency `Three times daily`, duration `2 days`, quantity `4`, and
   instruction `Demonstration only`. Save/send the prescription to pharmacy.
9. Save the consultation, but leave it open while the laboratory result is
   processed. Continue at Stage E before completing the encounter.

Expected evidence:

- The consultation create/update requests succeed.
- `GET /consultations/{id}/workspace` returns the saved encounter state.
- The appointment changes from `READY_FOR_DOCTOR` to `IN_CONSULTATION` only
  once.
- The selected primary diagnosis has a terminology/concept identifier; it is
  not merely narrative text.
- The lab order appears in the laboratory queue.
- The prescription appears in the pharmacy queue.
- No consultation charge is assumed at this point. Lab and medicine charges
  are posted by result entry and dispensing respectively.

### Stage E — laboratory

1. Sign in as `demo.lab`.
2. Open **Laboratory** (`/lab`) and select the demonstration order.
3. Select the pending test item. Enter result value `Within demo reference
range` and remark `Synthetic result; not for clinical use`.
4. Leave the optional file attachment empty, save the result, and process every
   remaining order item if the order contains more than one.
5. Log out, sign back in as `demo.doctor`, return to the recorded consultation
   workspace, and confirm the result is visible.
6. Review the result, verify that a standardized primary diagnosis is selected,
   then complete the consultation.

Expected evidence:

- `GET /lab/queue` includes the order before processing.
- `POST /lab/results` succeeds.
- The completed result disappears from the pending queue as appropriate.
- The result is linked to the same patient and encounter.
- One laboratory invoice line is posted using the configured lab tariff. Do not
  submit a second result for the same test item during the happy path.
- Consultation completion succeeds and the appointment leaves the active
  doctor queue with status `COMPLETED`.

If completion reports `A standardized primary diagnosis is required`, return
to the diagnosis search and click an actual terminology result. The narrative
assessment or text entered in the diagnosis field does not meet this rule.

### Stage F — pharmacy and stock

1. Note the medicine's branch stock before dispensing.
2. Sign in as `demo.pharmacy` and open **Dispensing** (`/pharmacy`).
3. Select the demonstration prescription.
4. Allocate quantity `4`—no greater than either the prescribed quantity or
   available branch stock.
5. Click **Commit Allocations**.
6. Reopen branch stock and compare the quantity.

Expected evidence:

- `GET /pharmacy/queue` contains the prescription before dispensing.
- `PATCH /pharmacy/prescriptions/{id}/dispense` succeeds.
- The prescription becomes `DISPENSED` and branch stock changes from 100 to 96
  if no other test activity has changed the sample stock.
- Refreshing the page does not repeat the stock deduction.
- One medicine invoice line for quantity 4 at the branch selling price is
  posted exactly once.

### Stage G — invoice and cash payment

1. Sign in as `demo.cashier` and open **Billing & Cashier** (`/billing`).
2. Search for the demonstration patient.
3. Inspect **all** invoices returned in the patient billing workspace. The lab
   and pharmacy auto-charges can be on separate open invoices because the lab
   line is associated with the appointment while the medicine line is
   associated with the consultation. Do not assume automatic consolidation.
4. Confirm one laboratory line for KES 300 and one medicine line for quantity
   4 × KES 5 (KES 20), assuming the example prices were used.
5. Add the **Demonstration GP Consultation** service line for KES 500 once if
   it is not present. Consultation completion does not currently post this
   service automatically.
6. For every invoice included in the demonstration, record its number, opening
   balance, and exact cash amount. Pay each selected outstanding balance once.
7. Download/open every resulting receipt and record its payment reference.

Expected evidence:

- `GET /billing/patients/{patientId}/workspace` lists the patient's invoice set
  and clinical billing context.
- `POST /billing/patients/{patientId}/open-invoice` is used only when there is
  no suitable open invoice for a manual consultation line.
- `GET /billing/invoices/{id}` shows the expected items and totals.
- `POST /billing/payments/cash` succeeds once.
- Each paid invoice's paid amount and balance recalculate correctly.
- The payment, invoice totals, notification/audit record, and integration outbox
  are committed together.
- A second payment exceeding the remaining balance is rejected.

With the example prices, the combined expected charges across the invoice set
are KES 820 before discounts or taxes. The invoices do not have to be a single
record, but the recorded lines must total KES 820 exactly once. If the test uses
different configured prices, calculate and record the expected total before
accepting payment.

Do not demonstrate live M-Pesa unless a dedicated sandbox shortcode, callback,
and test phone are configured. Cash is the deterministic demonstration method.

### Stage H — reports, audit, and integration status

1. Sign in as the super administrator, open **Analytics & Reports**
   (`/reports`), and confirm the visit/payments appear in the selected date
   range.
2. Open **Platform Control → Audit** (`/platform/audit`).
3. Filter by the recorded patient, invoice, or user reference.
4. Open **Integration Hub** (`/integration`) and confirm DHA is identified as
   mock/disabled, not production.

Expected evidence:

- Report totals include every demonstration payment once and reconcile to the
  combined paid amount.
- Audit records identify the acting user and affected entity without exposing
  secrets.
- Authenticated `GET /integrations/status` returns the configured mock/offline
  state and queue depth.
- Integration failures, if deliberately simulated, are visible without
  preventing the local clinical workflow.

### 7.1 Network evidence reference

These are the principal requests expected in the browser Network panel. IDs in
braces are generated during the run.

| Stage              | Request                                                   | Expected status/effect                                    |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------- |
| Login              | `POST /auth/login`                                        | `200`; session cookie set                                 |
| Session            | `GET /auth/me`                                            | `200` while authenticated                                 |
| Role change        | `POST /auth/logout`                                       | `200`; old session invalidated                            |
| Reception          | `POST /patients`                                          | Patient created                                           |
| Reception          | `POST /triage`                                            | Triage record becomes `WAITING_TRIAGE`                    |
| Triage queue       | `GET /triage/waiting`                                     | New triage record returned                                |
| Start triage       | `PATCH /triage/{triageId}/start`                          | `IN_TRIAGE`                                               |
| Complete triage    | `PATCH /triage/{triageId}/complete`                       | `READY_FOR_DOCTOR`; appointment linked                    |
| Doctor queue       | `GET /triage/ready-for-doctor`                            | Routed patient returned                                   |
| Start consultation | `POST /consultations`                                     | Consultation `IN_PROGRESS`; appointment `IN_CONSULTATION` |
| Workspace          | `GET /consultations/{consultationId}/workspace`           | Saved encounter, orders, and results returned             |
| Save encounter     | `PATCH /consultations/{consultationId}`                   | Notes and primary concept persist                         |
| Lab order          | `POST /lab/orders`                                        | Order enters lab queue                                    |
| Lab queue          | `GET /lab/queue`                                          | Pending order returned                                    |
| Lab result         | `POST /lab/results`                                       | Item resulted and lab charge posted                       |
| Prescription       | `POST /pharmacy/prescriptions`                            | Prescription enters pharmacy queue                        |
| Pharmacy queue     | `GET /pharmacy/queue`                                     | Pending prescription returned                             |
| Dispense           | `PATCH /pharmacy/prescriptions/{prescriptionId}/dispense` | Stock deducted and medicine charge posted                 |
| Complete encounter | `PATCH /consultations/{consultationId}/complete`          | Consultation and appointment `COMPLETED`                  |
| Billing workspace  | `GET /billing/patients/{patientId}/workspace`             | All patient invoices/context returned                     |
| Invoice detail     | `GET /billing/invoices/{invoiceId}`                       | Lines and totals returned                                 |
| Cash payment       | `POST /billing/payments/cash`                             | Payment committed and invoice recalculated                |
| Receipt            | `GET /billing/payments/{paymentId}/receipt.pdf`           | Receipt PDF downloaded                                    |
| Reports            | `GET /reports/billing` and relevant report requests       | Paid totals included once                                 |
| Audit              | `GET /audit-logs`                                         | Authorized scoped audit records returned                  |
| Integrations       | `GET /integrations/status`                                | Mock/disabled integration status returned                 |

The UI may make additional reference-data and dashboard requests. An unexpected
`4xx` or `5xx` is a failure unless this runbook explicitly identifies it as an
expected negative test.

## 8. Optional demonstrations

Run these only after the core patient-to-payment scenario passes. They are not
prerequisites for the clinical workflow.

### 8.1 Encounter AI drafting

AI drafting is disabled in the baseline configuration so that an unavailable
external provider cannot block the clinical demonstration. To test it:

1. Set `AI_ENABLED=true` and a valid backend `GEMINI_API_KEY` in
   `backend/.env`.
2. Restart the backend; changing `.env` does not reconfigure an already running
   Nest process.
3. Open an in-progress synthetic consultation and select **Encounter AI
   Drafting**.
4. Submit fictional, non-identifying notes and review the generated draft.
5. Confirm that the clinician must still review and explicitly save the draft.

Never send real patient information to a demonstration AI account. A configured
key alone is insufficient when `AI_ENABLED` is false, the backend was not
restarted, or the provider/model is unavailable.

### 8.2 DHA mock integration

With `DHA_ENABLED=true` and `DHA_MODE=mock`, use **Integration Hub** to verify
that the application can exercise its local adapter without contacting DHA.
Mock success proves application wiring only; it is not DHA certification or
evidence of production onboarding.

Formal sandbox/UAT testing is a separate controlled run. It requires a DHA-
issued facility identifier, approved specification version, credentials,
official test identities, consent, and test scenarios. Once those are supplied
through the approved secret store, validate the environment and run the UAT
suite from the backend:

```bash
cd backend
npm run dha:uat:validate
npm run dha:uat
```

Do not substitute the fictional patient in this guide for an official DHA test
identity, and do not switch the primary demonstration to sandbox merely to make
the Integration Hub display `online`.

## 9. Negative checks

Run these after the happy path, not during the main presentation. Use a second
synthetic patient/encounter for tests that would change clinical state; do not
damage the completed evidence record.

| Test                    | Action                                                   | Expected result                                   |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| Logged-out access       | Log out, then open `/dashboard`                          | Redirect to login; `/auth/me` returns `401`       |
| Role enforcement        | Use receptionist account to open an admin-only operation | UI hides it or API returns `403`                  |
| Facility isolation      | Switch to another authorized facility/branch             | Demonstration patient is absent outside its scope |
| Overpayment             | Attempt cash payment greater than remaining balance      | `400`; no new payment or total change             |
| Duplicate dispensing    | Resubmit the completed allocation                        | No second stock deduction                         |
| Diagnosis enforcement   | Remove the selected primary concept and try completion   | `400`; consultation remains in progress           |
| Insufficient stock      | Attempt allocation above available branch stock          | Request rejected; stock is unchanged              |
| Wrong departmental role | Receptionist attempts pharmacy dispensing                | UI hides action or API returns `403`              |
| Integration auth        | Request integration status after logout                  | `401`; no integration details returned            |
| Input validation        | Submit a required form without mandatory fields          | Frontend blocks it or API returns `400`           |

Do not test cross-facility isolation by granting an account unauthorized access.
Use two prepared facilities and accounts with intentionally controlled scopes.
If a second controlled facility does not exist, record that case as `NOT RUN`
rather than weakening an account's access rules.

## 10. Failure diagnosis and recovery

Use the browser Network panel and backend request ID before retrying an action.

| Symptom                                                            | Most likely cause                                                                   | Recovery                                                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Register & Send to Triage** does nothing                         | Missing scope or invalid required field                                             | Select facility/branch, inspect inline validation, and confirm `POST /patients` appears in Network                      |
| `POST /patients` returns `500` with event signature mismatch       | Missing/inconsistent event signing configuration or stale process                   | Set one stable non-empty `EVENT_BUS_SECRET`, fully restart the backend, and preserve the request ID; halt if it repeats |
| Patient registration succeeds but triage creation fails            | The two-step reception action partially completed                                   | Do not register again; switch to patient search, select the created patient number, and use **Send to Triage** once     |
| Patient is absent from Active Queue immediately after registration | Patient is still `WAITING_TRIAGE`                                                   | Open **Triage & Vitals**; this is expected until triage completion creates the appointment                              |
| Completed triage is absent from Doctor Queue                       | Clinic/doctor was not assigned, completion failed, or doctor/branch scope differs   | Verify the successful complete response and sign in as the routed doctor in the same branch                             |
| Consultations is empty                                             | **Start Consultation** was not clicked successfully                                 | Open **Doctor Queue**, click it once, and confirm the appointment becomes `IN_CONSULTATION`                             |
| Diagnosis search returns nothing                                   | Demo terminology was not installed or the search term is too narrow                 | Run `npm run demo:setup-terminology`, refresh, and search `DEMO`                                                        |
| Consultation cannot complete                                       | Free text was entered but no standardized result was selected                       | Click a returned diagnosis concept and mark it primary                                                                  |
| Lab or pharmacy queue is empty                                     | Order/prescription was not saved, catalog item is inactive, or branch scope differs | Reopen the consultation workspace and verify saved orders plus the same branch at both stations                         |
| Pharmacy cannot allocate                                           | Branch stock is absent or insufficient                                              | Add stock to the selected branch or prescribe a smaller demonstration quantity                                          |
| Invoice has no expected charges                                    | Tariff is missing/inactive or charge-generating step was not saved                  | Verify catalog pricing and inspect the invoice before accepting payment                                                 |
| `Failed to fetch`                                                  | Backend is down, API URL is wrong, or CORS rejected the request                     | Check `/health/live`, `NEXT_PUBLIC_API_BASE_URL`, `FRONTEND_ORIGINS`, and the browser Network error                     |
| `/auth/me` returns `401` after login                               | Cookie was not stored/sent or the session expired                                   | Verify the login response cookie and local `SameSite`/secure settings, then sign in again                               |
| `/integration/status` returns `404`                                | Backend process is stale or an older build is running                               | Restart the current backend and also try the canonical `/integrations/status` route                                     |
| Database connection is refused                                     | Local PostgreSQL is stopped or `DATABASE_URL` targets the wrong host/port           | Run `pg_isready`, start the intended cluster, and recheck `/health/ready`                                               |
| Repeating `ioredis ECONNREFUSED` messages                          | `REDIS_URL` points to a Redis service that is not running                           | Start that Redis instance or leave `REDIS_URL` empty for the supported local memory fallback, then restart the API      |
| Frontend build hangs or reports missing `.next` manifests          | Dev server and build are writing the same `.next` directory                         | Stop `npm run dev`, remove only generated build output if necessary, then rerun one build process                       |
| `npm ci` reports lock-file mismatch                                | Manifest and committed lock file differ                                             | Stop the run; regenerate the correct package root's lock with `npm install`, review and commit it, then retry `npm ci`  |

Do not hide a failure by manually changing database states. Capture the request,
response, request ID, active user, facility, branch, and record identifiers.

## 11. Result recording sheet

Copy this table for each demonstration run:

| Test ID | UI action               | Expected API/result                            | Actual result | Pass/Fail | Evidence/reference |
| ------- | ----------------------- | ---------------------------------------------- | ------------- | --------- | ------------------ |
| DEMO-01 | Login                   | `/auth/login` 200; `/auth/me` 200              |               |           |                    |
| DEMO-02 | Register/send to triage | Patient and triage created                     |               |           |                    |
| DEMO-03 | Complete triage         | Ready-for-doctor queue                         |               |           |                    |
| DEMO-04 | Start consultation      | Appointment becomes in-consultation            |               |           |                    |
| DEMO-05 | Save consultation       | Diagnosis/order/prescription persist           |               |           |                    |
| DEMO-06 | Lab result              | Result visible; consultation completes         |               |           |                    |
| DEMO-07 | Dispense                | Stock decreases exactly once                   |               |           |                    |
| DEMO-08 | Cash payment(s)         | All selected balances paid; receipts available |               |           |                    |
| DEMO-09 | Reports/audit           | Every payment is visible exactly once          |               |           |                    |
| DEMO-10 | Authorization           | Unauthorized action rejected                   |               |           |                    |

Also record:

```text
Date/time:
Git commit:
Git branch:
Node/npm versions:
Database/environment:
Facility/branch:
Presenter:
Patient number:
Triage number:
Appointment ID/number:
Consultation ID:
Lab order number:
Prescription ID:
Stock before/after:
Expected consultation/lab/medicine totals:
Invoice numbers and opening balances:
Payment/receipt references:
Combined expected/actual paid total:
Known deviations:
```

Use these result definitions consistently:

| Result    | Meaning                                                                    |
| --------- | -------------------------------------------------------------------------- |
| `PASS`    | Observed result and persisted state exactly match the procedure            |
| `FAIL`    | The system completed the action but behavior/data differs from expectation |
| `BLOCKED` | A prerequisite or earlier defect prevents the test from executing          |
| `NOT RUN` | The test was deliberately excluded and the reason is recorded              |

For every failure, record the test ID, time, active username/role, facility,
branch, input summary, expected result, actual result, HTTP method/path/status,
backend request ID, and sanitized screenshot/log excerpt. Never attach `.env`,
cookies, tokens, passwords, real patient data, or raw credential files to a
defect.

## 12. Cleanup and repeatability

- Prefer restoring a disposable demonstration database snapshot after the run.
- On a shared UAT database, retain audited financial and clinical records and
  mark them clearly as synthetic demonstration data; do not delete them
  manually.
- Use a new unique patient suffix for each run.
- Clear browser cookies between role/session tests when necessary.
- Stop both development servers with `Ctrl+C`.
- Store evidence in the approved private test-evidence location, never in the
  public repository when it contains health, credential, or session data.

## 13. Demonstration acceptance criteria

The run passes when:

- Both health preflight endpoints pass.
- Login and `/auth/me` work through the browser cookie session.
- One synthetic patient completes all selected departmental handoffs.
- The recorded states follow the canonical workflow without manual database
  edits or duplicate actions.
- Data persists after refresh at every stage.
- No unexplained `4xx`, `5xx`, hydration, CORS, or failed-fetch errors occur.
- Facility/branch and role restrictions behave as expected.
- Stock, invoice-set, payment, report, and audit figures reconcile exactly
  once; with the supplied example prices, the combined charge is KES 820.
- No real external-service request or real personal data is used.
