# Frontend-to-Backend Demonstration Testing Procedure

## 1. Purpose

This runbook provides a repeatable demonstration of the HMS from the Next.js
frontend through the NestJS API and database. The primary scenario follows a
patient from reception through triage, consultation, laboratory, pharmacy,
billing, payment, and reporting.

Use this procedure only with a local, demonstration, or UAT database. Never
enter real patient information or trigger real SMS, M-Pesa, eTIMS, SHA, or DHA
services during a demonstration.

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
5. Payments update the invoice and appear in reports and audit records.
6. Invalid access and invalid financial operations are rejected safely.

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
| Review       | Facility Admin | View reports and scoped audit records                   |

A super administrator can demonstrate the full workflow alone, but that does
not prove role separation. Use role-specific accounts when access control is
part of the audience's acceptance criteria.

## 4. One-time preparation

### 4.1 Safe environment configuration

The local backend uses `backend/.env`; the frontend uses
`frontend/.env.local`. Confirm these non-production settings:

```env
# backend/.env
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
FRONTEND_ORIGINS=http://localhost:3001
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
API_DOCS_ENABLED=true

# No facility has been onboarded with DHA yet.
DHA_ENABLED=true
DHA_MODE=mock

# Use mock or disabled integrations during a demonstration.
ETIMS_MODE=mock
SMS_ENABLED=false
WHATSAPP_ENABLED=false
```

Do not place server secrets in `frontend/.env.local`. It should contain only:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 4.2 Database and master-data readiness

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

The current basic Prisma seed creates only an administrative user. It does not
create all clinical master data needed by this scenario. Check the items above
in the Platform and Settings screens before scheduling the demonstration.

To create an idempotent synthetic facility and main branch and assign an
existing administrator, start the local database and run:

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

Apply migrations using the command appropriate to the configured database:

```bash
cd backend

# MySQL deployment
npm run prisma:migrate:deploy

# PostgreSQL deployment
npm run prisma:migrate:postgres
```

Never run a database reset against a shared UAT or production database.

### 4.3 Pre-demonstration automated checks

Run these checks after the final code change and before the demonstration:

```bash
cd backend
npm ci
npm run build
npm run test:unit:ci
npm run lint:integration
npm run test:integration

cd ../frontend
npm ci
npm test
npm run lint
npm run build
```

Record the commit hash used for the demonstration:

```bash
git rev-parse HEAD
```

## 5. Start the demonstration environment

Open two terminals.

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

`/health/deep` may report Redis as unavailable when Redis is intentionally not
running locally. The database readiness check must still pass.

## 6. Browser evidence setup

Before logging in:

1. Open browser developer tools.
2. Select **Network** and enable **Preserve log**.
3. Filter requests by `localhost:3000`.
4. Keep the backend terminal visible or record its logs separately.
5. Do not display passwords, cookies, authorization headers, or patient data in
   screenshots shared outside the demonstration team.

For each stage, record the generated patient number, triage number,
appointment/consultation identifier, lab order number, prescription identifier,
invoice number, and receipt/payment reference.

## 7. Primary end-to-end scenario

Use a unique suffix such as `DEMO-20260718-01`. Do not reuse national IDs,
phone numbers, or SHA numbers from real people.

Suggested fictional patient:

| Field                    | Demonstration value                           |
| ------------------------ | --------------------------------------------- |
| First name               | Amina                                         |
| Last name                | `Demo-<unique suffix>`                        |
| Date of birth            | 1990-05-15                                    |
| Phone/email              | Leave blank unless notifications are disabled |
| National ID / SHA number | Leave blank; DHA is in mock mode              |
| Chief complaint          | Headache for two days                         |
| Arrival                  | Walk In                                       |
| Priority                 | Normal                                        |

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

1. Open **Patients**.
2. Select **Register New Patient**.
3. Enter the fictional patient details above.
4. Choose the prepared branch, enter the chief complaint, and select Normal
   priority.
5. Click **Register & Send to Triage**.
6. Record the displayed patient and triage numbers.

Expected evidence:

| Layer       | Expected result                                             |
| ----------- | ----------------------------------------------------------- |
| Frontend    | Success message contains the patient and triage numbers     |
| API         | `POST /patients` succeeds, followed by `POST /triage`       |
| Persistence | Patient remains searchable after a page refresh             |
| Scope       | Record appears only in the selected facility/branch context |

### Stage C — triage

1. Sign in as the nurse, or continue as the administrator.
2. Open **Triage & Vitals**.
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
- The saved observations remain visible after refresh.

### Stage D — consultation

1. Sign in as the routed doctor.
2. Open **Doctor Queue**. The general **Active Queue** should also show the
   appointment with status `READY_FOR_DOCTOR`.
3. Select the demonstration patient and click **Start Consultation**.
4. Open the newly created consultation. The **Consultations** page lists an
   encounter only after this start action succeeds.
5. Record a fictional history, examination, and diagnosis such as
   `Demonstration tension-type headache`.
6. Add one configured lab test.
7. Add one configured medicine with a quantity that is available at the
   selected branch.
8. Save the consultation. Complete it after the required results/review steps
   for the configured workflow.

Expected evidence:

- The consultation create/update requests succeed.
- `GET /consultations/{id}/workspace` returns the saved encounter state.
- The lab order appears in the laboratory queue.
- The prescription appears in the pharmacy queue.
- Billable configured services appear on the patient's open invoice.

### Stage E — laboratory

1. Sign in as the laboratory user.
2. Open **Laboratory** and select the demonstration order.
3. Enter a clearly fictional result, for example `Within demo reference range`.
4. Save the result and complete any verification action shown by the workflow.
5. Return to the doctor workspace and confirm the result is visible.

