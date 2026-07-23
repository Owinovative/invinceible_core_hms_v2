CREATE TABLE "external_lab_referrals" (
  "id" SERIAL NOT NULL,
  "referralNumber" VARCHAR(60) NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER,
  "referringFacilityName" VARCHAR(200) NOT NULL,
  "referringFacilityContact" VARCHAR(120),
  "referringClinicianName" VARCHAR(180),
  "externalPatientName" VARCHAR(200) NOT NULL,
  "externalPatientIdentifier" VARCHAR(120),
  "patientPhone" VARCHAR(30),
  "patientEmail" VARCHAR(255),
  "sampleReference" VARCHAR(100) NOT NULL,
  "specimenType" VARCHAR(100),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedByStaffId" INTEGER,
  "clinicalNotes" TEXT,
  "urgency" VARCHAR(30) NOT NULL DEFAULT 'ROUTINE',
  "statusCode" VARCHAR(40) NOT NULL DEFAULT 'RECEIVED',
  "billingCategory" VARCHAR(40) NOT NULL DEFAULT 'EXTERNAL',
  "billingStatus" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_lab_referrals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "external_lab_referrals_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "external_lab_referrals_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "external_lab_referrals_referralNumber_key" ON "external_lab_referrals"("referralNumber");
CREATE INDEX "external_lab_referrals_facility_branch_status_received_idx" ON "external_lab_referrals"("facilityId", "branchId", "statusCode", "receivedAt");
CREATE INDEX "external_lab_referrals_referringFacilityName_idx" ON "external_lab_referrals"("referringFacilityName");
CREATE INDEX "external_lab_referrals_sampleReference_idx" ON "external_lab_referrals"("sampleReference");
CREATE INDEX "external_lab_referrals_externalPatientIdentifier_idx" ON "external_lab_referrals"("externalPatientIdentifier");

CREATE TABLE "external_lab_order_items" (
  "id" SERIAL NOT NULL,
  "externalLabReferralId" INTEGER NOT NULL,
  "testId" INTEGER NOT NULL,
  "instructions" TEXT,
  "statusCode" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "priceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_lab_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "external_lab_order_items_referralId_fkey" FOREIGN KEY ("externalLabReferralId") REFERENCES "external_lab_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "external_lab_order_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "lab_test_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "external_lab_order_items_referralId_idx" ON "external_lab_order_items"("externalLabReferralId");
CREATE INDEX "external_lab_order_items_testId_idx" ON "external_lab_order_items"("testId");
CREATE INDEX "external_lab_order_items_statusCode_idx" ON "external_lab_order_items"("statusCode");

CREATE TABLE "external_lab_results" (
  "id" SERIAL NOT NULL,
  "externalLabOrderItemId" INTEGER NOT NULL,
  "resultValue" TEXT NOT NULL,
  "remarks" TEXT,
  "recordedByStaffId" INTEGER,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statusCode" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  "validatedByStaffId" INTEGER,
  "validatedAt" TIMESTAMP(3),
  "validationNotes" TEXT,
  "releasedByStaffId" INTEGER,
  "releasedAt" TIMESTAMP(3),
  "signatureHash" VARCHAR(128),
  CONSTRAINT "external_lab_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "external_lab_results_orderItemId_fkey" FOREIGN KEY ("externalLabOrderItemId") REFERENCES "external_lab_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "external_lab_results_orderItemId_key" ON "external_lab_results"("externalLabOrderItemId");
CREATE INDEX "external_lab_results_status_validated_idx" ON "external_lab_results"("statusCode", "validatedAt");
CREATE INDEX "external_lab_results_releasedAt_idx" ON "external_lab_results"("releasedAt");
