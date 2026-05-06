ALTER TABLE `patients` ADD COLUMN `portalUserId` INTEGER NULL;
CREATE UNIQUE INDEX `patients_portalUserId_key` ON `patients`(`portalUserId`);
CREATE INDEX `patients_portalUserId_idx` ON `patients`(`portalUserId`);
ALTER TABLE `patients` ADD CONSTRAINT `patients_portalUserId_fkey` FOREIGN KEY (`portalUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `data_outbox_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `eventType` VARCHAR(120) NOT NULL,
  `entityType` VARCHAR(120) NOT NULL,
  `entityId` VARCHAR(120) NOT NULL,
  `facilityId` INTEGER NULL,
  `branchId` INTEGER NULL,
  `payload` JSON NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `data_outbox_events_status_createdAt_idx` ON `data_outbox_events`(`status`, `createdAt`);
CREATE INDEX `data_outbox_events_facility_branch_createdAt_idx` ON `data_outbox_events`(`facilityId`, `branchId`, `createdAt`);
CREATE INDEX `data_outbox_events_eventType_idx` ON `data_outbox_events`(`eventType`);
