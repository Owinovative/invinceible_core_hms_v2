CREATE TABLE `dental_encounters` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `encounterNumber` VARCHAR(60) NOT NULL,
  `facilityId` INTEGER NOT NULL, `branchId` INTEGER NULL, `patientId` INTEGER NOT NULL,
  `clinicianStaffId` INTEGER NOT NULL, `chiefComplaint` TEXT NULL,
  `examinationNotes` TEXT NULL, `treatmentPlan` TEXT NULL,
  `consentReference` VARCHAR(120) NULL, `statusCode` VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  `nextReviewAt` DATETIME(3) NULL, `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `dental_encounters_encounterNumber_key` (`encounterNumber`),
  INDEX `dental_encounters_scope_status_started_idx` (`facilityId`,`branchId`,`statusCode`,`startedAt`),
  INDEX `dental_encounters_patientId_idx` (`patientId`),
  INDEX `dental_encounters_clinicianStaffId_idx` (`clinicianStaffId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `dental_encounters_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `dental_encounters_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dental_encounters_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `dental_encounters_clinicianStaffId_fkey` FOREIGN KEY (`clinicianStaffId`) REFERENCES `staff_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `dental_chart_entries` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `dentalEncounterId` INTEGER NOT NULL,
  `toothCode` VARCHAR(20) NOT NULL, `surfaceCode` VARCHAR(30) NULL,
  `conditionCode` VARCHAR(80) NOT NULL, `diagnosisCode` VARCHAR(80) NULL,
  `notes` TEXT NULL, `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `dental_chart_entries_encounterId_idx` (`dentalEncounterId`),
  INDEX `dental_chart_entries_toothCode_idx` (`toothCode`), PRIMARY KEY (`id`),
  CONSTRAINT `dental_chart_entries_encounterId_fkey` FOREIGN KEY (`dentalEncounterId`) REFERENCES `dental_encounters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `dental_procedures` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `dentalEncounterId` INTEGER NOT NULL,
  `toothCode` VARCHAR(20) NULL, `procedureCode` VARCHAR(80) NOT NULL,
  `procedureName` VARCHAR(180) NOT NULL, `procedureNotes` TEXT NULL,
  `performedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `priceAmount` DECIMAL(18,2) NOT NULL DEFAULT 0, `invoiceItemId` INTEGER NULL,
  INDEX `dental_procedures_encounterId_idx` (`dentalEncounterId`),
  INDEX `dental_procedures_procedureCode_idx` (`procedureCode`),
  INDEX `dental_procedures_invoiceItemId_idx` (`invoiceItemId`), PRIMARY KEY (`id`),
  CONSTRAINT `dental_procedures_encounterId_fkey` FOREIGN KEY (`dentalEncounterId`) REFERENCES `dental_encounters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `orthopedic_cases` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `caseNumber` VARCHAR(60) NOT NULL,
  `facilityId` INTEGER NOT NULL, `branchId` INTEGER NULL, `patientId` INTEGER NOT NULL,
  `clinicianStaffId` INTEGER NOT NULL, `injuryMechanism` TEXT NULL,
  `anatomicalSite` VARCHAR(150) NOT NULL, `laterality` VARCHAR(30) NULL,
  `fractureClassification` VARCHAR(150) NULL, `imagingSummary` TEXT NULL,
  `managementPlan` TEXT NULL, `procedureDocumentation` TEXT NULL,
  `statusCode` VARCHAR(40) NOT NULL DEFAULT 'OPEN', `followUpAt` DATETIME(3) NULL,
  `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `closedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `orthopedic_cases_caseNumber_key` (`caseNumber`),
  INDEX `orthopedic_cases_scope_status_opened_idx` (`facilityId`,`branchId`,`statusCode`,`openedAt`),
  INDEX `orthopedic_cases_patientId_idx` (`patientId`),
  INDEX `orthopedic_cases_clinicianStaffId_idx` (`clinicianStaffId`), PRIMARY KEY (`id`),
  CONSTRAINT `orthopedic_cases_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orthopedic_cases_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orthopedic_cases_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orthopedic_cases_clinicianStaffId_fkey` FOREIGN KEY (`clinicianStaffId`) REFERENCES `staff_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `orthopedic_implants` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `orthopedicCaseId` INTEGER NOT NULL,
  `implantName` VARCHAR(180) NOT NULL, `manufacturer` VARCHAR(180) NULL,
  `lotNumber` VARCHAR(100) NULL, `serialNumber` VARCHAR(120) NULL,
  `implantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `removalDueAt` DATETIME(3) NULL,
  `notes` TEXT NULL, `priceAmount` DECIMAL(18,2) NOT NULL DEFAULT 0, `invoiceItemId` INTEGER NULL,
  INDEX `orthopedic_implants_caseId_idx` (`orthopedicCaseId`),
  INDEX `orthopedic_implants_lotNumber_idx` (`lotNumber`),
  INDEX `orthopedic_implants_serialNumber_idx` (`serialNumber`), PRIMARY KEY (`id`),
  CONSTRAINT `orthopedic_implants_caseId_fkey` FOREIGN KEY (`orthopedicCaseId`) REFERENCES `orthopedic_cases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `physiotherapy_referrals` (
  `id` INTEGER NOT NULL AUTO_INCREMENT, `orthopedicCaseId` INTEGER NOT NULL,
  `referredByStaffId` INTEGER NOT NULL, `referralReason` TEXT NOT NULL,
  `goals` TEXT NULL, `precautions` TEXT NULL, `statusCode` VARCHAR(40) NOT NULL DEFAULT 'REFERRED',
  `referredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `firstSessionAt` DATETIME(3) NULL, `completedAt` DATETIME(3) NULL,
  INDEX `physiotherapy_referrals_caseId_idx` (`orthopedicCaseId`),
  INDEX `physiotherapy_referrals_staffId_idx` (`referredByStaffId`),
  INDEX `physiotherapy_referrals_statusCode_idx` (`statusCode`), PRIMARY KEY (`id`),
  CONSTRAINT `physiotherapy_referrals_caseId_fkey` FOREIGN KEY (`orthopedicCaseId`) REFERENCES `orthopedic_cases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `physiotherapy_referrals_staffId_fkey` FOREIGN KEY (`referredByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