Expected evidence:

- `GET /lab/queue` includes the order before processing.
- `POST /lab/results` succeeds.
- The completed result disappears from the pending queue as appropriate.
- The result is linked to the same patient and encounter.

### Stage F — pharmacy and stock

1. Note the medicine's branch stock before dispensing.
2. Sign in as the pharmacist and open **Dispensing**.
3. Select the demonstration prescription.
4. Enter a quantity no greater than the prescribed quantity and available
   stock.
5. Click **Commit Allocations**.
6. Reopen branch stock and compare the quantity.

Expected evidence:

- `GET /pharmacy/queue` contains the prescription before dispensing.
- `PATCH /pharmacy/prescriptions/{id}/dispense` succeeds.
- The prescription becomes partially or fully dispensed as expected.
- Branch stock decreases exactly once by the dispensed quantity.
- Refreshing the page does not repeat the stock deduction.

### Stage G — invoice and cash payment

1. Sign in as the cashier and open **Billing & Cashier**.
2. Search for the demonstration patient.
3. Open the existing invoice, or create an open invoice if the workflow has not
   created one automatically.
4. Confirm the consultation, laboratory, and medicine charges are correct.
5. Record the exact outstanding amount as a cash payment.
6. Open or print the receipt and record its reference.

Expected evidence:

- `POST /billing/patients/{patientId}/open-invoice` is used only when needed.
- `GET /billing/invoices/{id}` shows the expected items and totals.
- `POST /billing/payments/cash` succeeds once.
- Invoice paid amount and balance recalculate correctly.
- The payment, invoice totals, notification/audit record, and integration outbox
  are committed together.
- A second payment exceeding the remaining balance is rejected.

Do not demonstrate live M-Pesa unless a dedicated sandbox shortcode, callback,
and test phone are configured. Cash is the deterministic demonstration method.

### Stage H — reports, audit, and integration status

1. Open **Analytics & Reports** and confirm the visit/payment appears in the
   selected date range.
2. Open **Platform Control → Audit** as an authorized administrator.
3. Filter by the recorded patient, invoice, or user reference.
4. Open **Integration Hub** and confirm DHA is identified as mock/disabled, not
   production.

Expected evidence:

- Report totals include the demonstration payment once.
- Audit records identify the acting user and affected entity without exposing
  secrets.
- Authenticated `GET /integrations/status` returns the configured mock/offline
  state and queue depth.
- Integration failures, if deliberately simulated, are visible without
  preventing the local clinical workflow.

## 8. Negative checks

Run these after the happy path, not during the main presentation:

| Test                 | Action                                                   | Expected result                                   |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| Logged-out access    | Log out, then open `/dashboard`                          | Redirect to login; `/auth/me` returns `401`       |
| Role enforcement     | Use receptionist account to open an admin-only operation | UI hides it or API returns `403`                  |
| Facility isolation   | Switch to another authorized facility/branch             | Demonstration patient is absent outside its scope |
| Overpayment          | Attempt cash payment greater than remaining balance      | `400`; no new payment or total change             |
| Duplicate dispensing | Resubmit the completed allocation                        | No second stock deduction                         |
| Input validation     | Submit a required form without mandatory fields          | Frontend blocks it or API returns `400`           |

Do not test cross-facility isolation by granting an account unauthorized access.
Use two prepared facilities and accounts with intentionally controlled scopes.

## 9. Result recording sheet

Copy this table for each demonstration run:

| Test ID | UI action               | Expected API/result                     | Actual result | Pass/Fail | Evidence/reference |
| ------- | ----------------------- | --------------------------------------- | ------------- | --------- | ------------------ |
| DEMO-01 | Login                   | `/auth/login` 200; `/auth/me` 200       |               |           |                    |
| DEMO-02 | Register/send to triage | Patient and triage created              |               |           |                    |
| DEMO-03 | Complete triage         | Ready-for-doctor queue                  |               |           |                    |
| DEMO-04 | Consultation            | Notes/order/prescription persist        |               |           |                    |
| DEMO-05 | Lab result              | Result visible to doctor                |               |           |                    |
| DEMO-06 | Dispense                | Stock decreases exactly once            |               |           |                    |
| DEMO-07 | Cash payment            | Balance recalculates; receipt available |               |           |                    |
| DEMO-08 | Reports/audit           | Transaction visible once                |               |           |                    |
| DEMO-09 | Authorization           | Unauthorized action rejected            |               |           |                    |

Also record:

```text
Date/time:
Git commit:
Database/environment:
Facility/branch:
Presenter:
Patient number:
Triage number:
Consultation ID:
Lab order number:
Prescription ID:
Invoice number:
Payment/receipt reference:
Known deviations:
```

## 10. Cleanup and repeatability

- Prefer restoring a disposable demonstration database snapshot after the run.
- On a shared UAT database, retain audited financial and clinical records and
  mark them clearly as synthetic demonstration data; do not delete them
  manually.
- Use a new unique patient suffix for each run.
- Clear browser cookies between role/session tests when necessary.
- Stop both development servers with `Ctrl+C`.
- Store evidence in the approved private test-evidence location, never in the
  public repository when it contains health, credential, or session data.

## 11. Demonstration acceptance criteria

The run passes when:

- Both health preflight endpoints pass.
- Login and `/auth/me` work through the browser cookie session.
- One synthetic patient completes all selected departmental handoffs.
- Data persists after refresh at every stage.
- No unexplained `4xx`, `5xx`, hydration, CORS, or failed-fetch errors occur.
- Facility/branch and role restrictions behave as expected.
- Stock, invoice, payment, report, and audit figures reconcile exactly once.
- No real external-service request or real personal data is used.
