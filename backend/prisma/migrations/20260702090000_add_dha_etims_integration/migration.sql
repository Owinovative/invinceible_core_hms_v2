-- Government integration layer: KRA eTIMS fiscal documents, DHA transactions,
-- durable outbound retry queue, and per-call API audit log.

-- CreateTable
CREATE TABLE `etims_invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentType` VARCHAR(30) NOT NULL DEFAULT 'SALE',
    `traderInvoiceNumber` VARCHAR(100) NOT NULL,
    `statusCode` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    `receiptTypeCode` VARCHAR(5) NOT NULL DEFAULT 'S',
    `paymentTypeCode` VARCHAR(5) NULL,
    `cuInvoiceNumber` VARCHAR(120) NULL,
    `cuReceiptNumber` VARCHAR(120) NULL,
    `internalData` VARCHAR(255) NULL,
    `receiptSignature` VARCHAR(255) NULL,
    `sdcId` VARCHAR(120) NULL,
    `mrcNumber` VARCHAR(120) NULL,
    `sdcDateTime` DATETIME(3) NULL,
    `qrCodeUrl` TEXT NULL,
    `qrCodeData` LONGTEXT NULL,
    `totalTaxableAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalTaxAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'KES',
    `taxBreakdown` JSON NULL,
    `requestPayload` JSON NULL,
    `responsePayload` JSON NULL,
    `errorMessage` TEXT NULL,
    `cancelReason` TEXT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `correlationId` VARCHAR(120) NULL,
    `lastAttemptAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `invoiceId` INTEGER NOT NULL,
    `originalId` INTEGER NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,

    UNIQUE INDEX `etims_invoices_traderInvoiceNumber_key`(`traderInvoiceNumber`),
    INDEX `etims_invoices_invoiceId_idx`(`invoiceId`),
    INDEX `etims_invoices_originalId_idx`(`originalId`),
    INDEX `etims_invoices_statusCode_idx`(`statusCode`),
    INDEX `etims_invoices_documentType_statusCode_idx`(`documentType`, `statusCode`),
    INDEX `etims_invoices_facilityId_branchId_statusCode_idx`(`facilityId`, `branchId`, `statusCode`),
    INDEX `etims_invoices_cuInvoiceNumber_idx`(`cuInvoiceNumber`),
    INDEX `etims_invoices_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `integration_outbound_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `integration` VARCHAR(30) NOT NULL,
    `operation` VARCHAR(80) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(120) NOT NULL,
    `payload` JSON NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 8,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastError` TEXT NULL,
    `lastHttpStatus` INTEGER NULL,
    `correlationId` VARCHAR(120) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `facilityId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `integration_outbound_requests_idempotencyKey_key`(`idempotencyKey`),
    INDEX `integration_outbound_requests_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `integration_outbound_requests_integration_status_idx`(`integration`, `status`),
    INDEX `integration_outbound_requests_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `integration_outbound_requests_correlationId_idx`(`correlationId`),
    INDEX `integration_outbound_requests_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `integration_api_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `integration` VARCHAR(30) NOT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `requestId` VARCHAR(120) NOT NULL,
    `correlationId` VARCHAR(120) NULL,
    `httpStatus` INTEGER NULL,
    `outcome` VARCHAR(30) NOT NULL,
    `latencyMs` INTEGER NOT NULL DEFAULT 0,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `facilityId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `integration_api_logs_integration_createdAt_idx`(`integration`, `createdAt`),
    INDEX `integration_api_logs_correlationId_idx`(`correlationId`),
    INDEX `integration_api_logs_requestId_idx`(`requestId`),
    INDEX `integration_api_logs_outcome_createdAt_idx`(`outcome`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dha_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionType` VARCHAR(60) NOT NULL,
    `statusCode` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `externalRef` VARCHAR(160) NULL,
    `fhirResourceType` VARCHAR(60) NULL,
    `apiVersion` VARCHAR(20) NULL,
    `requestPayload` JSON NULL,
    `responsePayload` JSON NULL,
    `errorMessage` TEXT NULL,
    `correlationId` VARCHAR(120) NULL,
    `patientId` INTEGER NULL,
    `invoiceId` INTEGER NULL,
    `shaClaimId` INTEGER NULL,
    `consultationId` INTEGER NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `submittedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dha_transactions_transactionType_statusCode_idx`(`transactionType`, `statusCode`),
    INDEX `dha_transactions_patientId_idx`(`patientId`),
    INDEX `dha_transactions_invoiceId_idx`(`invoiceId`),
    INDEX `dha_transactions_shaClaimId_idx`(`shaClaimId`),
    INDEX `dha_transactions_facilityId_createdAt_idx`(`facilityId`, `createdAt`),
    INDEX `dha_transactions_correlationId_idx`(`correlationId`),
    INDEX `dha_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `etims_invoices` ADD CONSTRAINT `etims_invoices_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etims_invoices` ADD CONSTRAINT `etims_invoices_originalId_fkey` FOREIGN KEY (`originalId`) REFERENCES `etims_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
