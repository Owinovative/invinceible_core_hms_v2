ALTER TABLE `facilities`
  ADD COLUMN `mpesaEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `mpesaEnvironment` VARCHAR(30) NULL,
  ADD COLUMN `mpesaConsumerKey` LONGTEXT NULL,
  ADD COLUMN `mpesaConsumerSecret` LONGTEXT NULL,
  ADD COLUMN `mpesaPasskey` LONGTEXT NULL,
  ADD COLUMN `mpesaCallbackUrl` VARCHAR(500) NULL,
  ADD COLUMN `mpesaTransactionType` VARCHAR(80) NULL,
  ADD COLUMN `complianceStatus` VARCHAR(50) NOT NULL DEFAULT 'COMPLIANT',
  ADD COLUMN `complianceReason` TEXT NULL,
  ADD COLUMN `complianceDeactivatedAt` DATETIME(3) NULL,
  ADD COLUMN `complianceGraceEndsAt` DATETIME(3) NULL,
  ADD COLUMN `complianceReactivatedAt` DATETIME(3) NULL;

CREATE INDEX `facilities_complianceStatus_idx` ON `facilities`(`complianceStatus`);
CREATE INDEX `facilities_complianceGraceEndsAt_idx` ON `facilities`(`complianceGraceEndsAt`);
