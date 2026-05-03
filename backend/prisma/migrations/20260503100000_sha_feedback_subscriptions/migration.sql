-- SHA billing connection
ALTER TABLE `payments` ADD COLUMN `shaClaimId` INTEGER NULL;
CREATE INDEX `payments_shaClaimId_idx` ON `payments`(`shaClaimId`);
ALTER TABLE `payments` ADD CONSTRAINT `payments_shaClaimId_fkey` FOREIGN KEY (`shaClaimId`) REFERENCES `sha_claims`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Facility subscription billing
ALTER TABLE `facilities`
  ADD COLUMN `subscriptionMonthlyFee` DOUBLE NOT NULL DEFAULT 5000,
  ADD COLUMN `subscriptionStartedAt` DATETIME(3) NULL,
  ADD COLUMN `subscriptionPaidThrough` DATETIME(3) NULL,
  ADD COLUMN `subscriptionStatus` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `subscriptionLockedAt` DATETIME(3) NULL;

CREATE TABLE `facility_subscription_payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `paymentNumber` VARCHAR(80) NOT NULL,
  `facilityId` INTEGER NOT NULL,
  `amount` DOUBLE NOT NULL DEFAULT 0,
  `monthlyFee` DOUBLE NOT NULL DEFAULT 5000,
  `monthsCovered` DOUBLE NOT NULL DEFAULT 0,
  `paidFrom` DATETIME(3) NULL,
  `paidThrough` DATETIME(3) NULL,
  `paymentMethod` VARCHAR(50) NULL,
  `reference` VARCHAR(120) NULL,
  `notes` TEXT NULL,
  `recordedByUserId` INTEGER NULL,
  `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `facility_subscription_payments_paymentNumber_key`(`paymentNumber`),
  INDEX `facility_subscription_payments_facilityId_idx`(`facilityId`),
  INDEX `facility_subscription_payments_paidAt_idx`(`paidAt`),
  INDEX `facility_subscription_payments_paidThrough_idx`(`paidThrough`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `facility_subscription_payments` ADD CONSTRAINT `facility_subscription_payments_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- User feedback to super admins
CREATE TABLE `user_feedback` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `subject` VARCHAR(160) NOT NULL,
  `message` TEXT NOT NULL,
  `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
  `statusCode` VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  `replyText` TEXT NULL,
  `repliedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `facilityId` INTEGER NULL,
  `branchId` INTEGER NULL,
  `createdByUserId` INTEGER NULL,
  `createdByStaffId` INTEGER NULL,
  `repliedByUserId` INTEGER NULL,
  INDEX `user_feedback_facilityId_idx`(`facilityId`),
  INDEX `user_feedback_branchId_idx`(`branchId`),
  INDEX `user_feedback_createdByUserId_idx`(`createdByUserId`),
  INDEX `user_feedback_createdByStaffId_idx`(`createdByStaffId`),
  INDEX `user_feedback_repliedByUserId_idx`(`repliedByUserId`),
  INDEX `user_feedback_statusCode_idx`(`statusCode`),
  INDEX `user_feedback_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_feedback` ADD CONSTRAINT `user_feedback_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `user_feedback` ADD CONSTRAINT `user_feedback_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `user_feedback` ADD CONSTRAINT `user_feedback_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `user_feedback` ADD CONSTRAINT `user_feedback_createdByStaffId_fkey` FOREIGN KEY (`createdByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `user_feedback` ADD CONSTRAINT `user_feedback_repliedByUserId_fkey` FOREIGN KEY (`repliedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
