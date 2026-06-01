-- Add backend foundation tables for one-page OTC drug sales.
CREATE TABLE `otc_sales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleNumber` VARCHAR(50) NOT NULL,
    `saleType` VARCHAR(20) NOT NULL DEFAULT 'OTC',
    `customerName` VARCHAR(150) NULL,
    `customerPhone` VARCHAR(30) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    `paymentStatus` VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    `subtotal` DOUBLE NOT NULL DEFAULT 0,
    `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `balanceAmount` DOUBLE NOT NULL DEFAULT 0,
    `soldAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `patientId` INTEGER NULL,
    `createdByStaffId` INTEGER NOT NULL,

    UNIQUE INDEX `otc_sales_saleNumber_key`(`saleNumber`),
    INDEX `otc_sales_facilityId_idx`(`facilityId`),
    INDEX `otc_sales_branchId_idx`(`branchId`),
    INDEX `otc_sales_patientId_idx`(`patientId`),
    INDEX `otc_sales_createdByStaffId_idx`(`createdByStaffId`),
    INDEX `otc_sales_status_idx`(`status`),
    INDEX `otc_sales_paymentStatus_idx`(`paymentStatus`),
    INDEX `otc_sales_createdAt_idx`(`createdAt`),
    INDEX `otc_sales_soldAt_idx`(`soldAt`),
    INDEX `otc_sales_facilityId_branchId_status_createdAt_idx`(`facilityId`, `branchId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `otc_sale_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `medicineId` INTEGER NOT NULL,
    `medicineNameSnapshot` VARCHAR(180) NOT NULL,
    `dosageFormSnapshot` VARCHAR(100) NULL,
    `strengthSnapshot` VARCHAR(100) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DOUBLE NOT NULL DEFAULT 0,
    `lineTotal` DOUBLE NOT NULL DEFAULT 0,
    `stockBefore` INTEGER NULL,
    `stockAfter` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `otc_sale_items_saleId_idx`(`saleId`),
    INDEX `otc_sale_items_medicineId_idx`(`medicineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `otc_sale_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `paymentMethod` VARCHAR(50) NOT NULL,
    `statusCode` VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `transactionRef` VARCHAR(120) NULL,
    `phoneNumber` VARCHAR(30) NULL,
    `mpesaReceiptNumber` VARCHAR(100) NULL,
    `merchantRequestId` VARCHAR(100) NULL,
    `checkoutRequestId` VARCHAR(100) NULL,
    `insuranceProviderName` VARCHAR(150) NULL,
    `insuranceSchemeName` VARCHAR(150) NULL,
    `insuranceMemberNumber` VARCHAR(120) NULL,
    `principalMemberName` VARCHAR(150) NULL,
    `relationshipToPrincipal` VARCHAR(80) NULL,
    `authorizationNumber` VARCHAR(120) NULL,
    `policyNumber` VARCHAR(120) NULL,
    `insuranceCoveredAmount` DOUBLE NOT NULL DEFAULT 0,
    `patientCoPayAmount` DOUBLE NOT NULL DEFAULT 0,
    `insuranceClaimReference` VARCHAR(120) NULL,
    `insuranceClaimStatus` VARCHAR(50) NULL,
    `paidAt` DATETIME(3) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `receivedByStaffId` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `otc_sale_payments_saleId_idx`(`saleId`),
    INDEX `otc_sale_payments_facilityId_idx`(`facilityId`),
    INDEX `otc_sale_payments_branchId_idx`(`branchId`),
    INDEX `otc_sale_payments_paymentMethod_idx`(`paymentMethod`),
    INDEX `otc_sale_payments_statusCode_idx`(`statusCode`),
    INDEX `otc_sale_payments_insuranceClaimStatus_idx`(`insuranceClaimStatus`),
    INDEX `otc_sale_payments_mpesaReceiptNumber_idx`(`mpesaReceiptNumber`),
    INDEX `otc_sale_payments_checkoutRequestId_idx`(`checkoutRequestId`),
    INDEX `otc_sale_payments_createdAt_idx`(`createdAt`),
    INDEX `otc_sale_payments_facilityId_branchId_paymentMethod_createdA_idx`(`facilityId`, `branchId`, `paymentMethod`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pharmacy_stock_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NOT NULL,
    `medicineId` INTEGER NOT NULL,
    `branchStockId` INTEGER NULL,
    `sourceType` VARCHAR(50) NOT NULL,
    `sourceEntityId` VARCHAR(100) NULL,
    `movementType` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `stockBefore` INTEGER NOT NULL,
    `stockAfter` INTEGER NOT NULL,
    `otcSaleId` INTEGER NULL,
    `otcSaleItemId` INTEGER NULL,
    `performedByStaffId` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pharmacy_stock_movements_facilityId_idx`(`facilityId`),
    INDEX `pharmacy_stock_movements_branchId_idx`(`branchId`),
    INDEX `pharmacy_stock_movements_medicineId_idx`(`medicineId`),
    INDEX `pharmacy_stock_movements_branchStockId_idx`(`branchStockId`),
    INDEX `pharmacy_stock_movements_sourceType_idx`(`sourceType`),
    INDEX `pharmacy_stock_movements_movementType_idx`(`movementType`),
    INDEX `pharmacy_stock_movements_otcSaleId_idx`(`otcSaleId`),
    INDEX `pharmacy_stock_movements_otcSaleItemId_idx`(`otcSaleItemId`),
    INDEX `pharmacy_stock_movements_performedByStaffId_idx`(`performedByStaffId`),
    INDEX `pharmacy_stock_movements_createdAt_idx`(`createdAt`),
    INDEX `pharmacy_stock_movements_facilityId_branchId_sourceType_crea_idx`(`facilityId`, `branchId`, `sourceType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `otc_sales` ADD CONSTRAINT `otc_sales_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `otc_sales` ADD CONSTRAINT `otc_sales_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `otc_sales` ADD CONSTRAINT `otc_sales_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `otc_sales` ADD CONSTRAINT `otc_sales_createdByStaffId_fkey` FOREIGN KEY (`createdByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `otc_sale_items` ADD CONSTRAINT `otc_sale_items_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `otc_sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `otc_sale_items` ADD CONSTRAINT `otc_sale_items_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `otc_sale_payments` ADD CONSTRAINT `otc_sale_payments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `otc_sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `otc_sale_payments` ADD CONSTRAINT `otc_sale_payments_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `otc_sale_payments` ADD CONSTRAINT `otc_sale_payments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `otc_sale_payments` ADD CONSTRAINT `otc_sale_payments_receivedByStaffId_fkey` FOREIGN KEY (`receivedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pharmacy_stock_movements` ADD CONSTRAINT `pharmacy_stock_movements_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pharmacy_stock_movements` ADD CONSTRAINT `pharmacy_stock_movements_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pharmacy_stock_movements` ADD CONSTRAINT `pharmacy_stock_movements_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pharmacy_stock_movements` ADD CONSTRAINT `pharmacy_stock_movements_branchStockId_fkey` FOREIGN KEY (`branchStockId`) REFERENCES `branch_medicine_stocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pharmacy_stock_movements` ADD CONSTRAINT `pharmacy_stock_movements_otcSaleId_fkey` FOREIGN KEY (`otcSaleId`) REFERENCES `otc_sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pharmacy_stock_movements` ADD CONSTRAINT `pharmacy_stock_movements_otcSaleItemId_fkey` FOREIGN KEY (`otcSaleItemId`) REFERENCES `otc_sale_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pharmacy_stock_movements` ADD CONSTRAINT `pharmacy_stock_movements_performedByStaffId_fkey` FOREIGN KEY (`performedByStaffId`) REFERENCES `staff_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
