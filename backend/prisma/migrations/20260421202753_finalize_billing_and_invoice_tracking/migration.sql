-- CreateTable
CREATE TABLE `facilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `branchCode` VARCHAR(50) NULL,
    `name` VARCHAR(255) NOT NULL,
    `facilityType` VARCHAR(100) NULL,
    `county` VARCHAR(120) NULL,
    `town` VARCHAR(120) NULL,
    `country` VARCHAR(120) NULL,
    `phone` VARCHAR(50) NULL,
    `altPhone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `website` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `postalAddress` VARCHAR(255) NULL,
    `registrationNo` VARCHAR(100) NULL,
    `taxPin` VARCHAR(100) NULL,
    `licenseNumber` VARCHAR(100) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `timezone` VARCHAR(100) NULL,
    `currency` VARCHAR(20) NULL,
    `mpesaShortcode` VARCHAR(50) NULL,
    `mpesaPaybill` VARCHAR(50) NULL,
    `mpesaTillNumber` VARCHAR(50) NULL,
    `isHeadOffice` BOOLEAN NOT NULL DEFAULT false,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `facilities_code_key`(`code`),
    UNIQUE INDEX `facilities_branchCode_key`(`branchCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `county` VARCHAR(120) NULL,
    `town` VARCHAR(120) NULL,
    `country` VARCHAR(120) NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `postalAddress` VARCHAR(255) NULL,
    `timezone` VARCHAR(100) NULL,
    `currency` VARCHAR(20) NULL,
    `mpesaShortcode` VARCHAR(50) NULL,
    `mpesaPaybill` VARCHAR(50) NULL,
    `mpesaTillNumber` VARCHAR(50) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `branches_code_key`(`code`),
    INDEX `branches_facilityId_idx`(`facilityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_code_key`(`code`),
    INDEX `departments_facilityId_idx`(`facilityId`),
    INDEX `departments_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(150) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `canAccessAllBranchesInFacility` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `roleId` INTEGER NOT NULL,
    `homeFacilityId` INTEGER NULL,
    `homeBranchId` INTEGER NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_roleId_idx`(`roleId`),
    INDEX `users_homeFacilityId_idx`(`homeFacilityId`),
    INDEX `users_homeBranchId_idx`(`homeBranchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_branch_access` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_branch_access_userId_idx`(`userId`),
    INDEX `user_branch_access_facilityId_idx`(`facilityId`),
    INDEX `user_branch_access_branchId_idx`(`branchId`),
    UNIQUE INDEX `user_branch_access_userId_branchId_key`(`userId`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staffCode` VARCHAR(50) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(30) NULL,
    `gender` VARCHAR(20) NULL,
    `designation` VARCHAR(150) NULL,
    `isClinician` BOOLEAN NOT NULL DEFAULT false,
    `isPrescriber` BOOLEAN NOT NULL DEFAULT false,
    `canLogin` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `departmentId` INTEGER NULL,
    `roleId` INTEGER NOT NULL,
    `userId` INTEGER NULL,

    UNIQUE INDEX `staff_members_staffCode_key`(`staffCode`),
    UNIQUE INDEX `staff_members_email_key`(`email`),
    UNIQUE INDEX `staff_members_userId_key`(`userId`),
    INDEX `staff_members_facilityId_idx`(`facilityId`),
    INDEX `staff_members_branchId_idx`(`branchId`),
    INDEX `staff_members_departmentId_idx`(`departmentId`),
    INDEX `staff_members_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patientNumber` VARCHAR(50) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `middleName` VARCHAR(100) NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `gender` VARCHAR(20) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `phonePrimary` VARCHAR(30) NULL,
    `phoneSecondary` VARCHAR(30) NULL,
    `email` VARCHAR(255) NULL,
    `occupation` VARCHAR(120) NULL,
    `isDeceased` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,

    UNIQUE INDEX `patients_patientNumber_key`(`patientNumber`),
    INDEX `patients_facilityId_idx`(`facilityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clinics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `clinicType` VARCHAR(50) NOT NULL,
    `roomLocation` VARCHAR(150) NULL,
    `phoneExtension` VARCHAR(30) NULL,
    `consultationMinutes` INTEGER NOT NULL DEFAULT 15,
    `maxDailyCapacity` INTEGER NOT NULL DEFAULT 20,
    `serviceStartTime` VARCHAR(20) NULL,
    `serviceEndTime` VARCHAR(20) NULL,
    `isWalkInAllowed` BOOLEAN NOT NULL DEFAULT true,
    `isReferralRequired` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `departmentId` INTEGER NOT NULL,

    UNIQUE INDEX `clinics_code_key`(`code`),
    INDEX `clinics_facilityId_idx`(`facilityId`),
    INDEX `clinics_branchId_idx`(`branchId`),
    INDEX `clinics_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointmentNumber` VARCHAR(50) NOT NULL,
    `appointmentDate` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(20) NULL,
    `endTime` VARCHAR(20) NULL,
    `visitReason` TEXT NULL,
    `statusCode` VARCHAR(50) NOT NULL,
    `triagePriority` VARCHAR(30) NULL,
    `checkedInAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `patientId` INTEGER NOT NULL,
    `doctorId` INTEGER NULL,
    `clinicId` INTEGER NULL,

    UNIQUE INDEX `appointments_appointmentNumber_key`(`appointmentNumber`),
    INDEX `appointments_facilityId_idx`(`facilityId`),
    INDEX `appointments_branchId_idx`(`branchId`),
    INDEX `appointments_patientId_idx`(`patientId`),
    INDEX `appointments_doctorId_idx`(`doctorId`),
    INDEX `appointments_clinicId_idx`(`clinicId`),
    INDEX `appointments_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `triage_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `triageNumber` VARCHAR(50) NOT NULL,
    `arrivalType` VARCHAR(30) NULL,
    `chiefComplaint` TEXT NULL,
    `temperatureC` DOUBLE NULL,
    `systolicBp` INTEGER NULL,
    `diastolicBp` INTEGER NULL,
    `pulseRate` INTEGER NULL,
    `respiratoryRate` INTEGER NULL,
    `oxygenSaturation` DOUBLE NULL,
    `weightKg` DOUBLE NULL,
    `heightCm` DOUBLE NULL,
    `bmi` DOUBLE NULL,
    `painScore` INTEGER NULL,
    `triagePriority` VARCHAR(30) NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'WAITING_TRIAGE',
    `arrivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `patientId` INTEGER NOT NULL,
    `clinicId` INTEGER NULL,
    `appointmentId` INTEGER NULL,
    `performedByStaffId` INTEGER NULL,
    `routedDoctorId` INTEGER NULL,

    UNIQUE INDEX `triage_records_triageNumber_key`(`triageNumber`),
    UNIQUE INDEX `triage_records_appointmentId_key`(`appointmentId`),
    INDEX `triage_records_facilityId_idx`(`facilityId`),
    INDEX `triage_records_branchId_idx`(`branchId`),
    INDEX `triage_records_patientId_idx`(`patientId`),
    INDEX `triage_records_clinicId_idx`(`clinicId`),
    INDEX `triage_records_appointmentId_idx`(`appointmentId`),
    INDEX `triage_records_performedByStaffId_idx`(`performedByStaffId`),
    INDEX `triage_records_routedDoctorId_idx`(`routedDoctorId`),
    INDEX `triage_records_statusCode_idx`(`statusCode`),
    INDEX `triage_records_triagePriority_idx`(`triagePriority`),
    INDEX `triage_records_arrivedAt_idx`(`arrivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `consultationNumber` VARCHAR(50) NOT NULL,
    `chiefComplaint` TEXT NULL,
    `historyOfPresenting` TEXT NULL,
    `examinationFindings` TEXT NULL,
    `diagnosis` TEXT NULL,
    `treatmentPlan` TEXT NULL,
    `notes` TEXT NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `appointmentId` INTEGER NOT NULL,
    `patientId` INTEGER NOT NULL,
    `doctorId` INTEGER NOT NULL,

    UNIQUE INDEX `consultations_consultationNumber_key`(`consultationNumber`),
    UNIQUE INDEX `consultations_appointmentId_key`(`appointmentId`),
    INDEX `consultations_facilityId_idx`(`facilityId`),
    INDEX `consultations_branchId_idx`(`branchId`),
    INDEX `consultations_patientId_idx`(`patientId`),
    INDEX `consultations_doctorId_idx`(`doctorId`),
    INDEX `consultations_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_test_catalog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `testName` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NULL,
    `specimenType` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderNumber` VARCHAR(50) NOT NULL,
    `clinicalNotes` TEXT NULL,
    `urgency` VARCHAR(50) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `patientId` INTEGER NOT NULL,
    `appointmentId` INTEGER NULL,
    `admissionId` INTEGER NULL,
    `encounterRef` VARCHAR(100) NULL,
    `requestedByStaffId` INTEGER NULL,

    UNIQUE INDEX `lab_orders_orderNumber_key`(`orderNumber`),
    INDEX `lab_orders_facilityId_idx`(`facilityId`),
    INDEX `lab_orders_branchId_idx`(`branchId`),
    INDEX `lab_orders_patientId_idx`(`patientId`),
    INDEX `lab_orders_appointmentId_idx`(`appointmentId`),
    INDEX `lab_orders_admissionId_idx`(`admissionId`),
    INDEX `lab_orders_requestedByStaffId_idx`(`requestedByStaffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `instructions` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `orderId` INTEGER NOT NULL,
    `testId` INTEGER NOT NULL,

    INDEX `lab_order_items_orderId_idx`(`orderId`),
    INDEX `lab_order_items_testId_idx`(`testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resultValue` TEXT NOT NULL,
    `remarks` TEXT NULL,
    `recordedBy` INTEGER NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `orderItemId` INTEGER NOT NULL,

    INDEX `lab_results_orderItemId_idx`(`orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medicines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `dosageForm` VARCHAR(100) NULL,
    `strength` VARCHAR(100) NULL,
    `manufacturer` VARCHAR(150) NULL,
    `unitPrice` DOUBLE NULL DEFAULT 0,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `reorderLevel` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `medicines_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prescriptionNumber` VARCHAR(50) NOT NULL,
    `notes` TEXT NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'PRESCRIBED',
    `prescribedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dispensedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `consultationId` INTEGER NOT NULL,
    `patientId` INTEGER NOT NULL,
    `prescribedByStaffId` INTEGER NOT NULL,

    UNIQUE INDEX `prescriptions_prescriptionNumber_key`(`prescriptionNumber`),
    INDEX `prescriptions_facilityId_idx`(`facilityId`),
    INDEX `prescriptions_branchId_idx`(`branchId`),
    INDEX `prescriptions_consultationId_idx`(`consultationId`),
    INDEX `prescriptions_patientId_idx`(`patientId`),
    INDEX `prescriptions_prescribedByStaffId_idx`(`prescribedByStaffId`),
    INDEX `prescriptions_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescription_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dosage` VARCHAR(100) NULL,
    `frequency` VARCHAR(100) NULL,
    `duration` VARCHAR(100) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `instructions` TEXT NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'PRESCRIBED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `prescriptionId` INTEGER NOT NULL,
    `medicineId` INTEGER NOT NULL,

    INDEX `prescription_items_prescriptionId_idx`(`prescriptionId`),
    INDEX `prescription_items_medicineId_idx`(`medicineId`),
    INDEX `prescription_items_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dispenseNumber` VARCHAR(50) NOT NULL,
    `prescriptionId` INTEGER NOT NULL,
    `patientId` INTEGER NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `dispensedByStaffId` INTEGER NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'DISPENSED',
    `notes` TEXT NULL,
    `dispensedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dispenses_dispenseNumber_key`(`dispenseNumber`),
    INDEX `dispenses_prescriptionId_idx`(`prescriptionId`),
    INDEX `dispenses_patientId_idx`(`patientId`),
    INDEX `dispenses_facilityId_idx`(`facilityId`),
    INDEX `dispenses_branchId_idx`(`branchId`),
    INDEX `dispenses_dispensedByStaffId_idx`(`dispensedByStaffId`),
    INDEX `dispenses_dispensedAt_idx`(`dispensedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispense_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dispenseId` INTEGER NOT NULL,
    `prescriptionItemId` INTEGER NOT NULL,
    `medicineId` INTEGER NOT NULL,
    `quantityPrescribed` INTEGER NOT NULL DEFAULT 0,
    `quantityDispensed` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DOUBLE NOT NULL DEFAULT 0,
    `lineTotal` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dispense_items_dispenseId_idx`(`dispenseId`),
    INDEX `dispense_items_prescriptionItemId_idx`(`prescriptionItemId`),
    INDEX `dispense_items_medicineId_idx`(`medicineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `wardType` VARCHAR(100) NULL,
    `capacity` INTEGER NOT NULL DEFAULT 0,
    `facilityId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wards_code_key`(`code`),
    INDEX `wards_facilityId_idx`(`facilityId`),
    INDEX `wards_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bedNumber` VARCHAR(50) NOT NULL,
    `bedLabel` VARCHAR(100) NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    `facilityId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `wardId` INTEGER NOT NULL,

    UNIQUE INDEX `beds_bedNumber_key`(`bedNumber`),
    INDEX `beds_wardId_idx`(`wardId`),
    INDEX `beds_facilityId_idx`(`facilityId`),
    INDEX `beds_branchId_idx`(`branchId`),
    INDEX `beds_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admissionNumber` VARCHAR(50) NOT NULL,
    `admissionReason` TEXT NULL,
    `admissionSource` VARCHAR(100) NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'ADMITTED',
    `admittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dischargedAt` DATETIME(3) NULL,
    `expectedDischargeAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `patientId` INTEGER NOT NULL,
    `appointmentId` INTEGER NULL,
    `consultationId` INTEGER NULL,
    `admittedByStaffId` INTEGER NULL,
    `wardId` INTEGER NOT NULL,
    `bedId` INTEGER NULL,

    UNIQUE INDEX `admissions_admissionNumber_key`(`admissionNumber`),
    INDEX `admissions_facilityId_idx`(`facilityId`),
    INDEX `admissions_branchId_idx`(`branchId`),
    INDEX `admissions_patientId_idx`(`patientId`),
    INDEX `admissions_appointmentId_idx`(`appointmentId`),
    INDEX `admissions_consultationId_idx`(`consultationId`),
    INDEX `admissions_admittedByStaffId_idx`(`admittedByStaffId`),
    INDEX `admissions_wardId_idx`(`wardId`),
    INDEX `admissions_bedId_idx`(`bedId`),
    INDEX `admissions_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ipd_progress_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `noteType` VARCHAR(100) NULL,
    `noteText` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `admissionId` INTEGER NOT NULL,
    `recordedByStaffId` INTEGER NULL,

    INDEX `ipd_progress_notes_admissionId_idx`(`admissionId`),
    INDEX `ipd_progress_notes_recordedByStaffId_idx`(`recordedByStaffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ipd_vital_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admissionId` INTEGER NOT NULL,
    `recordedByStaffId` INTEGER NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `temperatureC` DOUBLE NULL,
    `systolicBp` INTEGER NULL,
    `diastolicBp` INTEGER NULL,
    `pulseRate` INTEGER NULL,
    `respiratoryRate` INTEGER NULL,
    `oxygenSaturation` DOUBLE NULL,
    `weightKg` DOUBLE NULL,
    `heightCm` DOUBLE NULL,
    `bmi` DOUBLE NULL,
    `painScore` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ipd_vital_records_admissionId_idx`(`admissionId`),
    INDEX `ipd_vital_records_recordedByStaffId_idx`(`recordedByStaffId`),
    INDEX `ipd_vital_records_recordedAt_idx`(`recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ipd_doctor_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admissionId` INTEGER NOT NULL,
    `reviewedByStaffId` INTEGER NULL,
    `reviewDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `chiefComplaint` TEXT NULL,
    `subjective` TEXT NULL,
    `objective` TEXT NULL,
    `assessment` TEXT NULL,
    `plan` TEXT NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ipd_doctor_reviews_admissionId_idx`(`admissionId`),
    INDEX `ipd_doctor_reviews_reviewedByStaffId_idx`(`reviewedByStaffId`),
    INDEX `ipd_doctor_reviews_reviewDate_idx`(`reviewDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `treatment_chart_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `treatmentType` VARCHAR(100) NULL,
    `treatmentName` VARCHAR(150) NOT NULL,
    `dosage` VARCHAR(100) NULL,
    `route` VARCHAR(100) NULL,
    `frequency` VARCHAR(100) NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    `scheduledAt` DATETIME(3) NULL,
    `administeredAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `admissionId` INTEGER NOT NULL,
    `orderedByStaffId` INTEGER NULL,
    `administeredByStaffId` INTEGER NULL,

    INDEX `treatment_chart_entries_admissionId_idx`(`admissionId`),
    INDEX `treatment_chart_entries_orderedByStaffId_idx`(`orderedByStaffId`),
    INDEX `treatment_chart_entries_administeredByStaffId_idx`(`administeredByStaffId`),
    INDEX `treatment_chart_entries_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ipd_discharge_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admissionId` INTEGER NOT NULL,
    `dischargeDiagnosis` TEXT NOT NULL,
    `hospitalCourse` TEXT NOT NULL,
    `conditionOnDischarge` TEXT NOT NULL,
    `dischargeMedications` TEXT NULL,
    `followUpInstructions` TEXT NULL,
    `dischargedByStaffId` INTEGER NULL,
    `dischargeDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ipd_discharge_summaries_admissionId_key`(`admissionId`),
    INDEX `ipd_discharge_summaries_dischargedByStaffId_idx`(`dischargedByStaffId`),
    INDEX `ipd_discharge_summaries_dischargeDate_idx`(`dischargeDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NULL,
    `defaultPrice` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `billing_services_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceNumber` VARCHAR(50) NOT NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `subtotal` DOUBLE NOT NULL DEFAULT 0,
    `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `balanceAmount` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `settledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `patientId` INTEGER NOT NULL,
    `appointmentId` INTEGER NULL,
    `consultationId` INTEGER NULL,
    `admissionId` INTEGER NULL,
    `createdByStaffId` INTEGER NULL,

    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    INDEX `invoices_facilityId_idx`(`facilityId`),
    INDEX `invoices_branchId_idx`(`branchId`),
    INDEX `invoices_patientId_idx`(`patientId`),
    INDEX `invoices_appointmentId_idx`(`appointmentId`),
    INDEX `invoices_consultationId_idx`(`consultationId`),
    INDEX `invoices_admissionId_idx`(`admissionId`),
    INDEX `invoices_createdByStaffId_idx`(`createdByStaffId`),
    INDEX `invoices_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(255) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DOUBLE NOT NULL DEFAULT 0,
    `lineTotal` DOUBLE NOT NULL DEFAULT 0,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'BILLED',
    `isAutoGenerated` BOOLEAN NOT NULL DEFAULT false,
    `isRemoved` BOOLEAN NOT NULL DEFAULT false,
    `removedAt` DATETIME(3) NULL,
    `removedReason` TEXT NULL,
    `sourceModule` VARCHAR(100) NULL,
    `sourceEntityType` VARCHAR(100) NULL,
    `sourceEntityId` VARCHAR(100) NULL,
    `updatedByStaffId` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `invoiceId` INTEGER NOT NULL,
    `billingServiceId` INTEGER NULL,

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_items_billingServiceId_idx`(`billingServiceId`),
    INDEX `invoice_items_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receiptNumber` VARCHAR(50) NOT NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `paymentMethod` VARCHAR(50) NOT NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `phoneNumber` VARCHAR(30) NULL,
    `transactionRef` VARCHAR(100) NULL,
    `mpesaReceiptNumber` VARCHAR(100) NULL,
    `merchantRequestId` VARCHAR(100) NULL,
    `checkoutRequestId` VARCHAR(100) NULL,
    `callbackPayload` TEXT NULL,
    `paidAt` DATETIME(3) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `invoiceId` INTEGER NOT NULL,
    `receivedByStaffId` INTEGER NULL,

    UNIQUE INDEX `payments_receiptNumber_key`(`receiptNumber`),
    INDEX `payments_facilityId_idx`(`facilityId`),
    INDEX `payments_branchId_idx`(`branchId`),
    INDEX `payments_invoiceId_idx`(`invoiceId`),
    INDEX `payments_receivedByStaffId_idx`(`receivedByStaffId`),
    INDEX `payments_statusCode_idx`(`statusCode`),
    INDEX `payments_paymentMethod_idx`(`paymentMethod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moduleName` VARCHAR(100) NOT NULL,
    `actionName` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(100) NULL,
    `entityId` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `facilityId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `actorUserId` INTEGER NULL,
    `actorStaffId` INTEGER NULL,
    `beforeData` LONGTEXT NULL,
    `afterData` LONGTEXT NULL,
    `ipAddress` VARCHAR(100) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_facilityId_idx`(`facilityId`),
    INDEX `audit_logs_branchId_idx`(`branchId`),
    INDEX `audit_logs_moduleName_idx`(`moduleName`),
    INDEX `audit_logs_actionName_idx`(`actionName`),
    INDEX `audit_logs_entityType_idx`(`entityType`),
    INDEX `audit_logs_entityId_idx`(`entityId`),
    INDEX `audit_logs_actorUserId_idx`(`actorUserId`),
    INDEX `audit_logs_actorStaffId_idx`(`actorStaffId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settingKey` VARCHAR(100) NOT NULL,
    `settingValue` LONGTEXT NOT NULL,
    `valueType` VARCHAR(50) NULL,
    `category` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_settingKey_key`(`settingKey`),
    INDEX `system_settings_category_idx`(`category`),
    INDEX `system_settings_isPublic_idx`(`isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `notificationType` VARCHAR(50) NULL,
    `severity` VARCHAR(20) NULL,
    `moduleName` VARCHAR(100) NULL,
    `entityType` VARCHAR(100) NULL,
    `entityId` VARCHAR(100) NULL,
    `facilityId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `targetUserId` INTEGER NULL,
    `targetStaffId` INTEGER NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedByUserId` INTEGER NULL,
    `resolvedByStaffId` INTEGER NULL,
    `resolutionNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_facilityId_idx`(`facilityId`),
    INDEX `notifications_branchId_idx`(`branchId`),
    INDEX `notifications_targetUserId_idx`(`targetUserId`),
    INDEX `notifications_targetStaffId_idx`(`targetStaffId`),
    INDEX `notifications_isRead_idx`(`isRead`),
    INDEX `notifications_isResolved_idx`(`isResolved`),
    INDEX `notifications_moduleName_idx`(`moduleName`),
    INDEX `notifications_entityType_idx`(`entityType`),
    INDEX `notifications_entityId_idx`(`entityId`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    INDEX `notifications_resolvedByUserId_idx`(`resolvedByUserId`),
    INDEX `notifications_resolvedByStaffId_idx`(`resolvedByStaffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branch_medicine_stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `medicineId` INTEGER NOT NULL,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `reorderLevel` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `branch_medicine_stocks_facilityId_idx`(`facilityId`),
    INDEX `branch_medicine_stocks_branchId_idx`(`branchId`),
    INDEX `branch_medicine_stocks_medicineId_idx`(`medicineId`),
    UNIQUE INDEX `branch_medicine_stocks_branchId_medicineId_key`(`branchId`, `medicineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `password_reset_tokens_userId_idx`(`userId`),
    INDEX `password_reset_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_homeBranchId_fkey` FOREIGN KEY (`homeBranchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_homeFacilityId_fkey` FOREIGN KEY (`homeFacilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_branch_access` ADD CONSTRAINT `user_branch_access_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_branch_access` ADD CONSTRAINT `user_branch_access_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_branch_access` ADD CONSTRAINT `user_branch_access_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patients` ADD CONSTRAINT `patients_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinics` ADD CONSTRAINT `clinics_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinics` ADD CONSTRAINT `clinics_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinics` ADD CONSTRAINT `clinics_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triage_records` ADD CONSTRAINT `triage_records_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triage_records` ADD CONSTRAINT `triage_records_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triage_records` ADD CONSTRAINT `triage_records_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triage_records` ADD CONSTRAINT `triage_records_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triage_records` ADD CONSTRAINT `triage_records_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triage_records` ADD CONSTRAINT `triage_records_performedByStaffId_fkey` FOREIGN KEY (`performedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `triage_records` ADD CONSTRAINT `triage_records_routedDoctorId_fkey` FOREIGN KEY (`routedDoctorId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultations` ADD CONSTRAINT `consultations_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultations` ADD CONSTRAINT `consultations_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultations` ADD CONSTRAINT `consultations_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `staff_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultations` ADD CONSTRAINT `consultations_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultations` ADD CONSTRAINT `consultations_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_requestedByStaffId_fkey` FOREIGN KEY (`requestedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_order_items` ADD CONSTRAINT `lab_order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `lab_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_order_items` ADD CONSTRAINT `lab_order_items_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `lab_test_catalog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lab_results` ADD CONSTRAINT `lab_results_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `lab_order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_consultationId_fkey` FOREIGN KEY (`consultationId`) REFERENCES `consultations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_prescribedByStaffId_fkey` FOREIGN KEY (`prescribedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription_items` ADD CONSTRAINT `prescription_items_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription_items` ADD CONSTRAINT `prescription_items_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `prescriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispenses` ADD CONSTRAINT `dispenses_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `prescriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispenses` ADD CONSTRAINT `dispenses_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispenses` ADD CONSTRAINT `dispenses_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispenses` ADD CONSTRAINT `dispenses_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispenses` ADD CONSTRAINT `dispenses_dispensedByStaffId_fkey` FOREIGN KEY (`dispensedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispense_items` ADD CONSTRAINT `dispense_items_dispenseId_fkey` FOREIGN KEY (`dispenseId`) REFERENCES `dispenses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispense_items` ADD CONSTRAINT `dispense_items_prescriptionItemId_fkey` FOREIGN KEY (`prescriptionItemId`) REFERENCES `prescription_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispense_items` ADD CONSTRAINT `dispense_items_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wards` ADD CONSTRAINT `wards_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wards` ADD CONSTRAINT `wards_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beds` ADD CONSTRAINT `beds_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beds` ADD CONSTRAINT `beds_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beds` ADD CONSTRAINT `beds_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `wards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_admittedByStaffId_fkey` FOREIGN KEY (`admittedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_bedId_fkey` FOREIGN KEY (`bedId`) REFERENCES `beds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_consultationId_fkey` FOREIGN KEY (`consultationId`) REFERENCES `consultations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admissions` ADD CONSTRAINT `admissions_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `wards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_progress_notes` ADD CONSTRAINT `ipd_progress_notes_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_progress_notes` ADD CONSTRAINT `ipd_progress_notes_recordedByStaffId_fkey` FOREIGN KEY (`recordedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_vital_records` ADD CONSTRAINT `ipd_vital_records_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_vital_records` ADD CONSTRAINT `ipd_vital_records_recordedByStaffId_fkey` FOREIGN KEY (`recordedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_doctor_reviews` ADD CONSTRAINT `ipd_doctor_reviews_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_doctor_reviews` ADD CONSTRAINT `ipd_doctor_reviews_reviewedByStaffId_fkey` FOREIGN KEY (`reviewedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment_chart_entries` ADD CONSTRAINT `treatment_chart_entries_administeredByStaffId_fkey` FOREIGN KEY (`administeredByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment_chart_entries` ADD CONSTRAINT `treatment_chart_entries_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treatment_chart_entries` ADD CONSTRAINT `treatment_chart_entries_orderedByStaffId_fkey` FOREIGN KEY (`orderedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_discharge_summaries` ADD CONSTRAINT `ipd_discharge_summaries_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ipd_discharge_summaries` ADD CONSTRAINT `ipd_discharge_summaries_dischargedByStaffId_fkey` FOREIGN KEY (`dischargedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `admissions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_consultationId_fkey` FOREIGN KEY (`consultationId`) REFERENCES `consultations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdByStaffId_fkey` FOREIGN KEY (`createdByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_billingServiceId_fkey` FOREIGN KEY (`billingServiceId`) REFERENCES `billing_services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_updatedByStaffId_fkey` FOREIGN KEY (`updatedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_receivedByStaffId_fkey` FOREIGN KEY (`receivedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorStaffId_fkey` FOREIGN KEY (`actorStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_targetStaffId_fkey` FOREIGN KEY (`targetStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_resolvedByUserId_fkey` FOREIGN KEY (`resolvedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_resolvedByStaffId_fkey` FOREIGN KEY (`resolvedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branch_medicine_stocks` ADD CONSTRAINT `branch_medicine_stocks_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branch_medicine_stocks` ADD CONSTRAINT `branch_medicine_stocks_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branch_medicine_stocks` ADD CONSTRAINT `branch_medicine_stocks_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
