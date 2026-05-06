# 🏥 Invinceible Core HMS

<p align="center">
  <strong>A modern Hospital Management System for real clinical, billing, pharmacy, lab, IPD, and branch workflows.</strong>
</p>

<p align="center">
  <img alt="NestJS" src="https://img.shields.io/badge/Backend-NestJS-e0234e?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Frontend-Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/UI-React-61dafb?style=for-the-badge&logo=react&logoColor=111827" />
  <img alt="Prisma" src="https://img.shields.io/badge/ORM-Prisma-2d3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img alt="MySQL" src="https://img.shields.io/badge/Database-MySQL-4479a1?style=for-the-badge&logo=mysql&logoColor=white" />
</p>

---

## ✨ What It Does

**Invinceible Core HMS** connects the main hospital departments into one working platform:

```text
Reception → Triage → Doctor → Lab → Pharmacy → Billing → Payment → Reports
```

It supports patient registration, triage, doctor consultation, lab orders and results, pharmacy dispensing, IPD/admissions, billing, invoices, receipts, SHA claims, M-Pesa/Daraja payments, branches, users, roles, audit logs, reports, and stock control.

---

## 🧩 Main Modules

| Module | What it handles |
| --- | --- |
| 🧾 Patient Registration | Patient records, search, visit tracking, and history |
| 🩺 Triage | Vitals, pain score, urgency level, clinic routing, and doctor routing |
| 👨‍⚕️ Doctor Queue | Priority-based patient queue sorted by severity and waiting time |
| 📋 Consultation | Diagnosis, notes, treatment plan, lab requests, prescriptions, and admission decisions |
| 🧪 Lab | Lab orders, result entry, result updates, and clinical result flow |
| 💊 Pharmacy | Prescription dispensing, stock checks, medicine alternatives, and stock movement |
| 🏥 IPD / Admissions | Admissions, beds, inpatient notes, treatment entries, and discharge workflow |
| 💰 Billing | Invoices, invoice items, discounts, payments, receipts, cashier close, and revenue tracking |
| 📲 M-Pesa / Daraja | STK prompts, payment status checks, callback handling, and duplicate protection |
| 🧾 SHA Claims | Claim creation, claim tracking, claim PDFs, and invoice coverage syncing |
| 🏢 Branch Management | Branch operations, branch-level access, stock, users, and workflow organization |
| 🔐 Roles & Access | Staff roles, branch access, protected routes, and controlled permissions |
| 📊 Reports | Billing, pharmacy, lab, SHA, audit, and operational reports |
| 🕵️ Audit Logs | Tracks important actions across users, payments, settings, and workflows |

---

## 🚦 Real Hospital Flow

```text
1. Reception registers or finds the patient
2. Triage captures vitals and sets urgency
3. Doctor sees the patient from the queue
4. Doctor requests lab tests or prescribes medicine
5. Lab enters and updates results
6. Pharmacy dispenses medicine and updates stock
7. Billing creates invoice and receives payment
8. Cashier issues receipt
9. Admin and management view reports
```

---

## 🔐 Built for Controlled Access

Each staff member works inside their role:

- Reception handles patient entry and queues
- Triage captures vitals and routes patients
- Doctors handle consultations and clinical decisions
- Lab handles test results
- Pharmacy handles dispensing and stock
- Cashier handles invoices and payments
- Admin manages users, branches, settings, and reports

The system is designed so users only access the workflows they are allowed to use.

---

## ⚡ Production Direction

The system is being built with production hospital needs in mind:

- Secure authentication and role-based access
- Branch-aware workflows
- M-Pesa/Daraja payment support
- Payment duplicate protection
- Audit tracking for critical actions
- Stock-aware pharmacy workflows
- Printable invoices and receipts
- QR/public invoice verification
- SHA claim support
- Scalable backend architecture
- Clean frontend workflow screens

---

## 🛠️ Tech Stack

### Backend

- **NestJS** — API framework
- **Prisma** — database ORM
- **MySQL** — database
- **JWT Auth** — authentication
- **PDFKit / QR tools** — documents and verification

### Frontend

- **Next.js** — app framework
- **React** — user interface
- **TypeScript** — safer code
- **Tailwind-style UI components** — clean dashboard experience

---

## 📁 Project Structure

```text
invinceible_core_hms_v2/
├── backend/       # NestJS API, Prisma, auth, billing, lab, pharmacy, IPD, users
├── frontend/      # Next.js/React dashboard, platform pages, hospital workflows
├── docs/          # Guides, setup notes, deployment notes, and architecture docs
└── README.md      # Project overview
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Owinovative/invinceible_core_hms_v2.git
cd invinceible_core_hms_v2
```

### 2. Backend setup

```bash
cd backend
npm install
npm run prisma:generate
npm run start:dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Environment setup

Create environment files for backend and frontend. Keep secrets out of GitHub.

Backend examples:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="replace-with-a-strong-production-secret"
JWT_EXPIRES_IN="1d"
FRONTEND_URL="https://your-frontend-domain.com"
```

M-Pesa/Daraja credentials should be configured safely through facility/branch settings or secure environment configuration depending on deployment setup.

---

## 🧪 Useful Commands

Backend:

```bash
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm run test
```

Frontend:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

## 📌 Current Product Focus

The platform is focused on:

- Completing hospital department workflows end-to-end
- Making billing and M-Pesa payments reliable
- Keeping branch work organized
- Improving speed, security, and auditability
- Preparing for larger hospital usage
- Making the UI clean, fast, and easy to operate

---

## 🧭 Roadmap

- Advanced reporting and management dashboards
- Stronger audit and permission controls
- Patient portal foundation
- SMS/WhatsApp notification workflows
- Insurance/SHA workflow improvements
- Offline/degraded-mode planning
- Rust-powered heavy reporting engine foundation
- Load testing and high-availability deployment guides

---

## 🤝 Contributing

Contributions should keep the system safe, scoped, and hospital-ready.

Recommended flow:

```text
create branch → make changes → open pull request → review → merge
```

---

## ⭐ Support

If this project is useful, star the repository and share it with people building better healthcare systems.

---

## 📜 License

MIT License
