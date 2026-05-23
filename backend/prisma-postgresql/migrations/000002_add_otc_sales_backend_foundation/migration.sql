-- Add backend foundation tables for one-page OTC drug sales.
CREATE TABLE "otc_sales" (
    "id" SERIAL NOT NULL,
    "saleNumber" VARCHAR(50) NOT NULL,
    "saleType" VARCHAR(20) NOT NULL DEFAULT 'OTC',
    "customerName" VARCHAR(150),
    "customerPhone" VARCHAR(30),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soldAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "patientId" INTEGER,
    "createdByStaffId" INTEGER NOT NULL,

    CONSTRAINT "otc_sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "otc_sale_items" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "medicineNameSnapshot" VARCHAR(180) NOT NULL,
    "dosageFormSnapshot" VARCHAR(100),
    "strengthSnapshot" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockBefore" INTEGER,
    "stockAfter" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otc_sale_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "otc_sale_payments" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "statusCode" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionRef" VARCHAR(120),
    "phoneNumber" VARCHAR(30),
    "mpesaReceiptNumber" VARCHAR(100),
    "merchantRequestId" VARCHAR(100),
    "checkoutRequestId" VARCHAR(100),
    "insuranceProviderName" VARCHAR(150),
    "insuranceSchemeName" VARCHAR(150),
    "insuranceMemberNumber" VARCHAR(120),
    "principalMemberName" VARCHAR(150),
    "relationshipToPrincipal" VARCHAR(80),
    "authorizationNumber" VARCHAR(120),
    "policyNumber" VARCHAR(120),
    "insuranceCoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patientCoPayAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceClaimReference" VARCHAR(120),
    "insuranceClaimStatus" VARCHAR(50),
    "paidAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "receivedByStaffId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otc_sale_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pharmacy_stock_movements" (
    "id" SERIAL NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "branchStockId" INTEGER,
    "sourceType" VARCHAR(50) NOT NULL,
    "sourceEntityId" VARCHAR(100),
    "movementType" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "otcSaleId" INTEGER,
    "otcSaleItemId" INTEGER,
    "performedByStaffId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "otc_sales_saleNumber_key" ON "otc_sales"("saleNumber");
CREATE INDEX "otc_sales_facilityId_idx" ON "otc_sales"("facilityId");
CREATE INDEX "otc_sales_branchId_idx" ON "otc_sales"("branchId");
CREATE INDEX "otc_sales_patientId_idx" ON "otc_sales"("patientId");
CREATE INDEX "otc_sales_createdByStaffId_idx" ON "otc_sales"("createdByStaffId");
CREATE INDEX "otc_sales_status_idx" ON "otc_sales"("status");
CREATE INDEX "otc_sales_paymentStatus_idx" ON "otc_sales"("paymentStatus");
CREATE INDEX "otc_sales_createdAt_idx" ON "otc_sales"("createdAt");
CREATE INDEX "otc_sales_soldAt_idx" ON "otc_sales"("soldAt");
CREATE INDEX "otc_sales_facilityId_branchId_status_createdAt_idx" ON "otc_sales"("facilityId", "branchId", "status", "createdAt");

CREATE INDEX "otc_sale_items_saleId_idx" ON "otc_sale_items"("saleId");
CREATE INDEX "otc_sale_items_medicineId_idx" ON "otc_sale_items"("medicineId");

CREATE INDEX "otc_sale_payments_saleId_idx" ON "otc_sale_payments"("saleId");
CREATE INDEX "otc_sale_payments_facilityId_idx" ON "otc_sale_payments"("facilityId");
CREATE INDEX "otc_sale_payments_branchId_idx" ON "otc_sale_payments"("branchId");
CREATE INDEX "otc_sale_payments_paymentMethod_idx" ON "otc_sale_payments"("paymentMethod");
CREATE INDEX "otc_sale_payments_statusCode_idx" ON "otc_sale_payments"("statusCode");
CREATE INDEX "otc_sale_payments_insuranceClaimStatus_idx" ON "otc_sale_payments"("insuranceClaimStatus");
CREATE INDEX "otc_sale_payments_mpesaReceiptNumber_idx" ON "otc_sale_payments"("mpesaReceiptNumber");
CREATE INDEX "otc_sale_payments_checkoutRequestId_idx" ON "otc_sale_payments"("checkoutRequestId");
CREATE INDEX "otc_sale_payments_createdAt_idx" ON "otc_sale_payments"("createdAt");
CREATE INDEX "otc_sale_payments_facilityId_branchId_paymentMethod_created_idx" ON "otc_sale_payments"("facilityId", "branchId", "paymentMethod", "createdAt");

CREATE INDEX "pharmacy_stock_movements_facilityId_idx" ON "pharmacy_stock_movements"("facilityId");
CREATE INDEX "pharmacy_stock_movements_branchId_idx" ON "pharmacy_stock_movements"("branchId");
CREATE INDEX "pharmacy_stock_movements_medicineId_idx" ON "pharmacy_stock_movements"("medicineId");
CREATE INDEX "pharmacy_stock_movements_branchStockId_idx" ON "pharmacy_stock_movements"("branchStockId");
CREATE INDEX "pharmacy_stock_movements_sourceType_idx" ON "pharmacy_stock_movements"("sourceType");
CREATE INDEX "pharmacy_stock_movements_movementType_idx" ON "pharmacy_stock_movements"("movementType");
CREATE INDEX "pharmacy_stock_movements_otcSaleId_idx" ON "pharmacy_stock_movements"("otcSaleId");
CREATE INDEX "pharmacy_stock_movements_otcSaleItemId_idx" ON "pharmacy_stock_movements"("otcSaleItemId");
CREATE INDEX "pharmacy_stock_movements_performedByStaffId_idx" ON "pharmacy_stock_movements"("performedByStaffId");
CREATE INDEX "pharmacy_stock_movements_createdAt_idx" ON "pharmacy_stock_movements"("createdAt");
CREATE INDEX "pharmacy_stock_movements_facilityId_branchId_sourceType_cre_idx" ON "pharmacy_stock_movements"("facilityId", "branchId", "sourceType", "createdAt");

ALTER TABLE "otc_sales" ADD CONSTRAINT "otc_sales_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otc_sales" ADD CONSTRAINT "otc_sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otc_sales" ADD CONSTRAINT "otc_sales_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "otc_sales" ADD CONSTRAINT "otc_sales_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "otc_sale_items" ADD CONSTRAINT "otc_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "otc_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otc_sale_items" ADD CONSTRAINT "otc_sale_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "otc_sale_payments" ADD CONSTRAINT "otc_sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "otc_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otc_sale_payments" ADD CONSTRAINT "otc_sale_payments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otc_sale_payments" ADD CONSTRAINT "otc_sale_payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "otc_sale_payments" ADD CONSTRAINT "otc_sale_payments_receivedByStaffId_fkey" FOREIGN KEY ("receivedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_branchStockId_fkey" FOREIGN KEY ("branchStockId") REFERENCES "branch_medicine_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_otcSaleId_fkey" FOREIGN KEY ("otcSaleId") REFERENCES "otc_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_otcSaleItemId_fkey" FOREIGN KEY ("otcSaleItemId") REFERENCES "otc_sale_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_performedByStaffId_fkey" FOREIGN KEY ("performedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
