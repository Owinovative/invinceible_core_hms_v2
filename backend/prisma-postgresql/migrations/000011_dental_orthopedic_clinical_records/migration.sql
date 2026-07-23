CREATE TABLE "dental_encounters" (
  "id" SERIAL NOT NULL, "encounterNumber" VARCHAR(60) NOT NULL,
  "facilityId" INTEGER NOT NULL, "branchId" INTEGER, "patientId" INTEGER NOT NULL,
  "clinicianStaffId" INTEGER NOT NULL, "chiefComplaint" TEXT, "examinationNotes" TEXT,
  "treatmentPlan" TEXT, "consentReference" VARCHAR(120), "statusCode" VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  "nextReviewAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "dental_encounters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dental_encounters_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dental_encounters_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "dental_encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dental_encounters_clinicianStaffId_fkey" FOREIGN KEY ("clinicianStaffId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "dental_encounters_encounterNumber_key" ON "dental_encounters"("encounterNumber");
CREATE INDEX "dental_encounters_scope_status_started_idx" ON "dental_encounters"("facilityId","branchId","statusCode","startedAt");
CREATE INDEX "dental_encounters_patientId_idx" ON "dental_encounters"("patientId");
CREATE INDEX "dental_encounters_clinicianStaffId_idx" ON "dental_encounters"("clinicianStaffId");

CREATE TABLE "dental_chart_entries" (
  "id" SERIAL NOT NULL, "dentalEncounterId" INTEGER NOT NULL, "toothCode" VARCHAR(20) NOT NULL,
  "surfaceCode" VARCHAR(30), "conditionCode" VARCHAR(80) NOT NULL, "diagnosisCode" VARCHAR(80),
  "notes" TEXT, "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dental_chart_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dental_chart_entries_encounterId_fkey" FOREIGN KEY ("dentalEncounterId") REFERENCES "dental_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "dental_chart_entries_encounterId_idx" ON "dental_chart_entries"("dentalEncounterId");
CREATE INDEX "dental_chart_entries_toothCode_idx" ON "dental_chart_entries"("toothCode");

CREATE TABLE "dental_procedures" (
  "id" SERIAL NOT NULL, "dentalEncounterId" INTEGER NOT NULL, "toothCode" VARCHAR(20),
  "procedureCode" VARCHAR(80) NOT NULL, "procedureName" VARCHAR(180) NOT NULL,
  "procedureNotes" TEXT, "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "priceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0, "invoiceItemId" INTEGER,
  CONSTRAINT "dental_procedures_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dental_procedures_encounterId_fkey" FOREIGN KEY ("dentalEncounterId") REFERENCES "dental_encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "dental_procedures_encounterId_idx" ON "dental_procedures"("dentalEncounterId");
CREATE INDEX "dental_procedures_procedureCode_idx" ON "dental_procedures"("procedureCode");
CREATE INDEX "dental_procedures_invoiceItemId_idx" ON "dental_procedures"("invoiceItemId");

CREATE TABLE "orthopedic_cases" (
  "id" SERIAL NOT NULL, "caseNumber" VARCHAR(60) NOT NULL, "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER, "patientId" INTEGER NOT NULL, "clinicianStaffId" INTEGER NOT NULL,
  "injuryMechanism" TEXT, "anatomicalSite" VARCHAR(150) NOT NULL, "laterality" VARCHAR(30),
  "fractureClassification" VARCHAR(150), "imagingSummary" TEXT, "managementPlan" TEXT,
  "procedureDocumentation" TEXT, "statusCode" VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  "followUpAt" TIMESTAMP(3), "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "orthopedic_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orthopedic_cases_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orthopedic_cases_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "orthopedic_cases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orthopedic_cases_clinicianStaffId_fkey" FOREIGN KEY ("clinicianStaffId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "orthopedic_cases_caseNumber_key" ON "orthopedic_cases"("caseNumber");
CREATE INDEX "orthopedic_cases_scope_status_opened_idx" ON "orthopedic_cases"("facilityId","branchId","statusCode","openedAt");
CREATE INDEX "orthopedic_cases_patientId_idx" ON "orthopedic_cases"("patientId");
CREATE INDEX "orthopedic_cases_clinicianStaffId_idx" ON "orthopedic_cases"("clinicianStaffId");

CREATE TABLE "orthopedic_implants" (
  "id" SERIAL NOT NULL, "orthopedicCaseId" INTEGER NOT NULL, "implantName" VARCHAR(180) NOT NULL,
  "manufacturer" VARCHAR(180), "lotNumber" VARCHAR(100), "serialNumber" VARCHAR(120),
  "implantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "removalDueAt" TIMESTAMP(3),
  "notes" TEXT, "priceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0, "invoiceItemId" INTEGER,
  CONSTRAINT "orthopedic_implants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orthopedic_implants_caseId_fkey" FOREIGN KEY ("orthopedicCaseId") REFERENCES "orthopedic_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "orthopedic_implants_caseId_idx" ON "orthopedic_implants"("orthopedicCaseId");
CREATE INDEX "orthopedic_implants_lotNumber_idx" ON "orthopedic_implants"("lotNumber");
CREATE INDEX "orthopedic_implants_serialNumber_idx" ON "orthopedic_implants"("serialNumber");

CREATE TABLE "physiotherapy_referrals" (
  "id" SERIAL NOT NULL, "orthopedicCaseId" INTEGER NOT NULL, "referredByStaffId" INTEGER NOT NULL,
  "referralReason" TEXT NOT NULL, "goals" TEXT, "precautions" TEXT,
  "statusCode" VARCHAR(40) NOT NULL DEFAULT 'REFERRED',
  "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstSessionAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  CONSTRAINT "physiotherapy_referrals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "physiotherapy_referrals_caseId_fkey" FOREIGN KEY ("orthopedicCaseId") REFERENCES "orthopedic_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "physiotherapy_referrals_staffId_fkey" FOREIGN KEY ("referredByStaffId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "physiotherapy_referrals_caseId_idx" ON "physiotherapy_referrals"("orthopedicCaseId");
CREATE INDEX "physiotherapy_referrals_staffId_idx" ON "physiotherapy_referrals"("referredByStaffId");
CREATE INDEX "physiotherapy_referrals_statusCode_idx" ON "physiotherapy_referrals"("statusCode");
