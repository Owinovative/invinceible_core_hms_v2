CREATE INDEX `patients_phonePrimary_idx` ON `patients`(`phonePrimary`);
CREATE INDEX `patients_createdAt_idx` ON `patients`(`createdAt`);
CREATE INDEX `patients_updatedAt_idx` ON `patients`(`updatedAt`);
CREATE INDEX `patients_facility_patientNumber_idx` ON `patients`(`facilityId`, `patientNumber`);
CREATE INDEX `patients_facility_phonePrimary_idx` ON `patients`(`facilityId`, `phonePrimary`);
CREATE INDEX `patients_facility_createdAt_idx` ON `patients`(`facilityId`, `createdAt`);

CREATE INDEX `appointments_createdAt_idx` ON `appointments`(`createdAt`);
CREATE INDEX `appointments_updatedAt_idx` ON `appointments`(`updatedAt`);
CREATE INDEX `appointments_appointmentDate_idx` ON `appointments`(`appointmentDate`);
CREATE INDEX `appointments_facility_branch_date_status_idx` ON `appointments`(`facilityId`, `branchId`, `appointmentDate`, `statusCode`);
CREATE INDEX `appointments_doctor_date_status_idx` ON `appointments`(`doctorId`, `appointmentDate`, `statusCode`);

CREATE INDEX `lab_orders_status_idx` ON `lab_orders`(`status`);
CREATE INDEX `lab_orders_createdAt_idx` ON `lab_orders`(`createdAt`);
CREATE INDEX `lab_orders_updatedAt_idx` ON `lab_orders`(`updatedAt`);
CREATE INDEX `lab_orders_facility_branch_status_created_idx` ON `lab_orders`(`facilityId`, `branchId`, `status`, `createdAt`);

CREATE INDEX `medicines_name_idx` ON `medicines`(`name`);
CREATE INDEX `medicines_isActive_idx` ON `medicines`(`isActive`);
CREATE INDEX `medicines_createdAt_idx` ON `medicines`(`createdAt`);
CREATE INDEX `medicines_updatedAt_idx` ON `medicines`(`updatedAt`);

CREATE INDEX `prescriptions_createdAt_idx` ON `prescriptions`(`createdAt`);
CREATE INDEX `prescriptions_updatedAt_idx` ON `prescriptions`(`updatedAt`);
CREATE INDEX `prescriptions_facility_branch_status_created_idx` ON `prescriptions`(`facilityId`, `branchId`, `statusCode`, `createdAt`);

CREATE INDEX `admissions_createdAt_idx` ON `admissions`(`createdAt`);
CREATE INDEX `admissions_updatedAt_idx` ON `admissions`(`updatedAt`);
CREATE INDEX `admissions_admittedAt_idx` ON `admissions`(`admittedAt`);
CREATE INDEX `admissions_facility_branch_status_created_idx` ON `admissions`(`facilityId`, `branchId`, `statusCode`, `createdAt`);

CREATE INDEX `invoices_createdAt_idx` ON `invoices`(`createdAt`);
CREATE INDEX `invoices_updatedAt_idx` ON `invoices`(`updatedAt`);
CREATE INDEX `invoices_issuedAt_idx` ON `invoices`(`issuedAt`);
CREATE INDEX `invoices_facility_branch_status_idx` ON `invoices`(`facilityId`, `branchId`, `statusCode`);
CREATE INDEX `invoices_facility_patient_idx` ON `invoices`(`facilityId`, `patientId`);
CREATE INDEX `invoices_facility_createdAt_idx` ON `invoices`(`facilityId`, `createdAt`);

CREATE INDEX `payments_merchantRequestId_idx` ON `payments`(`merchantRequestId`);
CREATE INDEX `payments_mpesaReceiptNumber_idx` ON `payments`(`mpesaReceiptNumber`);
CREATE INDEX `payments_createdAt_idx` ON `payments`(`createdAt`);
CREATE INDEX `payments_updatedAt_idx` ON `payments`(`updatedAt`);
CREATE INDEX `payments_requestedAt_idx` ON `payments`(`requestedAt`);
CREATE INDEX `payments_facility_branch_status_idx` ON `payments`(`facilityId`, `branchId`, `statusCode`);
CREATE INDEX `payments_invoice_status_idx` ON `payments`(`invoiceId`, `statusCode`);

CREATE INDEX `audit_logs_facility_branch_created_idx` ON `audit_logs`(`facilityId`, `branchId`, `createdAt`);
CREATE INDEX `audit_logs_actor_user_created_idx` ON `audit_logs`(`actorUserId`, `createdAt`);

CREATE INDEX `branch_stock_createdAt_idx` ON `branch_medicine_stocks`(`createdAt`);
CREATE INDEX `branch_stock_updatedAt_idx` ON `branch_medicine_stocks`(`updatedAt`);
