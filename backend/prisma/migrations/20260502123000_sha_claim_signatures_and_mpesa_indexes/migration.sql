ALTER TABLE `sha_claims`
  ADD COLUMN `patientSignatureUrl` LONGTEXT NULL,
  ADD COLUMN `facilitySignatureUrl` LONGTEXT NULL,
  ADD COLUMN `rubberStampUrl` LONGTEXT NULL;

CREATE INDEX `payments_checkoutRequestId_idx` ON `payments`(`checkoutRequestId`);
CREATE INDEX `payments_phoneNumber_idx` ON `payments`(`phoneNumber`);

ALTER TABLE `users`
  ADD COLUMN `pendingDeactivationAt` DATETIME(3) NULL,
  ADD COLUMN `pendingDeactivationRequestedById` INTEGER NULL,
  ADD COLUMN `pendingDeactivationReason` VARCHAR(255) NULL;

CREATE INDEX `users_pendingDeactivationAt_idx` ON `users`(`pendingDeactivationAt`);
