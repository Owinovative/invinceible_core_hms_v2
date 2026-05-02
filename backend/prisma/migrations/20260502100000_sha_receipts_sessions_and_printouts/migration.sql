ALTER TABLE `facilities`
  MODIFY COLUMN `logoUrl` LONGTEXT NULL,
  ADD COLUMN `showCashOnInvoice` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `showPaybillOnInvoice` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `showTillOnInvoice` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `showPochiOnInvoice` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `shaFidCode` VARCHAR(120) NULL,
  ADD COLUMN `shaClaimStartNumber` INT NOT NULL DEFAULT 1,
  ADD COLUMN `shaClaimNextNumber` INT NOT NULL DEFAULT 1;

ALTER TABLE `branches`
  ADD COLUMN `latitude` DOUBLE NULL,
  ADD COLUMN `longitude` DOUBLE NULL,
  ADD COLUMN `mapLocationLabel` VARCHAR(255) NULL,
  ADD COLUMN `googleMapsUrl` VARCHAR(500) NULL;

ALTER TABLE `invoice_items`
  ADD COLUMN `discountPercent` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `discountAmount` DOUBLE NOT NULL DEFAULT 0;

CREATE TABLE `user_sessions` (
  `id` VARCHAR(120) NOT NULL,
  `userId` INT NOT NULL,
  `ipAddress` VARCHAR(100) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  `revokeReason` VARCHAR(255) NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `sha_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `claimNumber` VARCHAR(80) NOT NULL,
  `statusCode` VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  `fidCode` VARCHAR(120) NULL,
  `memberNumber` VARCHAR(120) NULL,
  `diagnosisCode` VARCHAR(80) NULL,
  `diagnosisText` VARCHAR(255) NULL,
  `servicePeriodStart` DATETIME(3) NULL,
  `servicePeriodEnd` DATETIME(3) NULL,
  `claimedAmount` DOUBLE NOT NULL DEFAULT 0,
  `approvedAmount` DOUBLE NOT NULL DEFAULT 0,
  `paidAmount` DOUBLE NOT NULL DEFAULT 0,
  `rejectedAmount` DOUBLE NOT NULL DEFAULT 0,
  `rejectionReason` TEXT NULL,
  `submittedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `facilityId` INT NOT NULL,
  `branchId` INT NULL,
  `patientId` INT NOT NULL,
  `invoiceId` INT NULL,
  `createdByStaffId` INT NULL,
  PRIMARY KEY (`id`)
);

CREATE UNIQUE INDEX `sha_claims_claimNumber_key` ON `sha_claims`(`claimNumber`);
CREATE INDEX `branches_latitude_longitude_idx` ON `branches`(`latitude`, `longitude`);
CREATE INDEX `user_sessions_userId_revokedAt_idx` ON `user_sessions`(`userId`, `revokedAt`);
CREATE INDEX `user_sessions_lastSeenAt_idx` ON `user_sessions`(`lastSeenAt`);
CREATE INDEX `sha_claims_facilityId_idx` ON `sha_claims`(`facilityId`);
CREATE INDEX `sha_claims_branchId_idx` ON `sha_claims`(`branchId`);
CREATE INDEX `sha_claims_patientId_idx` ON `sha_claims`(`patientId`);
CREATE INDEX `sha_claims_invoiceId_idx` ON `sha_claims`(`invoiceId`);
CREATE INDEX `sha_claims_statusCode_idx` ON `sha_claims`(`statusCode`);
CREATE INDEX `sha_claims_createdAt_idx` ON `sha_claims`(`createdAt`);

ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sha_claims`
  ADD CONSTRAINT `sha_claims_facilityId_fkey`
  FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `sha_claims_branchId_fkey`
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sha_claims_patientId_fkey`
  FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `sha_claims_invoiceId_fkey`
  FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sha_claims_createdByStaffId_fkey`
  FOREIGN KEY (`createdByStaffId`) REFERENCES `staff_members`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
