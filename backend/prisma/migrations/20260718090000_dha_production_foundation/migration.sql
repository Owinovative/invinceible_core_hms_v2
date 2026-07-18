-- DHA production foundation: registry identifiers, structured claim lifecycle
-- fields, and encrypted-at-rest consent credential columns.

ALTER TABLE `facilities`
  ADD COLUMN `dhaFacilityId` VARCHAR(160) NULL,
  ADD COLUMN `dhaFacilityIdType` VARCHAR(40) NULL DEFAULT 'fr-code',
  ADD COLUMN `dhaRegistryStatus` VARCHAR(40) NULL,
  ADD COLUMN `dhaRegistryVerifiedAt` DATETIME(3) NULL;
CREATE UNIQUE INDEX `facilities_dhaFacilityId_key` ON `facilities`(`dhaFacilityId`);

ALTER TABLE `staff_members`
  ADD COLUMN `dhaPractitionerId` VARCHAR(160) NULL,
  ADD COLUMN `dhaLicenseStatus` VARCHAR(40) NULL,
  ADD COLUMN `dhaRegistryVerifiedAt` DATETIME(3) NULL;
CREATE UNIQUE INDEX `staff_members_dhaPractitionerId_key` ON `staff_members`(`dhaPractitionerId`);

ALTER TABLE `patients`
  ADD COLUMN `dhaClientRegistryId` VARCHAR(160) NULL,
  ADD COLUMN `dhaIdentificationType` VARCHAR(80) NULL,
  ADD COLUMN `dhaIdentificationNumber` VARCHAR(160) NULL,
  ADD COLUMN `dhaRegistryStatus` VARCHAR(40) NULL,
  ADD COLUMN `dhaRegistryVersion` VARCHAR(80) NULL,
  ADD COLUMN `dhaRegistryVerifiedAt` DATETIME(3) NULL;
CREATE UNIQUE INDEX `patients_facilityId_dhaClientRegistryId_key`
  ON `patients`(`facilityId`, `dhaClientRegistryId`);
CREATE INDEX `patients_facilityId_dhaIdentificationType_dhaIdentific_idx`
  ON `patients`(`facilityId`, `dhaIdentificationType`, `dhaIdentificationNumber`);

ALTER TABLE `sha_claims`
  ADD COLUMN `dhaVisitId` VARCHAR(160) NULL,
  ADD COLUMN `dhaExternalClaimId` VARCHAR(160) NULL,
  ADD COLUMN `preauthorizationId` VARCHAR(160) NULL,
  ADD COLUMN `preauthorizationType` VARCHAR(60) NULL,
  ADD COLUMN `preauthorizationStatus` VARCHAR(60) NULL,
  ADD COLUMN `preauthorizationExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `dhaSpecVersion` VARCHAR(80) NULL;
CREATE INDEX `sha_claims_dhaVisitId_idx` ON `sha_claims`(`dhaVisitId`);
CREATE INDEX `sha_claims_dhaExternalClaimId_idx` ON `sha_claims`(`dhaExternalClaimId`);
CREATE INDEX `sha_claims_preauthorizationId_idx` ON `sha_claims`(`preauthorizationId`);

ALTER TABLE `consent_authorizations`
  MODIFY `consentToken` LONGTEXT NULL,
  ADD COLUMN `consentTokenCiphertext` LONGTEXT NULL,
  ADD COLUMN `authGuidCiphertext` LONGTEXT NULL;
