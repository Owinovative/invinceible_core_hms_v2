ALTER TABLE `facilities`
  ADD COLUMN `latitude` DOUBLE NULL,
  ADD COLUMN `longitude` DOUBLE NULL,
  ADD COLUMN `mapLocationLabel` VARCHAR(255) NULL,
  ADD COLUMN `googleMapsUrl` VARCHAR(500) NULL;

ALTER TABLE `staff_members`
  ADD COLUMN `nationalIdNumber` VARCHAR(80) NULL,
  ADD COLUMN `nationalIdImageUrl` LONGTEXT NULL,
  ADD COLUMN `passportPhotoUrl` LONGTEXT NULL,
  ADD COLUMN `clinicianRegistrationNumber` VARCHAR(120) NULL,
  ADD COLUMN `clinicianBoard` VARCHAR(160) NULL;

ALTER TABLE `lab_results`
  ADD COLUMN `attachmentFileName` VARCHAR(255) NULL,
  ADD COLUMN `attachmentMimeType` VARCHAR(120) NULL,
  ADD COLUMN `attachmentDataUrl` LONGTEXT NULL;

CREATE INDEX `facilities_latitude_longitude_idx` ON `facilities`(`latitude`, `longitude`);
CREATE INDEX `staff_members_nationalIdNumber_idx` ON `staff_members`(`nationalIdNumber`);
CREATE INDEX `staff_members_clinicianBoard_idx` ON `staff_members`(`clinicianBoard`);
CREATE INDEX `lab_results_recordedAt_idx` ON `lab_results`(`recordedAt`);
CREATE INDEX `lab_results_recordedBy_idx` ON `lab_results`(`recordedBy`);
