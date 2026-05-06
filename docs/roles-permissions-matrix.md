# Roles And Permissions Matrix

The backend now has a central permission map in `backend/src/auth/permissions.ts` and a `PermissionsGuard` for new guarded routes.

## Permission categories

- `patient.read`, `patient.write`
- `billing.read`, `billing.write`
- `payment.collect`, `payment.manual_confirm`
- `mpesa.settings.update`
- `lab.order`, `lab.result.enter`, `lab.result.verify`
- `pharmacy.dispense`, `stock.adjust`
- `consultation.write`
- `admission.manage`, `discharge.complete`
- `reports.read`, `audit.read`
- `users.manage`, `facility.manage`
- `patient.portal.read`

## Critical restrictions

- Cashiers collect payments but cannot change M-Pesa credentials.
- Lab technicians enter results but cannot discharge patients.
- Pharmacists dispense medicines but cannot manually confirm payments.
- Facility admins manage only their facility.
- Super admins manage platform-wide settings.
- Patients only access their own portal data.

Existing role checks stay intact. The permission foundation is incremental so older routes are not broken.
