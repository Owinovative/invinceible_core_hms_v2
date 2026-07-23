-- Pharmacy locations, batch/expiry control, medicine returns and traceable
-- inventory movements. Existing branch stock remains the aggregate balance.

CREATE TABLE "pharmacy_locations" (
  "id" SERIAL NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "locationType" VARCHAR(40) NOT NULL DEFAULT 'MAIN',
  "isDispensingLocation" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pharmacy_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pharmacy_locations_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_locations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "pharmacy_locations_branchId_code_key" ON "pharmacy_locations"("branchId", "code");
CREATE INDEX "pharmacy_locations_facilityId_branchId_isActive_idx" ON "pharmacy_locations"("facilityId", "branchId", "isActive");

CREATE TABLE "pharmacy_location_stocks" (
  "id" SERIAL NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "pharmacyLocationId" INTEGER NOT NULL,
  "medicineId" INTEGER NOT NULL,
  "branchStockId" INTEGER,
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  "reorderLevel" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pharmacy_location_stocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pharmacy_location_stocks_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_location_stocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_location_stocks_locationId_fkey" FOREIGN KEY ("pharmacyLocationId") REFERENCES "pharmacy_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_location_stocks_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_location_stocks_branchStockId_fkey" FOREIGN KEY ("branchStockId") REFERENCES "branch_medicine_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "pharmacy_location_stocks_location_medicine_key" ON "pharmacy_location_stocks"("pharmacyLocationId", "medicineId");
CREATE INDEX "pharmacy_location_stocks_facility_branch_active_idx" ON "pharmacy_location_stocks"("facilityId", "branchId", "isActive");
CREATE INDEX "pharmacy_location_stocks_medicineId_idx" ON "pharmacy_location_stocks"("medicineId");
CREATE INDEX "pharmacy_location_stocks_branchStockId_idx" ON "pharmacy_location_stocks"("branchStockId");

CREATE TABLE "medicine_batches" (
  "id" SERIAL NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "pharmacyLocationId" INTEGER NOT NULL,
  "medicineId" INTEGER NOT NULL,
  "branchStockId" INTEGER,
  "batchNumber" VARCHAR(100) NOT NULL,
  "supplierName" VARCHAR(180),
  "manufacturerName" VARCHAR(180),
  "manufacturedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "quantityReceived" INTEGER NOT NULL,
  "quantityAvailable" INTEGER NOT NULL,
  "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "statusCode" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "medicine_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medicine_batches_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_batches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_batches_locationId_fkey" FOREIGN KEY ("pharmacyLocationId") REFERENCES "pharmacy_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_batches_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_batches_branchStockId_fkey" FOREIGN KEY ("branchStockId") REFERENCES "branch_medicine_stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "medicine_batches_location_medicine_batch_key" ON "medicine_batches"("pharmacyLocationId", "medicineId", "batchNumber");
CREATE INDEX "medicine_batches_facility_branch_expiry_idx" ON "medicine_batches"("facilityId", "branchId", "expiresAt");
CREATE INDEX "medicine_batches_medicine_expiry_idx" ON "medicine_batches"("medicineId", "expiresAt");
CREATE INDEX "medicine_batches_status_expiry_idx" ON "medicine_batches"("statusCode", "expiresAt");
CREATE INDEX "medicine_batches_branchStockId_idx" ON "medicine_batches"("branchStockId");

CREATE TABLE "medicine_returns" (
  "id" SERIAL NOT NULL,
  "returnNumber" VARCHAR(60) NOT NULL,
  "facilityId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "pharmacyLocationId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "dispenseId" INTEGER,
  "statusCode" VARCHAR(50) NOT NULL DEFAULT 'PENDING_INSPECTION',
  "returnReason" TEXT NOT NULL,
  "inspectionNotes" TEXT,
  "receivedByStaffId" INTEGER,
  "reviewedByStaffId" INTEGER,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "medicine_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medicine_returns_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_returns_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_returns_locationId_fkey" FOREIGN KEY ("pharmacyLocationId") REFERENCES "pharmacy_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_returns_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_returns_dispenseId_fkey" FOREIGN KEY ("dispenseId") REFERENCES "dispenses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "medicine_returns_receivedByStaffId_fkey" FOREIGN KEY ("receivedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "medicine_returns_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "medicine_returns_returnNumber_key" ON "medicine_returns"("returnNumber");
CREATE INDEX "medicine_returns_facility_branch_status_received_idx" ON "medicine_returns"("facilityId", "branchId", "statusCode", "receivedAt");
CREATE INDEX "medicine_returns_patientId_idx" ON "medicine_returns"("patientId");
CREATE INDEX "medicine_returns_dispenseId_idx" ON "medicine_returns"("dispenseId");
CREATE INDEX "medicine_returns_locationId_idx" ON "medicine_returns"("pharmacyLocationId");

CREATE TABLE "medicine_return_items" (
  "id" SERIAL NOT NULL,
  "medicineReturnId" INTEGER NOT NULL,
  "dispenseItemId" INTEGER,
  "medicineId" INTEGER NOT NULL,
  "medicineBatchId" INTEGER,
  "quantityReturned" INTEGER NOT NULL,
  "conditionCode" VARCHAR(50) NOT NULL,
  "dispositionCode" VARCHAR(50),
  "dispositionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "medicine_return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medicine_return_items_returnId_fkey" FOREIGN KEY ("medicineReturnId") REFERENCES "medicine_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_return_items_dispenseItemId_fkey" FOREIGN KEY ("dispenseItemId") REFERENCES "dispense_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "medicine_return_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "medicine_return_items_batchId_fkey" FOREIGN KEY ("medicineBatchId") REFERENCES "medicine_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "medicine_return_items_returnId_idx" ON "medicine_return_items"("medicineReturnId");
CREATE INDEX "medicine_return_items_dispenseItemId_idx" ON "medicine_return_items"("dispenseItemId");
CREATE INDEX "medicine_return_items_medicineId_idx" ON "medicine_return_items"("medicineId");
CREATE INDEX "medicine_return_items_batchId_idx" ON "medicine_return_items"("medicineBatchId");

ALTER TABLE "pharmacy_stock_movements"
  ADD COLUMN "pharmacyLocationId" INTEGER,
  ADD COLUMN "medicineBatchId" INTEGER,
  ADD COLUMN "medicineReturnItemId" INTEGER;
CREATE INDEX "pharmacy_stock_movements_locationId_idx" ON "pharmacy_stock_movements"("pharmacyLocationId");
CREATE INDEX "pharmacy_stock_movements_batchId_idx" ON "pharmacy_stock_movements"("medicineBatchId");
CREATE INDEX "pharmacy_stock_movements_returnItemId_idx" ON "pharmacy_stock_movements"("medicineReturnItemId");
ALTER TABLE "pharmacy_stock_movements"
  ADD CONSTRAINT "pharmacy_stock_movements_locationId_fkey" FOREIGN KEY ("pharmacyLocationId") REFERENCES "pharmacy_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "pharmacy_stock_movements_batchId_fkey" FOREIGN KEY ("medicineBatchId") REFERENCES "medicine_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "pharmacy_stock_movements_returnItemId_fkey" FOREIGN KEY ("medicineReturnItemId") REFERENCES "medicine_return_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
