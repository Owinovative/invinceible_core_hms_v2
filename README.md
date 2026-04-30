# 🏥 Invinceible HMS

A modern, full-stack Hospital Management System built for real-world clinical workflows.

Designed with scalability, performance, and real hospital operations in mind — from patient registration to triage, doctor consultation, inpatient (IPD) management, lab workflows, pharmacy, and billing.

---

## 🚀 Why This Project?

Most hospital systems are either:
- outdated
- overly complex
- or not aligned with real clinical workflows

**Invinceible HMS** is different.

It is designed to mirror how hospitals actually work:

➡️ Reception → Triage → Doctor → Lab → Pharmacy → IPD → Billing

---

## ⚡ Core Features

### 🧾 Patient Management
- Patient registration & search
- Visit tracking
- Patient history overview

### 🩺 Smart Triage System
- Vital capture
- Pain scoring
- Priority classification (CRITICAL, EMERGENCY, URGENT, NORMAL)
- Clinic & doctor routing

### 👨‍⚕️ Doctor Queue
- Priority-based queue (not just FIFO)
- Sorted by severity + waiting time
- Filter by doctor / clinic / status

### 📋 Consultation Workspace
- Full patient overview
- Diagnosis & treatment plan
- Prescriptions
- Lab requests
- Admission & discharge

### 🏥 IPD (Inpatient Department)
- Admission management
- Bed allocation
- Clinical notes
- Lab integration
- Discharge workflow

### 🧪 Lab System
- Lab order creation
- Result entry
- Real-time result updates

### 💊 Pharmacy
- Prescription handling
- Medication dispensing
- Stock tracking

### 💰 Billing
- Invoice generation
- Payment tracking
- Service billing

### 🔐 Role-Based Access Control
- Super Admin
- Admin
- Doctor
- Nurse
- Receptionist
- Lab Technician
- Pharmacist
- And more

---

## 🏗️ Tech Stack

**Backend**
- NestJS
- Prisma ORM
- MySQL

**Frontend**
- Next.js
- React

---

## 📂 Project Structure (Simplified)

```
/backend   → API (NestJS)
/frontend  → UI (Next.js)
```

---

## ⚙️ Getting Started

### 1. Clone the repo
```
git clone https://github.com/Owinovative/invinceible_core_hms_v2.git
```

### 2. Install dependencies

Backend:
```
cd backend
npm install
```

Frontend:
```
cd frontend
npm install
```

### 3. Setup environment

Create `.env` files for backend and frontend.

### 4. Run the app

Backend:
```
npm run start:dev
```

Frontend:
```
npm run dev
```

---

## 🌍 Vision

To build a powerful, scalable, and modern hospital management platform that can be used in real healthcare environments globally.

---

## 🤝 Contributing

Contributions are welcome.

- Fork the repo
- Create a feature branch
- Submit a pull request

---

## ⭐ Support

If you find this project useful:

👉 Star the repo
👉 Share it with others

---

## 📜 License

MIT License
