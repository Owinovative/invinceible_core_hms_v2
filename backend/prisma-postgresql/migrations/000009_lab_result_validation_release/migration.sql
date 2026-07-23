ALTER TABLE "lab_results"
  ADD COLUMN "statusCode" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "validatedByStaffId" INTEGER,
  ADD COLUMN "validatedAt" TIMESTAMP(3),
  ADD COLUMN "validationNotes" TEXT,
  ADD COLUMN "releasedByStaffId" INTEGER,
  ADD COLUMN "releasedAt" TIMESTAMP(3),
  ADD COLUMN "signatureHash" VARCHAR(128),
  ADD COLUMN "amendmentReason" TEXT;

CREATE INDEX "lab_results_statusCode_validatedAt_idx"
  ON "lab_results"("statusCode", "validatedAt");
CREATE INDEX "lab_results_releasedAt_idx" ON "lab_results"("releasedAt");
