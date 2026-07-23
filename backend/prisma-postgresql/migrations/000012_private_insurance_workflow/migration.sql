CREATE TABLE "insurance_payers" (
  "id" SERIAL NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "payerType" VARCHAR(40) NOT NULL DEFAULT 'PRIVATE',
  "integrationBaseUrl" VARCHAR(500),
  "eligibilityPath" VARCHAR(300),
  "claimSubmissionPath" VARCHAR(300),
  "authorizationCiphertext" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_payers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_payers_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "insurance_payers_facilityId_code_key" ON "insurance_payers"("facilityId", "code");
CREATE INDEX "insurance_payers_facilityId_payerType_isActive_idx" ON "insurance_payers"("facilityId", "payerType", "isActive");

CREATE TABLE "patient_insurance_policies" (
  "id" SERIAL NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER,
  "patientId" INTEGER NOT NULL,
  "insurancePayerId" INTEGER NOT NULL,
  "policyNumber" VARCHAR(120) NOT NULL,
  "memberNumber" VARCHAR(120),
  "principalMemberName" VARCHAR(180),
  "relationshipToPrincipal" VARCHAR(60),
  "coverStartAt" TIMESTAMP(3),
  "coverEndAt" TIMESTAMP(3),
  "benefitLimit" DECIMAL(18, 2),
  "statusCode" VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "lastVerifiedAt" TIMESTAMP(3),
  "verificationReference" VARCHAR(160),
  "verificationResponse" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patient_insurance_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_insurance_policies_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patient_insurance_policies_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "patient_insurance_policies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patient_insurance_policies_insurancePayerId_fkey" FOREIGN KEY ("insurancePayerId") REFERENCES "insurance_payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patient_insurance_policies_payer_policy_patient_key" ON "patient_insurance_policies"("insurancePayerId", "policyNumber", "patientId");
CREATE INDEX "patient_insurance_policies_scope_status_idx" ON "patient_insurance_policies"("facilityId", "branchId", "statusCode");
CREATE INDEX "patient_insurance_policies_patientId_idx" ON "patient_insurance_policies"("patientId");

CREATE TABLE "private_insurance_claims" (
  "id" SERIAL NOT NULL,
  "claimNumber" VARCHAR(70) NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER,
  "insurancePayerId" INTEGER NOT NULL,
  "patientInsurancePolicyId" INTEGER NOT NULL,
  "invoiceId" INTEGER NOT NULL,
  "statusCode" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "claimedAmount" DECIMAL(18, 2) NOT NULL,
  "approvedAmount" DECIMAL(18, 2),
  "externalClaimId" VARCHAR(160),
  "submissionReference" VARCHAR(160),
  "submittedAt" TIMESTAMP(3),
  "responsePayload" TEXT,
  "rejectionReason" TEXT,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "private_insurance_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "private_insurance_claims_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "private_insurance_claims_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "private_insurance_claims_insurancePayerId_fkey" FOREIGN KEY ("insurancePayerId") REFERENCES "insurance_payers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "private_insurance_claims_policyId_fkey" FOREIGN KEY ("patientInsurancePolicyId") REFERENCES "patient_insurance_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "private_insurance_claims_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "private_insurance_claims_claimNumber_key" ON "private_insurance_claims"("claimNumber");
CREATE UNIQUE INDEX "private_insurance_claims_policy_invoice_key" ON "private_insurance_claims"("patientInsurancePolicyId", "invoiceId");
CREATE INDEX "private_insurance_claims_scope_status_created_idx" ON "private_insurance_claims"("facilityId", "branchId", "statusCode", "createdAt");
CREATE INDEX "private_insurance_claims_insurancePayerId_idx" ON "private_insurance_claims"("insurancePayerId");
CREATE INDEX "private_insurance_claims_policyId_idx" ON "private_insurance_claims"("patientInsurancePolicyId");
CREATE INDEX "private_insurance_claims_invoiceId_idx" ON "private_insurance_claims"("invoiceId");
CREATE INDEX "private_insurance_claims_externalClaimId_idx" ON "private_insurance_claims"("externalClaimId");
