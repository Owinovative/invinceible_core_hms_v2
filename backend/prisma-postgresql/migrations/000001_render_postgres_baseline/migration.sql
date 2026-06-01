-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "facilities" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "branchCode" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "facilityType" VARCHAR(100),
    "county" VARCHAR(120),
    "town" VARCHAR(120),
    "country" VARCHAR(120),
    "phone" VARCHAR(50),
    "altPhone" VARCHAR(50),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "address" VARCHAR(255),
    "postalAddress" VARCHAR(255),
    "registrationNo" VARCHAR(100),
    "taxPin" VARCHAR(100),
    "licenseNumber" VARCHAR(100),
    "logoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "mapLocationLabel" VARCHAR(255),
    "googleMapsUrl" VARCHAR(500),
    "timezone" VARCHAR(100),
    "currency" VARCHAR(20),
    "mpesaShortcode" VARCHAR(50),
    "mpesaPaybill" VARCHAR(50),
    "mpesaAccountNumber" VARCHAR(80),
    "mpesaTillNumber" VARCHAR(50),
    "mpesaPochiNumber" VARCHAR(80),
    "mpesaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mpesaEnvironment" VARCHAR(30),
    "mpesaConsumerKey" TEXT,
    "mpesaConsumerSecret" TEXT,
    "mpesaPasskey" TEXT,
    "mpesaCallbackUrl" VARCHAR(500),
    "mpesaTransactionType" VARCHAR(80),
    "showCashOnInvoice" BOOLEAN NOT NULL DEFAULT true,
    "showPaybillOnInvoice" BOOLEAN NOT NULL DEFAULT true,
    "showTillOnInvoice" BOOLEAN NOT NULL DEFAULT true,
    "showPochiOnInvoice" BOOLEAN NOT NULL DEFAULT true,
    "shaFidCode" VARCHAR(120),
    "shaClaimStartNumber" INTEGER NOT NULL DEFAULT 1,
    "shaClaimNextNumber" INTEGER NOT NULL DEFAULT 1,
    "subscriptionMonthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "subscriptionStartedAt" TIMESTAMP(3),
    "subscriptionPaidThrough" TIMESTAMP(3),
    "subscriptionStatus" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "subscriptionLockedAt" TIMESTAMP(3),
    "complianceStatus" VARCHAR(50) NOT NULL DEFAULT 'COMPLIANT',
    "complianceReason" TEXT,
    "complianceDeactivatedAt" TIMESTAMP(3),
    "complianceGraceEndsAt" TIMESTAMP(3),
    "complianceReactivatedAt" TIMESTAMP(3),
    "isHeadOffice" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "county" VARCHAR(120),
    "town" VARCHAR(120),
    "country" VARCHAR(120),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" VARCHAR(255),
    "postalAddress" VARCHAR(255),
    "timezone" VARCHAR(100),
    "currency" VARCHAR(20),
    "mpesaShortcode" VARCHAR(50),
    "mpesaPaybill" VARCHAR(50),
    "mpesaAccountNumber" VARCHAR(80),
    "mpesaTillNumber" VARCHAR(50),
    "mpesaPochiNumber" VARCHAR(80),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "mapLocationLabel" VARCHAR(255),
    "googleMapsUrl" VARCHAR(500),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(150),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lockReason" VARCHAR(255),
    "pendingDeactivationAt" TIMESTAMP(3),
    "pendingDeactivationRequestedById" INTEGER,
    "pendingDeactivationReason" VARCHAR(255),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "canAccessAllBranchesInFacility" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" INTEGER NOT NULL,
    "homeFacilityId" INTEGER,
    "homeBranchId" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_branch_access" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_branch_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" SERIAL NOT NULL,
    "staffCode" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "gender" VARCHAR(20),
    "designation" VARCHAR(150),
    "nationalIdNumber" VARCHAR(80),
    "nationalIdImageUrl" TEXT,
    "passportPhotoUrl" TEXT,
    "clinicianRegistrationNumber" VARCHAR(120),
    "clinicianBoard" VARCHAR(160),
    "isClinician" BOOLEAN NOT NULL DEFAULT false,
    "isPrescriber" BOOLEAN NOT NULL DEFAULT false,
    "canLogin" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "departmentId" INTEGER,
    "roleId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" SERIAL NOT NULL,
    "patientNumber" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "gender" VARCHAR(20),
    "dateOfBirth" TIMESTAMP(3),
    "phonePrimary" VARCHAR(30),
    "phoneSecondary" VARCHAR(30),
    "email" VARCHAR(255),
    "occupation" VARCHAR(120),
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "portalUserId" INTEGER,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "clinicType" VARCHAR(50) NOT NULL,
    "roomLocation" VARCHAR(150),
    "phoneExtension" VARCHAR(30),
    "consultationMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxDailyCapacity" INTEGER NOT NULL DEFAULT 20,
    "serviceStartTime" VARCHAR(20),
    "serviceEndTime" VARCHAR(20),
    "isWalkInAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isReferralRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "appointmentNumber" VARCHAR(50) NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "startTime" VARCHAR(20),
    "endTime" VARCHAR(20),
    "visitReason" TEXT,
    "statusCode" VARCHAR(50) NOT NULL,
    "triagePriority" VARCHAR(30),
    "checkedInAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER,
    "clinicId" INTEGER,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_records" (
    "id" SERIAL NOT NULL,
    "triageNumber" VARCHAR(50) NOT NULL,
    "arrivalType" VARCHAR(30),
    "chiefComplaint" TEXT,
    "temperatureC" DOUBLE PRECISION,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "painScore" INTEGER,
    "triagePriority" VARCHAR(30),
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'WAITING_TRIAGE',
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "patientId" INTEGER NOT NULL,
    "clinicId" INTEGER,
    "appointmentId" INTEGER,
    "performedByStaffId" INTEGER,
    "routedDoctorId" INTEGER,

    CONSTRAINT "triage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" SERIAL NOT NULL,
    "consultationNumber" VARCHAR(50) NOT NULL,
    "chiefComplaint" TEXT,
    "historyOfPresenting" TEXT,
    "examinationFindings" TEXT,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "notes" TEXT,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "appointmentId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_catalog" (
    "id" SERIAL NOT NULL,
    "testName" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100),
    "specimenType" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_test_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" SERIAL NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "clinicalNotes" TEXT,
    "urgency" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "patientId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "admissionId" INTEGER,
    "encounterRef" VARCHAR(100),
    "requestedByStaffId" INTEGER,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_order_items" (
    "id" SERIAL NOT NULL,
    "instructions" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" INTEGER NOT NULL,
    "testId" INTEGER NOT NULL,

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" SERIAL NOT NULL,
    "resultValue" TEXT NOT NULL,
    "remarks" TEXT,
    "attachmentFileName" VARCHAR(255),
    "attachmentMimeType" VARCHAR(120),
    "attachmentDataUrl" TEXT,
    "recordedBy" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderItemId" INTEGER NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "dosageForm" VARCHAR(100),
    "strength" VARCHAR(100),
    "manufacturer" VARCHAR(150),
    "unitPrice" DOUBLE PRECISION DEFAULT 0,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" SERIAL NOT NULL,
    "prescriptionNumber" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'PRESCRIBED',
    "prescribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispensedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "consultationId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "prescribedByStaffId" INTEGER NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" SERIAL NOT NULL,
    "dosage" VARCHAR(100),
    "route" VARCHAR(100),
    "frequency" VARCHAR(100),
    "duration" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "instructions" TEXT,
    "medicineNameSnapshot" VARCHAR(180),
    "stockStatusAtPrescribing" VARCHAR(50),
    "acceptedAlternativeForMedicineId" INTEGER,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'PRESCRIBED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prescriptionId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispenses" (
    "id" SERIAL NOT NULL,
    "dispenseNumber" VARCHAR(50) NOT NULL,
    "prescriptionId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "dispensedByStaffId" INTEGER,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'DISPENSED',
    "notes" TEXT,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispense_items" (
    "id" SERIAL NOT NULL,
    "dispenseId" INTEGER NOT NULL,
    "prescriptionItemId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "quantityPrescribed" INTEGER NOT NULL DEFAULT 0,
    "quantityDispensed" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "wardType" VARCHAR(100),
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "facilityId" INTEGER,
    "branchId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" SERIAL NOT NULL,
    "bedNumber" VARCHAR(50) NOT NULL,
    "bedLabel" VARCHAR(100),
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    "facilityId" INTEGER,
    "branchId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wardId" INTEGER NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" SERIAL NOT NULL,
    "admissionNumber" VARCHAR(50) NOT NULL,
    "admissionReason" TEXT,
    "admissionSource" VARCHAR(100),
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'ADMITTED',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "expectedDischargeAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "patientId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "consultationId" INTEGER,
    "admittedByStaffId" INTEGER,
    "wardId" INTEGER NOT NULL,
    "bedId" INTEGER,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_progress_notes" (
    "id" SERIAL NOT NULL,
    "noteType" VARCHAR(100),
    "noteText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "admissionId" INTEGER NOT NULL,
    "recordedByStaffId" INTEGER,

    CONSTRAINT "ipd_progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_vital_records" (
    "id" SERIAL NOT NULL,
    "admissionId" INTEGER NOT NULL,
    "recordedByStaffId" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperatureC" DOUBLE PRECISION,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "painScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_vital_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_doctor_reviews" (
    "id" SERIAL NOT NULL,
    "admissionId" INTEGER NOT NULL,
    "reviewedByStaffId" INTEGER,
    "reviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_doctor_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_chart_entries" (
    "id" SERIAL NOT NULL,
    "treatmentType" VARCHAR(100),
    "treatmentName" VARCHAR(150) NOT NULL,
    "dosage" VARCHAR(100),
    "route" VARCHAR(100),
    "frequency" VARCHAR(100),
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3),
    "administeredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "admissionId" INTEGER NOT NULL,
    "orderedByStaffId" INTEGER,
    "administeredByStaffId" INTEGER,

    CONSTRAINT "treatment_chart_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_discharge_summaries" (
    "id" SERIAL NOT NULL,
    "admissionId" INTEGER NOT NULL,
    "dischargeDiagnosis" TEXT NOT NULL,
    "hospitalCourse" TEXT NOT NULL,
    "conditionOnDischarge" TEXT NOT NULL,
    "dischargeMedications" TEXT,
    "followUpInstructions" TEXT,
    "dischargedByStaffId" INTEGER,
    "dischargeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_discharge_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_services" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100),
    "defaultPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tariffs" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "billingServiceId" INTEGER,
    "labTestId" INTEGER,
    "wardId" INTEGER,
    "bedId" INTEGER,

    CONSTRAINT "service_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "patientId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "consultationId" INTEGER,
    "admissionId" INTEGER,
    "createdByStaffId" INTEGER,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" SERIAL NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'BILLED',
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),
    "removedReason" TEXT,
    "sourceModule" VARCHAR(100),
    "sourceEntityType" VARCHAR(100),
    "sourceEntityId" VARCHAR(100),
    "updatedByStaffId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "billingServiceId" INTEGER,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "receiptNumber" VARCHAR(50) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "phoneNumber" VARCHAR(30),
    "transactionRef" VARCHAR(100),
    "mpesaReceiptNumber" VARCHAR(100),
    "merchantRequestId" VARCHAR(100),
    "checkoutRequestId" VARCHAR(100),
    "callbackPayload" TEXT,
    "paidAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "invoiceId" INTEGER NOT NULL,
    "shaClaimId" INTEGER,
    "receivedByStaffId" INTEGER,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" VARCHAR(120) NOT NULL,
    "userId" INTEGER NOT NULL,
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" VARCHAR(255),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reviews" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sha_claims" (
    "id" SERIAL NOT NULL,
    "claimNumber" VARCHAR(80) NOT NULL,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "fidCode" VARCHAR(120),
    "memberNumber" VARCHAR(120),
    "diagnosisCode" VARCHAR(80),
    "diagnosisText" VARCHAR(255),
    "servicePeriodStart" TIMESTAMP(3),
    "servicePeriodEnd" TIMESTAMP(3),
    "claimedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "patientSignatureUrl" TEXT,
    "facilitySignatureUrl" TEXT,
    "rubberStampUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "patientId" INTEGER NOT NULL,
    "invoiceId" INTEGER,
    "createdByStaffId" INTEGER,

    CONSTRAINT "sha_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feedback" (
    "id" SERIAL NOT NULL,
    "subject" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER,
    "branchId" INTEGER,
    "createdByUserId" INTEGER,
    "createdByStaffId" INTEGER,
    "repliedByUserId" INTEGER,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_subscription_payments" (
    "id" SERIAL NOT NULL,
    "paymentNumber" VARCHAR(80) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "monthsCovered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidFrom" TIMESTAMP(3),
    "paidThrough" TIMESTAMP(3),
    "paymentMethod" VARCHAR(50),
    "reference" VARCHAR(120),
    "notes" TEXT,
    "recordedByUserId" INTEGER,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "moduleName" VARCHAR(100) NOT NULL,
    "actionName" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100),
    "entityId" VARCHAR(100),
    "description" TEXT,
    "facilityId" INTEGER,
    "branchId" INTEGER,
    "actorUserId" INTEGER,
    "actorStaffId" INTEGER,
    "beforeData" TEXT,
    "afterData" TEXT,
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_geolocation_cache" (
    "id" SERIAL NOT NULL,
    "ipAddress" VARCHAR(100) NOT NULL,
    "country" VARCHAR(120),
    "region" VARCHAR(120),
    "city" VARCHAR(120),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isp" VARCHAR(255),
    "org" VARCHAR(255),
    "timezone" VARCHAR(120),
    "confidence" DOUBLE PRECISION,
    "source" VARCHAR(80),
    "rawResponse" JSONB,
    "lastLookedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_geolocation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_location_profiles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "sessionId" VARCHAR(120) NOT NULL,
    "sessionVersion" INTEGER,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "loginAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedOutAt" TIMESTAMP(3),
    "lastRoute" VARCHAR(500),
    "lastMethod" VARCHAR(10),
    "lastStatusCode" INTEGER,
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,
    "country" VARCHAR(120),
    "region" VARCHAR(120),
    "city" VARCHAR(120),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "isp" VARCHAR(255),
    "org" VARCHAR(255),
    "timezone" VARCHAR(120),
    "confidence" DOUBLE PRECISION,
    "geolocationSource" VARCHAR(80),
    "deviceType" VARCHAR(80),
    "browser" VARCHAR(120),
    "operatingSystem" VARCHAR(120),
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_location_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_location_events" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "sessionId" VARCHAR(120) NOT NULL,
    "eventType" VARCHAR(40) NOT NULL DEFAULT 'REQUEST',
    "route" VARCHAR(500),
    "method" VARCHAR(10),
    "statusCode" INTEGER,
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,
    "country" VARCHAR(120),
    "region" VARCHAR(120),
    "city" VARCHAR(120),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "isp" VARCHAR(255),
    "org" VARCHAR(255),
    "timezone" VARCHAR(120),
    "confidence" DOUBLE PRECISION,
    "geolocationSource" VARCHAR(80),
    "deviceType" VARCHAR(80),
    "browser" VARCHAR(120),
    "operatingSystem" VARCHAR(120),
    "rawSnapshot" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_location_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "settingKey" VARCHAR(100) NOT NULL,
    "settingValue" TEXT NOT NULL,
    "valueType" VARCHAR(50),
    "category" VARCHAR(100),
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "notificationType" VARCHAR(50),
    "severity" VARCHAR(20),
    "moduleName" VARCHAR(100),
    "entityType" VARCHAR(100),
    "entityId" VARCHAR(100),
    "facilityId" INTEGER,
    "branchId" INTEGER,
    "targetUserId" INTEGER,
    "targetStaffId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" INTEGER,
    "resolvedByStaffId" INTEGER,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_medicine_stocks" (
    "id" SERIAL NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "buyingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_medicine_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_module_records" (
    "id" SERIAL NOT NULL,
    "moduleSlug" VARCHAR(80) NOT NULL,
    "moduleTitle" VARCHAR(150) NOT NULL,
    "recordNumber" VARCHAR(80) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "workflowStage" VARCHAR(100) NOT NULL,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "priorityCode" VARCHAR(50) NOT NULL DEFAULT 'ROUTINE',
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "patientId" INTEGER,
    "assignedStaffId" INTEGER,
    "createdByUserId" INTEGER,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_module_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_outbox_events" (
    "id" SERIAL NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "facilityId" INTEGER,
    "branchId" INTEGER,
    "payload" JSONB,
    "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "data_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facilities_code_key" ON "facilities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_branchCode_key" ON "facilities"("branchCode");

-- CreateIndex
CREATE INDEX "facilities_latitude_longitude_idx" ON "facilities"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "facilities_complianceStatus_idx" ON "facilities"("complianceStatus");

-- CreateIndex
CREATE INDEX "facilities_complianceGraceEndsAt_idx" ON "facilities"("complianceGraceEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE INDEX "branches_facilityId_idx" ON "branches"("facilityId");

-- CreateIndex
CREATE INDEX "branches_latitude_longitude_idx" ON "branches"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_facilityId_idx" ON "departments"("facilityId");

-- CreateIndex
CREATE INDEX "departments_branchId_idx" ON "departments"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_homeFacilityId_idx" ON "users"("homeFacilityId");

-- CreateIndex
CREATE INDEX "users_homeBranchId_idx" ON "users"("homeBranchId");

-- CreateIndex
CREATE INDEX "users_lockedAt_idx" ON "users"("lockedAt");

-- CreateIndex
CREATE INDEX "users_pendingDeactivationAt_idx" ON "users"("pendingDeactivationAt");

-- CreateIndex
CREATE INDEX "user_branch_access_userId_idx" ON "user_branch_access"("userId");

-- CreateIndex
CREATE INDEX "user_branch_access_facilityId_idx" ON "user_branch_access"("facilityId");

-- CreateIndex
CREATE INDEX "user_branch_access_branchId_idx" ON "user_branch_access"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "user_branch_access_userId_branchId_key" ON "user_branch_access"("userId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_staffCode_key" ON "staff_members"("staffCode");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_email_key" ON "staff_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_userId_key" ON "staff_members"("userId");

-- CreateIndex
CREATE INDEX "staff_members_facilityId_idx" ON "staff_members"("facilityId");

-- CreateIndex
CREATE INDEX "staff_members_branchId_idx" ON "staff_members"("branchId");

-- CreateIndex
CREATE INDEX "staff_members_departmentId_idx" ON "staff_members"("departmentId");

-- CreateIndex
CREATE INDEX "staff_members_roleId_idx" ON "staff_members"("roleId");

-- CreateIndex
CREATE INDEX "staff_members_nationalIdNumber_idx" ON "staff_members"("nationalIdNumber");

-- CreateIndex
CREATE INDEX "staff_members_clinicianBoard_idx" ON "staff_members"("clinicianBoard");

-- CreateIndex
CREATE UNIQUE INDEX "patients_patientNumber_key" ON "patients"("patientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "patients_portalUserId_key" ON "patients"("portalUserId");

-- CreateIndex
CREATE INDEX "patients_facilityId_idx" ON "patients"("facilityId");

-- CreateIndex
CREATE INDEX "patients_phonePrimary_idx" ON "patients"("phonePrimary");

-- CreateIndex
CREATE INDEX "patients_createdAt_idx" ON "patients"("createdAt");

-- CreateIndex
CREATE INDEX "patients_updatedAt_idx" ON "patients"("updatedAt");

-- CreateIndex
CREATE INDEX "patients_portalUserId_idx" ON "patients"("portalUserId");

-- CreateIndex
CREATE INDEX "patients_facilityId_patientNumber_idx" ON "patients"("facilityId", "patientNumber");

-- CreateIndex
CREATE INDEX "patients_facilityId_phonePrimary_idx" ON "patients"("facilityId", "phonePrimary");

-- CreateIndex
CREATE INDEX "patients_facilityId_createdAt_idx" ON "patients"("facilityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_code_key" ON "clinics"("code");

-- CreateIndex
CREATE INDEX "clinics_facilityId_idx" ON "clinics"("facilityId");

-- CreateIndex
CREATE INDEX "clinics_branchId_idx" ON "clinics"("branchId");

-- CreateIndex
CREATE INDEX "clinics_departmentId_idx" ON "clinics"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE INDEX "appointments_facilityId_idx" ON "appointments"("facilityId");

-- CreateIndex
CREATE INDEX "appointments_branchId_idx" ON "appointments"("branchId");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_doctorId_idx" ON "appointments"("doctorId");

-- CreateIndex
CREATE INDEX "appointments_clinicId_idx" ON "appointments"("clinicId");

-- CreateIndex
CREATE INDEX "appointments_statusCode_idx" ON "appointments"("statusCode");

-- CreateIndex
CREATE INDEX "appointments_createdAt_idx" ON "appointments"("createdAt");

-- CreateIndex
CREATE INDEX "appointments_updatedAt_idx" ON "appointments"("updatedAt");

-- CreateIndex
CREATE INDEX "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_facilityId_branchId_appointmentDate_statusCode_idx" ON "appointments"("facilityId", "branchId", "appointmentDate", "statusCode");

-- CreateIndex
CREATE INDEX "appointments_doctorId_appointmentDate_statusCode_idx" ON "appointments"("doctorId", "appointmentDate", "statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "triage_records_triageNumber_key" ON "triage_records"("triageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "triage_records_appointmentId_key" ON "triage_records"("appointmentId");

-- CreateIndex
CREATE INDEX "triage_records_facilityId_idx" ON "triage_records"("facilityId");

-- CreateIndex
CREATE INDEX "triage_records_branchId_idx" ON "triage_records"("branchId");

-- CreateIndex
CREATE INDEX "triage_records_patientId_idx" ON "triage_records"("patientId");

-- CreateIndex
CREATE INDEX "triage_records_clinicId_idx" ON "triage_records"("clinicId");

-- CreateIndex
CREATE INDEX "triage_records_appointmentId_idx" ON "triage_records"("appointmentId");

-- CreateIndex
CREATE INDEX "triage_records_performedByStaffId_idx" ON "triage_records"("performedByStaffId");

-- CreateIndex
CREATE INDEX "triage_records_routedDoctorId_idx" ON "triage_records"("routedDoctorId");

-- CreateIndex
CREATE INDEX "triage_records_statusCode_idx" ON "triage_records"("statusCode");

-- CreateIndex
CREATE INDEX "triage_records_triagePriority_idx" ON "triage_records"("triagePriority");

-- CreateIndex
CREATE INDEX "triage_records_arrivedAt_idx" ON "triage_records"("arrivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_consultationNumber_key" ON "consultations"("consultationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_appointmentId_key" ON "consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "consultations_facilityId_idx" ON "consultations"("facilityId");

-- CreateIndex
CREATE INDEX "consultations_branchId_idx" ON "consultations"("branchId");

-- CreateIndex
CREATE INDEX "consultations_patientId_idx" ON "consultations"("patientId");

-- CreateIndex
CREATE INDEX "consultations_doctorId_idx" ON "consultations"("doctorId");

-- CreateIndex
CREATE INDEX "consultations_statusCode_idx" ON "consultations"("statusCode");

-- CreateIndex
CREATE INDEX "consultations_createdAt_idx" ON "consultations"("createdAt");

-- CreateIndex
CREATE INDEX "consultations_updatedAt_idx" ON "consultations"("updatedAt");

-- CreateIndex
CREATE INDEX "consultations_facilityId_branchId_statusCode_startedAt_idx" ON "consultations"("facilityId", "branchId", "statusCode", "startedAt");

-- CreateIndex
CREATE INDEX "consultations_doctorId_statusCode_startedAt_idx" ON "consultations"("doctorId", "statusCode", "startedAt");

-- CreateIndex
CREATE INDEX "lab_test_catalog_testName_idx" ON "lab_test_catalog"("testName");

-- CreateIndex
CREATE INDEX "lab_test_catalog_category_idx" ON "lab_test_catalog"("category");

-- CreateIndex
CREATE INDEX "lab_test_catalog_isActive_idx" ON "lab_test_catalog"("isActive");

-- CreateIndex
CREATE INDEX "lab_test_catalog_createdAt_idx" ON "lab_test_catalog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_orderNumber_key" ON "lab_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "lab_orders_facilityId_idx" ON "lab_orders"("facilityId");

-- CreateIndex
CREATE INDEX "lab_orders_branchId_idx" ON "lab_orders"("branchId");

-- CreateIndex
CREATE INDEX "lab_orders_patientId_idx" ON "lab_orders"("patientId");

-- CreateIndex
CREATE INDEX "lab_orders_appointmentId_idx" ON "lab_orders"("appointmentId");

-- CreateIndex
CREATE INDEX "lab_orders_admissionId_idx" ON "lab_orders"("admissionId");

-- CreateIndex
CREATE INDEX "lab_orders_requestedByStaffId_idx" ON "lab_orders"("requestedByStaffId");

-- CreateIndex
CREATE INDEX "lab_orders_status_idx" ON "lab_orders"("status");

-- CreateIndex
CREATE INDEX "lab_orders_createdAt_idx" ON "lab_orders"("createdAt");

-- CreateIndex
CREATE INDEX "lab_orders_updatedAt_idx" ON "lab_orders"("updatedAt");

-- CreateIndex
CREATE INDEX "lab_orders_facilityId_branchId_status_createdAt_idx" ON "lab_orders"("facilityId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "lab_order_items_orderId_idx" ON "lab_order_items"("orderId");

-- CreateIndex
CREATE INDEX "lab_order_items_testId_idx" ON "lab_order_items"("testId");

-- CreateIndex
CREATE INDEX "lab_results_orderItemId_idx" ON "lab_results"("orderItemId");

-- CreateIndex
CREATE INDEX "lab_results_recordedAt_idx" ON "lab_results"("recordedAt");

-- CreateIndex
CREATE INDEX "lab_results_recordedBy_idx" ON "lab_results"("recordedBy");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_code_key" ON "medicines"("code");

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_isActive_idx" ON "medicines"("isActive");

-- CreateIndex
CREATE INDEX "medicines_createdAt_idx" ON "medicines"("createdAt");

-- CreateIndex
CREATE INDEX "medicines_updatedAt_idx" ON "medicines"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescriptionNumber_key" ON "prescriptions"("prescriptionNumber");

-- CreateIndex
CREATE INDEX "prescriptions_facilityId_idx" ON "prescriptions"("facilityId");

-- CreateIndex
CREATE INDEX "prescriptions_branchId_idx" ON "prescriptions"("branchId");

-- CreateIndex
CREATE INDEX "prescriptions_consultationId_idx" ON "prescriptions"("consultationId");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_prescribedByStaffId_idx" ON "prescriptions"("prescribedByStaffId");

-- CreateIndex
CREATE INDEX "prescriptions_statusCode_idx" ON "prescriptions"("statusCode");

-- CreateIndex
CREATE INDEX "prescriptions_createdAt_idx" ON "prescriptions"("createdAt");

-- CreateIndex
CREATE INDEX "prescriptions_updatedAt_idx" ON "prescriptions"("updatedAt");

-- CreateIndex
CREATE INDEX "prescriptions_facilityId_branchId_statusCode_createdAt_idx" ON "prescriptions"("facilityId", "branchId", "statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "prescription_items_prescriptionId_idx" ON "prescription_items"("prescriptionId");

-- CreateIndex
CREATE INDEX "prescription_items_medicineId_idx" ON "prescription_items"("medicineId");

-- CreateIndex
CREATE INDEX "prescription_items_acceptedAlternativeForMedicineId_idx" ON "prescription_items"("acceptedAlternativeForMedicineId");

-- CreateIndex
CREATE INDEX "prescription_items_statusCode_idx" ON "prescription_items"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "dispenses_dispenseNumber_key" ON "dispenses"("dispenseNumber");

-- CreateIndex
CREATE INDEX "dispenses_prescriptionId_idx" ON "dispenses"("prescriptionId");

-- CreateIndex
CREATE INDEX "dispenses_patientId_idx" ON "dispenses"("patientId");

-- CreateIndex
CREATE INDEX "dispenses_facilityId_idx" ON "dispenses"("facilityId");

-- CreateIndex
CREATE INDEX "dispenses_branchId_idx" ON "dispenses"("branchId");

-- CreateIndex
CREATE INDEX "dispenses_dispensedByStaffId_idx" ON "dispenses"("dispensedByStaffId");

-- CreateIndex
CREATE INDEX "dispenses_dispensedAt_idx" ON "dispenses"("dispensedAt");

-- CreateIndex
CREATE INDEX "dispense_items_dispenseId_idx" ON "dispense_items"("dispenseId");

-- CreateIndex
CREATE INDEX "dispense_items_prescriptionItemId_idx" ON "dispense_items"("prescriptionItemId");

-- CreateIndex
CREATE INDEX "dispense_items_medicineId_idx" ON "dispense_items"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "wards_code_key" ON "wards"("code");

-- CreateIndex
CREATE INDEX "wards_facilityId_idx" ON "wards"("facilityId");

-- CreateIndex
CREATE INDEX "wards_branchId_idx" ON "wards"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "beds_bedNumber_key" ON "beds"("bedNumber");

-- CreateIndex
CREATE INDEX "beds_wardId_idx" ON "beds"("wardId");

-- CreateIndex
CREATE INDEX "beds_facilityId_idx" ON "beds"("facilityId");

-- CreateIndex
CREATE INDEX "beds_branchId_idx" ON "beds"("branchId");

-- CreateIndex
CREATE INDEX "beds_statusCode_idx" ON "beds"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_admissionNumber_key" ON "admissions"("admissionNumber");

-- CreateIndex
CREATE INDEX "admissions_facilityId_idx" ON "admissions"("facilityId");

-- CreateIndex
CREATE INDEX "admissions_branchId_idx" ON "admissions"("branchId");

-- CreateIndex
CREATE INDEX "admissions_patientId_idx" ON "admissions"("patientId");

-- CreateIndex
CREATE INDEX "admissions_appointmentId_idx" ON "admissions"("appointmentId");

-- CreateIndex
CREATE INDEX "admissions_consultationId_idx" ON "admissions"("consultationId");

-- CreateIndex
CREATE INDEX "admissions_admittedByStaffId_idx" ON "admissions"("admittedByStaffId");

-- CreateIndex
CREATE INDEX "admissions_wardId_idx" ON "admissions"("wardId");

-- CreateIndex
CREATE INDEX "admissions_bedId_idx" ON "admissions"("bedId");

-- CreateIndex
CREATE INDEX "admissions_statusCode_idx" ON "admissions"("statusCode");

-- CreateIndex
CREATE INDEX "admissions_createdAt_idx" ON "admissions"("createdAt");

-- CreateIndex
CREATE INDEX "admissions_updatedAt_idx" ON "admissions"("updatedAt");

-- CreateIndex
CREATE INDEX "admissions_admittedAt_idx" ON "admissions"("admittedAt");

-- CreateIndex
CREATE INDEX "admissions_facilityId_branchId_statusCode_createdAt_idx" ON "admissions"("facilityId", "branchId", "statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "ipd_progress_notes_admissionId_idx" ON "ipd_progress_notes"("admissionId");

-- CreateIndex
CREATE INDEX "ipd_progress_notes_recordedByStaffId_idx" ON "ipd_progress_notes"("recordedByStaffId");

-- CreateIndex
CREATE INDEX "ipd_vital_records_admissionId_idx" ON "ipd_vital_records"("admissionId");

-- CreateIndex
CREATE INDEX "ipd_vital_records_recordedByStaffId_idx" ON "ipd_vital_records"("recordedByStaffId");

-- CreateIndex
CREATE INDEX "ipd_vital_records_recordedAt_idx" ON "ipd_vital_records"("recordedAt");

-- CreateIndex
CREATE INDEX "ipd_doctor_reviews_admissionId_idx" ON "ipd_doctor_reviews"("admissionId");

-- CreateIndex
CREATE INDEX "ipd_doctor_reviews_reviewedByStaffId_idx" ON "ipd_doctor_reviews"("reviewedByStaffId");

-- CreateIndex
CREATE INDEX "ipd_doctor_reviews_reviewDate_idx" ON "ipd_doctor_reviews"("reviewDate");

-- CreateIndex
CREATE INDEX "treatment_chart_entries_admissionId_idx" ON "treatment_chart_entries"("admissionId");

-- CreateIndex
CREATE INDEX "treatment_chart_entries_orderedByStaffId_idx" ON "treatment_chart_entries"("orderedByStaffId");

-- CreateIndex
CREATE INDEX "treatment_chart_entries_administeredByStaffId_idx" ON "treatment_chart_entries"("administeredByStaffId");

-- CreateIndex
CREATE INDEX "treatment_chart_entries_statusCode_idx" ON "treatment_chart_entries"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "ipd_discharge_summaries_admissionId_key" ON "ipd_discharge_summaries"("admissionId");

-- CreateIndex
CREATE INDEX "ipd_discharge_summaries_dischargedByStaffId_idx" ON "ipd_discharge_summaries"("dischargedByStaffId");

-- CreateIndex
CREATE INDEX "ipd_discharge_summaries_dischargeDate_idx" ON "ipd_discharge_summaries"("dischargeDate");

-- CreateIndex
CREATE UNIQUE INDEX "billing_services_code_key" ON "billing_services"("code");

-- CreateIndex
CREATE INDEX "billing_services_name_idx" ON "billing_services"("name");

-- CreateIndex
CREATE INDEX "billing_services_category_idx" ON "billing_services"("category");

-- CreateIndex
CREATE INDEX "billing_services_isActive_idx" ON "billing_services"("isActive");

-- CreateIndex
CREATE INDEX "billing_services_createdAt_idx" ON "billing_services"("createdAt");

-- CreateIndex
CREATE INDEX "billing_services_updatedAt_idx" ON "billing_services"("updatedAt");

-- CreateIndex
CREATE INDEX "service_tariffs_facilityId_idx" ON "service_tariffs"("facilityId");

-- CreateIndex
CREATE INDEX "service_tariffs_branchId_idx" ON "service_tariffs"("branchId");

-- CreateIndex
CREATE INDEX "service_tariffs_category_idx" ON "service_tariffs"("category");

-- CreateIndex
CREATE INDEX "service_tariffs_code_idx" ON "service_tariffs"("code");

-- CreateIndex
CREATE INDEX "service_tariffs_name_idx" ON "service_tariffs"("name");

-- CreateIndex
CREATE INDEX "service_tariffs_isActive_idx" ON "service_tariffs"("isActive");

-- CreateIndex
CREATE INDEX "service_tariffs_createdAt_idx" ON "service_tariffs"("createdAt");

-- CreateIndex
CREATE INDEX "service_tariffs_updatedAt_idx" ON "service_tariffs"("updatedAt");

-- CreateIndex
CREATE INDEX "service_tariffs_billingServiceId_idx" ON "service_tariffs"("billingServiceId");

-- CreateIndex
CREATE INDEX "service_tariffs_labTestId_idx" ON "service_tariffs"("labTestId");

-- CreateIndex
CREATE INDEX "service_tariffs_wardId_idx" ON "service_tariffs"("wardId");

-- CreateIndex
CREATE INDEX "service_tariffs_bedId_idx" ON "service_tariffs"("bedId");

-- CreateIndex
CREATE INDEX "service_tariffs_facilityId_branchId_category_name_idx" ON "service_tariffs"("facilityId", "branchId", "category", "name");

-- CreateIndex
CREATE INDEX "service_tariffs_facilityId_branchId_isActive_idx" ON "service_tariffs"("facilityId", "branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_facilityId_idx" ON "invoices"("facilityId");

-- CreateIndex
CREATE INDEX "invoices_branchId_idx" ON "invoices"("branchId");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_appointmentId_idx" ON "invoices"("appointmentId");

-- CreateIndex
CREATE INDEX "invoices_consultationId_idx" ON "invoices"("consultationId");

-- CreateIndex
CREATE INDEX "invoices_admissionId_idx" ON "invoices"("admissionId");

-- CreateIndex
CREATE INDEX "invoices_createdByStaffId_idx" ON "invoices"("createdByStaffId");

-- CreateIndex
CREATE INDEX "invoices_statusCode_idx" ON "invoices"("statusCode");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE INDEX "invoices_updatedAt_idx" ON "invoices"("updatedAt");

-- CreateIndex
CREATE INDEX "invoices_issuedAt_idx" ON "invoices"("issuedAt");

-- CreateIndex
CREATE INDEX "invoices_facilityId_branchId_statusCode_idx" ON "invoices"("facilityId", "branchId", "statusCode");

-- CreateIndex
CREATE INDEX "invoices_facilityId_patientId_idx" ON "invoices"("facilityId", "patientId");

-- CreateIndex
CREATE INDEX "invoices_facilityId_createdAt_idx" ON "invoices"("facilityId", "createdAt");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_billingServiceId_idx" ON "invoice_items"("billingServiceId");

-- CreateIndex
CREATE INDEX "invoice_items_statusCode_idx" ON "invoice_items"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "payments_facilityId_idx" ON "payments"("facilityId");

-- CreateIndex
CREATE INDEX "payments_branchId_idx" ON "payments"("branchId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_receivedByStaffId_idx" ON "payments"("receivedByStaffId");

-- CreateIndex
CREATE INDEX "payments_statusCode_idx" ON "payments"("statusCode");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_checkoutRequestId_idx" ON "payments"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "payments_merchantRequestId_idx" ON "payments"("merchantRequestId");

-- CreateIndex
CREATE INDEX "payments_mpesaReceiptNumber_idx" ON "payments"("mpesaReceiptNumber");

-- CreateIndex
CREATE INDEX "payments_phoneNumber_idx" ON "payments"("phoneNumber");

-- CreateIndex
CREATE INDEX "payments_shaClaimId_idx" ON "payments"("shaClaimId");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_updatedAt_idx" ON "payments"("updatedAt");

-- CreateIndex
CREATE INDEX "payments_requestedAt_idx" ON "payments"("requestedAt");

-- CreateIndex
CREATE INDEX "payments_facilityId_branchId_statusCode_idx" ON "payments"("facilityId", "branchId", "statusCode");

-- CreateIndex
CREATE INDEX "payments_invoiceId_statusCode_idx" ON "payments"("invoiceId", "statusCode");

-- CreateIndex
CREATE INDEX "user_sessions_userId_revokedAt_idx" ON "user_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "user_sessions_lastSeenAt_idx" ON "user_sessions"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_reviews_userId_key" ON "user_reviews"("userId");

-- CreateIndex
CREATE INDEX "user_reviews_rating_idx" ON "user_reviews"("rating");

-- CreateIndex
CREATE INDEX "user_reviews_isVisible_createdAt_idx" ON "user_reviews"("isVisible", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sha_claims_claimNumber_key" ON "sha_claims"("claimNumber");

-- CreateIndex
CREATE INDEX "sha_claims_facilityId_idx" ON "sha_claims"("facilityId");

-- CreateIndex
CREATE INDEX "sha_claims_branchId_idx" ON "sha_claims"("branchId");

-- CreateIndex
CREATE INDEX "sha_claims_patientId_idx" ON "sha_claims"("patientId");

-- CreateIndex
CREATE INDEX "sha_claims_invoiceId_idx" ON "sha_claims"("invoiceId");

-- CreateIndex
CREATE INDEX "sha_claims_statusCode_idx" ON "sha_claims"("statusCode");

-- CreateIndex
CREATE INDEX "sha_claims_createdAt_idx" ON "sha_claims"("createdAt");

-- CreateIndex
CREATE INDEX "user_feedback_facilityId_idx" ON "user_feedback"("facilityId");

-- CreateIndex
CREATE INDEX "user_feedback_branchId_idx" ON "user_feedback"("branchId");

-- CreateIndex
CREATE INDEX "user_feedback_createdByUserId_idx" ON "user_feedback"("createdByUserId");

-- CreateIndex
CREATE INDEX "user_feedback_createdByStaffId_idx" ON "user_feedback"("createdByStaffId");

-- CreateIndex
CREATE INDEX "user_feedback_repliedByUserId_idx" ON "user_feedback"("repliedByUserId");

-- CreateIndex
CREATE INDEX "user_feedback_statusCode_idx" ON "user_feedback"("statusCode");

-- CreateIndex
CREATE INDEX "user_feedback_createdAt_idx" ON "user_feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "facility_subscription_payments_paymentNumber_key" ON "facility_subscription_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "facility_subscription_payments_facilityId_idx" ON "facility_subscription_payments"("facilityId");

-- CreateIndex
CREATE INDEX "facility_subscription_payments_paidAt_idx" ON "facility_subscription_payments"("paidAt");

-- CreateIndex
CREATE INDEX "facility_subscription_payments_paidThrough_idx" ON "facility_subscription_payments"("paidThrough");

-- CreateIndex
CREATE INDEX "audit_logs_facilityId_idx" ON "audit_logs"("facilityId");

-- CreateIndex
CREATE INDEX "audit_logs_branchId_idx" ON "audit_logs"("branchId");

-- CreateIndex
CREATE INDEX "audit_logs_moduleName_idx" ON "audit_logs"("moduleName");

-- CreateIndex
CREATE INDEX "audit_logs_actionName_idx" ON "audit_logs"("actionName");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_actorStaffId_idx" ON "audit_logs"("actorStaffId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_facilityId_branchId_createdAt_idx" ON "audit_logs"("facilityId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ip_geolocation_cache_ipAddress_key" ON "ip_geolocation_cache"("ipAddress");

-- CreateIndex
CREATE INDEX "ip_geolocation_cache_expiresAt_idx" ON "ip_geolocation_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "ip_geolocation_cache_country_idx" ON "ip_geolocation_cache"("country");

-- CreateIndex
CREATE INDEX "ip_geolocation_cache_city_idx" ON "ip_geolocation_cache"("city");

-- CreateIndex
CREATE UNIQUE INDEX "user_location_profiles_sessionId_key" ON "user_location_profiles"("sessionId");

-- CreateIndex
CREATE INDEX "user_location_profiles_userId_idx" ON "user_location_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_location_profiles_isOnline_lastSeenAt_idx" ON "user_location_profiles"("isOnline", "lastSeenAt");

-- CreateIndex
CREATE INDEX "user_location_profiles_country_idx" ON "user_location_profiles"("country");

-- CreateIndex
CREATE INDEX "user_location_profiles_city_idx" ON "user_location_profiles"("city");

-- CreateIndex
CREATE INDEX "user_location_profiles_lastSeenAt_idx" ON "user_location_profiles"("lastSeenAt");

-- CreateIndex
CREATE INDEX "user_location_events_userId_occurredAt_idx" ON "user_location_events"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "user_location_events_sessionId_idx" ON "user_location_events"("sessionId");

-- CreateIndex
CREATE INDEX "user_location_events_eventType_idx" ON "user_location_events"("eventType");

-- CreateIndex
CREATE INDEX "user_location_events_country_idx" ON "user_location_events"("country");

-- CreateIndex
CREATE INDEX "user_location_events_city_idx" ON "user_location_events"("city");

-- CreateIndex
CREATE INDEX "user_location_events_occurredAt_idx" ON "user_location_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_settingKey_key" ON "system_settings"("settingKey");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE INDEX "system_settings_isPublic_idx" ON "system_settings"("isPublic");

-- CreateIndex
CREATE INDEX "notifications_facilityId_idx" ON "notifications"("facilityId");

-- CreateIndex
CREATE INDEX "notifications_branchId_idx" ON "notifications"("branchId");

-- CreateIndex
CREATE INDEX "notifications_targetUserId_idx" ON "notifications"("targetUserId");

-- CreateIndex
CREATE INDEX "notifications_targetStaffId_idx" ON "notifications"("targetStaffId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_isResolved_idx" ON "notifications"("isResolved");

-- CreateIndex
CREATE INDEX "notifications_moduleName_idx" ON "notifications"("moduleName");

-- CreateIndex
CREATE INDEX "notifications_entityType_idx" ON "notifications"("entityType");

-- CreateIndex
CREATE INDEX "notifications_entityId_idx" ON "notifications"("entityId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_facilityId_branchId_isResolved_createdAt_idx" ON "notifications"("facilityId", "branchId", "isResolved", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_targetUserId_isRead_createdAt_idx" ON "notifications"("targetUserId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_targetStaffId_isRead_createdAt_idx" ON "notifications"("targetStaffId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_moduleName_isResolved_createdAt_idx" ON "notifications"("moduleName", "isResolved", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_resolvedByUserId_idx" ON "notifications"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "notifications_resolvedByStaffId_idx" ON "notifications"("resolvedByStaffId");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_facilityId_idx" ON "branch_medicine_stocks"("facilityId");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_branchId_idx" ON "branch_medicine_stocks"("branchId");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_medicineId_idx" ON "branch_medicine_stocks"("medicineId");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_createdAt_idx" ON "branch_medicine_stocks"("createdAt");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_updatedAt_idx" ON "branch_medicine_stocks"("updatedAt");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_facilityId_branchId_isActive_idx" ON "branch_medicine_stocks"("facilityId", "branchId", "isActive");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_branchId_stockQuantity_idx" ON "branch_medicine_stocks"("branchId", "stockQuantity");

-- CreateIndex
CREATE INDEX "branch_medicine_stocks_branchId_updatedAt_idx" ON "branch_medicine_stocks"("branchId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "branch_medicine_stocks_branchId_medicineId_key" ON "branch_medicine_stocks"("branchId", "medicineId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "operational_module_records_recordNumber_key" ON "operational_module_records"("recordNumber");

-- CreateIndex
CREATE INDEX "operational_module_records_facilityId_idx" ON "operational_module_records"("facilityId");

-- CreateIndex
CREATE INDEX "operational_module_records_branchId_idx" ON "operational_module_records"("branchId");

-- CreateIndex
CREATE INDEX "operational_module_records_moduleSlug_idx" ON "operational_module_records"("moduleSlug");

-- CreateIndex
CREATE INDEX "operational_module_records_statusCode_idx" ON "operational_module_records"("statusCode");

-- CreateIndex
CREATE INDEX "operational_module_records_priorityCode_idx" ON "operational_module_records"("priorityCode");

-- CreateIndex
CREATE INDEX "operational_module_records_createdAt_idx" ON "operational_module_records"("createdAt");

-- CreateIndex
CREATE INDEX "data_outbox_events_status_createdAt_idx" ON "data_outbox_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "data_outbox_events_facilityId_branchId_createdAt_idx" ON "data_outbox_events"("facilityId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "data_outbox_events_eventType_idx" ON "data_outbox_events"("eventType");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_homeBranchId_fkey" FOREIGN KEY ("homeBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_homeFacilityId_fkey" FOREIGN KEY ("homeFacilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_performedByStaffId_fkey" FOREIGN KEY ("performedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_routedDoctorId_fkey" FOREIGN KEY ("routedDoctorId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_requestedByStaffId_fkey" FOREIGN KEY ("requestedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "lab_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "lab_test_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "lab_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribedByStaffId_fkey" FOREIGN KEY ("prescribedByStaffId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispenses" ADD CONSTRAINT "dispenses_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispenses" ADD CONSTRAINT "dispenses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispenses" ADD CONSTRAINT "dispenses_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispenses" ADD CONSTRAINT "dispenses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispenses" ADD CONSTRAINT "dispenses_dispensedByStaffId_fkey" FOREIGN KEY ("dispensedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispense_items" ADD CONSTRAINT "dispense_items_dispenseId_fkey" FOREIGN KEY ("dispenseId") REFERENCES "dispenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispense_items" ADD CONSTRAINT "dispense_items_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "prescription_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispense_items" ADD CONSTRAINT "dispense_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_admittedByStaffId_fkey" FOREIGN KEY ("admittedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_progress_notes" ADD CONSTRAINT "ipd_progress_notes_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_progress_notes" ADD CONSTRAINT "ipd_progress_notes_recordedByStaffId_fkey" FOREIGN KEY ("recordedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_vital_records" ADD CONSTRAINT "ipd_vital_records_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_vital_records" ADD CONSTRAINT "ipd_vital_records_recordedByStaffId_fkey" FOREIGN KEY ("recordedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_doctor_reviews" ADD CONSTRAINT "ipd_doctor_reviews_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_doctor_reviews" ADD CONSTRAINT "ipd_doctor_reviews_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_chart_entries" ADD CONSTRAINT "treatment_chart_entries_administeredByStaffId_fkey" FOREIGN KEY ("administeredByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_chart_entries" ADD CONSTRAINT "treatment_chart_entries_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_chart_entries" ADD CONSTRAINT "treatment_chart_entries_orderedByStaffId_fkey" FOREIGN KEY ("orderedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_discharge_summaries" ADD CONSTRAINT "ipd_discharge_summaries_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_discharge_summaries" ADD CONSTRAINT "ipd_discharge_summaries_dischargedByStaffId_fkey" FOREIGN KEY ("dischargedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tariffs" ADD CONSTRAINT "service_tariffs_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tariffs" ADD CONSTRAINT "service_tariffs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tariffs" ADD CONSTRAINT "service_tariffs_billingServiceId_fkey" FOREIGN KEY ("billingServiceId") REFERENCES "billing_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tariffs" ADD CONSTRAINT "service_tariffs_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "lab_test_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tariffs" ADD CONSTRAINT "service_tariffs_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tariffs" ADD CONSTRAINT "service_tariffs_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_billingServiceId_fkey" FOREIGN KEY ("billingServiceId") REFERENCES "billing_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_updatedByStaffId_fkey" FOREIGN KEY ("updatedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shaClaimId_fkey" FOREIGN KEY ("shaClaimId") REFERENCES "sha_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedByStaffId_fkey" FOREIGN KEY ("receivedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reviews" ADD CONSTRAINT "user_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sha_claims" ADD CONSTRAINT "sha_claims_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sha_claims" ADD CONSTRAINT "sha_claims_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sha_claims" ADD CONSTRAINT "sha_claims_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sha_claims" ADD CONSTRAINT "sha_claims_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sha_claims" ADD CONSTRAINT "sha_claims_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_repliedByUserId_fkey" FOREIGN KEY ("repliedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_subscription_payments" ADD CONSTRAINT "facility_subscription_payments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_profiles" ADD CONSTRAINT "user_location_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_events" ADD CONSTRAINT "user_location_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_targetStaffId_fkey" FOREIGN KEY ("targetStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_resolvedByStaffId_fkey" FOREIGN KEY ("resolvedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_medicine_stocks" ADD CONSTRAINT "branch_medicine_stocks_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_medicine_stocks" ADD CONSTRAINT "branch_medicine_stocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_medicine_stocks" ADD CONSTRAINT "branch_medicine_stocks_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

