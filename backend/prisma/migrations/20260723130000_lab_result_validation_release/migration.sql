ALTER TABLE `lab_results`
  ADD COLUMN `statusCode` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `validatedByStaffId` INTEGER NULL,
  ADD COLUMN `validatedAt` DATETIME(3) NULL,
  ADD COLUMN `validationNotes` TEXT NULL,
  ADD COLUMN `releasedByStaffId` INTEGER NULL,
  ADD COLUMN `releasedAt` DATETIME(3) NULL,
  ADD COLUMN `signatureHash` VARCHAR(128) NULL,
  ADD COLUMN `amendmentReason` TEXT NULL;

CREATE INDEX `lab_results_statusCode_validatedAt_idx`
  ON `lab_results`(`statusCode`, `validatedAt`);
CREATE INDEX `lab_results_releasedAt_idx` ON `lab_results`(`releasedAt`);
