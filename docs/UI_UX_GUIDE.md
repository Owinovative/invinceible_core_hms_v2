# UI / UX Guide

Screen-by-screen documentation of the staff dashboard, platform console,
patient portal, and public pages. Screenshots require a running
deployment with seeded data; every figure below is therefore marked
**[SCREENSHOT — manual capture]** with the exact route to capture.

## 1. Application shells

| Shell | Layout | Chrome |
| --- | --- | --- |
| Staff dashboard `(dashboard)` | Sidebar + header + content | Role-filtered module nav, global search, notification bell, facility/branch scope switcher, user menu, subscription banner, status footer |
| Platform console `(platform)` | Focused admin layout | Facility onboarding, subscriptions, platform metrics |
| Patient portal `/patient-access` | Simplified card layout | Patient self-service |
| Public | Bare pages | Verification, reviews, marketing |

Navigation is generated from `lib/module-catalog.ts` + the sidebar
component and filtered by the caller's role/permissions — users only see
modules they may use.

## 2. Core clinical screens

| Screen (route) | Purpose · users | Key components · data | Primary actions |
| --- | --- | --- | --- |
| **Dashboard** `/dashboard` | Daily overview · all staff | KPI cards, queues, revenue charts (`use-dashboard-data`) | Navigate to modules |
| **Patients** `/patients` | Registry · reception, clinicians | Search table, registration dialog (`use-patients`, `use-create-patient`) | Register, edit, open profile |
| **Appointments** `/appointments` | Booking · reception | Calendar/table, booking form (clinics, doctors) | Book, check-in, reschedule |
| **Queue** `/queue` | Waiting-room flow · nursing | Live queue by stage (`use-queue`, `use-waiting-triage`) | Pull next, start triage |
| **Triage** `/triage` | Vitals capture · triage nurse | Vitals form w/ validation (`use-start-triage`, `use-complete-triage`) | Record vitals, set priority |
| **Doctor queue** `/doctor-queue` | Per-clinician worklist · doctors | Ready patients (`use-ready-for-doctor-triage`) | Start consultation |
| **Consultation** `/consultation` | Encounter workspace · clinicians | Complaint/history/exam/diagnosis (ICD catalog), lab-order + prescription panels (`use-consultation-workspace`) | Order labs, prescribe, complete |
| **Lab** `/lab` | Lab bench · technicians/managers | Order queue, result entry, verification (`use-lab-queue`, `use-create-lab-result`) | Enter/verify results |
| **Radiology** `/radiology` | Imaging · radiology staff | Operational-module records | Log request→report |
| **Pharmacy** `/pharmacy` | Dispensing · pharmacists | Prescription queue, stock check, alternatives, OTC sale flow | Dispense, OTC sale |
| **Pharmacy stock** `/pharmacy-stock` (+ `/pharmacy-pricing`) | Inventory · pharmacy managers | Branch stock table, movements, restock/adjust, pricing import | Restock, adjust, reprice |
| **IPD** `/ipd` (+ `/icu`, `/maternity`, `/theatre`, `/emergency`) | Inpatient care · ward staff | Ward/bed board, admission workspace (vitals, notes, reviews, treatment chart), discharge dialog | Admit, chart, transfer, discharge |

## 3. Financial screens

| Screen | Purpose · users | Highlights |
| --- | --- | --- |
| **Billing** `/billing` | Cashier workstation · cashiers/billing officers | Patient billing workspace: open invoice, line items with source module, cash + M-PESA STK panels with live status, receipt printing (`use-patient-billing-workspace`, `use-create-cash-payment`, `use-create-mpesa-payment-request`) |
| **Invoices** `/invoices` | Invoice registry · finance | Filterable table, detail view w/ payments + fiscal status, PDF export |
| **Revenue integrity** `/revenue-integrity` | Leakage control · finance managers | Unbilled-service reconciliation, cashier close |
| **Insurance / SHA claims** `/insurance`, `/sha-claims` | Claims · claims officers | Claim lifecycle (DRAFT→SUBMITTED→APPROVED/REJECTED→PAID), signatures, claim PDF, coverage-to-invoice linkage |
| **Procurement / Central store** `/procurement`, `/central-store` | Supply chain | Requisition→PO→GRN records |

## 4. Administration & platform

| Screen | Purpose |
| --- | --- |
| `/settings` | Facility, branches, departments, clinics, users & roles, tariffs, M-PESA credentials, system settings |
| `/reports` | Cross-module analytics + exports |
| `/medical-records`, `/hr`, `/assets`, `/biomedical`, … | Operational-module record screens (catalog-driven) |
| `/audit` (in settings/reports area) | Audit browser (`audit.read`) |
| `/notifications`, `/feedback`, `/ai-assistant` | Alerts, user feedback, Gemini assistant (flagged) |
| `/platform` | SaaS owner: facilities, subscriptions, compliance, reviews |

## 5. Patient portal (`/patient-access/*`)

Profile, appointments, invoices, lab results, prescriptions — read-only
self-service bound to the portal user's patient record
(`patient.portal.read`). Feature-flagged server-side.

## 6. Public pages

| Route | Purpose |
| --- | --- |
| `/invoice-verify` | QR-landing: verify invoice/receipt authenticity by number + code |
| `/login`, `/forgot-password`, `/reset-password` | Auth |
| `/reviews`, `/facilities`, `/creators`, `/inspiration`, `/workflow` | Marketing/social proof |

## 7. Interaction standards

- **Loading**: skeleton loaders per widget; buttons disable with spinners
  during mutations.
- **Empty states**: instructive copy + primary action.
- **Errors**: toasts for operations, inline alerts for panels; 401 →
  automatic logout; permission-denied views explain the required role.
- **Confirmation**: destructive/financial actions require dialogs
  (and step-up where enforced).
- **Feedback loop**: every financial mutation reflects immediately via
  query invalidation; M-PESA panels poll status until terminal.

## 8. Screenshot capture checklist (manual)

Capture at 1440×900, light theme, seeded demo facility, and store under
`docs/assets/screenshots/` with these names:

1. `login.png` — `/login`
2. `dashboard.png` — `/dashboard`
3. `patients.png`, `patient-register.png`
4. `queue.png`, `triage.png`
5. `consultation.png` (with lab + prescription panels)
6. `lab-results.png`
7. `pharmacy-dispense.png`, `pharmacy-stock.png`
8. `ipd-board.png`, `ipd-workspace.png`
9. `billing-workspace.png`, `mpesa-prompt.png`, `receipt-pdf.png`
10. `sha-claim.png`
11. `reports.png`, `settings-users.png`, `audit-log.png`
12. `platform-console.png`, `patient-portal.png`, `invoice-verify.png`

## Related

- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [FRONTEND.md](FRONTEND.md) ·
  [WORKFLOWS.md](WORKFLOWS.md)
