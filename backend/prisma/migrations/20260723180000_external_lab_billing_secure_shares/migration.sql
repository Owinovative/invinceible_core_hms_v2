ALTER TABLE `external_lab_referrals`
  ADD COLUMN `invoiceNumber` VARCHAR(60) NULL,
  ADD COLUMN `totalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN `paidAmount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN `balanceAmount` DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE `external_lab_referrals`
SET
  `invoiceNumber` = CONCAT('XLABINV-', LPAD(`id`, 8, '0')),
  `totalAmount` = (
    SELECT COALESCE(SUM(`priceAmount`), 0)
    FROM `external_lab_order_items`
    WHERE `external_lab_order_items`.`externalLabReferralId` = `external_lab_referrals`.`id`
  ),
  `balanceAmount` = (
    SELECT COALESCE(SUM(`priceAmount`), 0)
    FROM `external_lab_order_items`
    WHERE `external_lab_order_items`.`externalLabReferralId` = `external_lab_referrals`.`id`
  );

ALTER TABLE `external_lab_referrals`
  MODIFY COLUMN `invoiceNumber` VARCHAR(60) NOT NULL,
  ADD UNIQUE INDEX `external_lab_referrals_invoiceNumber_key` (`invoiceNumber`);

CREATE TABLE `external_lab_payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `paymentNumber` VARCHAR(60) NOT NULL,
  `externalLabReferralId` INTEGER NOT NULL,
  `amount` DECIMAL(18,2) NOT NULL,
  `paymentMethod` VARCHAR(40) NOT NULL,
  `transactionReference` VARCHAR(120) NULL,
  `receivedByUserId` INTEGER NULL,
  `receivedByStaffId` INTEGER NULL,
  `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `external_lab_payments_paymentNumber_key` (`paymentNumber`),
  INDEX `external_lab_payments_referral_paid_idx` (`externalLabReferralId`, `paidAt`),
  UNIQUE INDEX `external_lab_payments_paymentMethod_transactionReference_key` (`paymentMethod`, `transactionReference`),
  PRIMARY KEY (`id`),
  CONSTRAINT `external_lab_payments_referral_fkey`
    FOREIGN KEY (`externalLabReferralId`) REFERENCES `external_lab_referrals` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `external_lab_report_shares` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `externalLabReferralId` INTEGER NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `accessCount` INTEGER NOT NULL DEFAULT 0,
  `lastAccessedAt` DATETIME(3) NULL,
  `createdByUserId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `external_lab_report_shares_tokenHash_key` (`tokenHash`),
  INDEX `external_lab_report_shares_referral_expires_idx` (`externalLabReferralId`, `expiresAt`),
  INDEX `external_lab_report_shares_expires_revoked_idx` (`expiresAt`, `revokedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `external_lab_report_shares_referral_fkey`
    FOREIGN KEY (`externalLabReferralId`) REFERENCES `external_lab_referrals` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
