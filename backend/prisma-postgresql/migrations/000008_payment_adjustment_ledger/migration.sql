CREATE TABLE "payment_adjustments" (
  "id" SERIAL NOT NULL,
  "adjustmentNumber" VARCHAR(60) NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER,
  "invoiceId" INTEGER NOT NULL,
  "paymentId" INTEGER NOT NULL,
  "adjustmentType" VARCHAR(30) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "statusCode" VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
  "actorUserId" INTEGER,
  "actorStaffId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_adjustments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_adjustments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "payment_adjustments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_adjustments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "payment_adjustments_adjustmentNumber_key" ON "payment_adjustments"("adjustmentNumber");
CREATE INDEX "payment_adjustments_facility_branch_created_idx" ON "payment_adjustments"("facilityId", "branchId", "createdAt");
CREATE INDEX "payment_adjustments_invoiceId_idx" ON "payment_adjustments"("invoiceId");
CREATE INDEX "payment_adjustments_payment_status_idx" ON "payment_adjustments"("paymentId", "statusCode");
CREATE INDEX "payment_adjustments_actorUserId_idx" ON "payment_adjustments"("actorUserId");
CREATE INDEX "payment_adjustments_actorStaffId_idx" ON "payment_adjustments"("actorStaffId");
