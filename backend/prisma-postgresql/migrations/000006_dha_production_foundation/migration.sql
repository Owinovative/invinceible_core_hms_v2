-- DHA production foundation: registry identifiers, structured claim lifecycle
-- fields, and encrypted-at-rest consent credential columns.

ALTER TABLE "facilities"
  ADD COLUMN "dhaFacilityId" VARCHAR(160),
  ADD COLUMN "dhaFacilityIdType" VARCHAR(40) DEFAULT 'fr-code',
  ADD COLUMN "dhaRegistryStatus" VARCHAR(40),
  ADD COLUMN "dhaRegistryVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "facilities_dhaFacilityId_key" ON "facilities"("dhaFacilityId");

ALTER TABLE "staff_members"
  ADD COLUMN "dhaPractitionerId" VARCHAR(160),
  ADD COLUMN "dhaLicenseStatus" VARCHAR(40),
  ADD COLUMN "dhaRegistryVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "staff_members_dhaPractitionerId_key" ON "staff_members"("dhaPractitionerId");

ALTER TABLE "patients"
  ADD COLUMN "dhaClientRegistryId" VARCHAR(160),
  ADD COLUMN "dhaIdentificationType" VARCHAR(80),
  ADD COLUMN "dhaIdentificationNumber" VARCHAR(160),
  ADD COLUMN "dhaRegistryStatus" VARCHAR(40),
  ADD COLUMN "dhaRegistryVersion" VARCHAR(80),
  ADD COLUMN "dhaRegistryVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "patients_facilityId_dhaClientRegistryId_key"
  ON "patients"("facilityId", "dhaClientRegistryId");
CREATE INDEX "patients_facilityId_dhaIdentificationType_dhaIdentific_idx"
  ON "patients"("facilityId", "dhaIdentificationType", "dhaIdentificationNumber");

ALTER TABLE "sha_claims"
  ADD COLUMN "dhaVisitId" VARCHAR(160),
  ADD COLUMN "dhaExternalClaimId" VARCHAR(160),
  ADD COLUMN "preauthorizationId" VARCHAR(160),
  ADD COLUMN "preauthorizationType" VARCHAR(60),
  ADD COLUMN "preauthorizationStatus" VARCHAR(60),
  ADD COLUMN "preauthorizationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "dhaSpecVersion" VARCHAR(80);
CREATE INDEX "sha_claims_dhaVisitId_idx" ON "sha_claims"("dhaVisitId");
CREATE INDEX "sha_claims_dhaExternalClaimId_idx" ON "sha_claims"("dhaExternalClaimId");
CREATE INDEX "sha_claims_preauthorizationId_idx" ON "sha_claims"("preauthorizationId");

ALTER TABLE "consent_authorizations"
  ALTER COLUMN "consentToken" DROP NOT NULL,
  ADD COLUMN "consentTokenCiphertext" TEXT,
  ADD COLUMN "authGuidCiphertext" TEXT;
