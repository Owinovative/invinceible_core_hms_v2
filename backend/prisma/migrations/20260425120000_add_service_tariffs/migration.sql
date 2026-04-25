-- CreateTable
CREATE TABLE `service_tariffs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `unitPrice` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `branchId` INTEGER NULL,
    `billingServiceId` INTEGER NULL,
    `labTestId` INTEGER NULL,
    `wardId` INTEGER NULL,
    `bedId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `service_tariffs_facilityId_idx` ON `service_tariffs`(`facilityId`);

-- CreateIndex
CREATE INDEX `service_tariffs_branchId_idx` ON `service_tariffs`(`branchId`);

-- CreateIndex
CREATE INDEX `service_tariffs_category_idx` ON `service_tariffs`(`category`);

-- CreateIndex
CREATE INDEX `service_tariffs_billingServiceId_idx` ON `service_tariffs`(`billingServiceId`);

-- CreateIndex
CREATE INDEX `service_tariffs_labTestId_idx` ON `service_tariffs`(`labTestId`);

-- CreateIndex
CREATE INDEX `service_tariffs_wardId_idx` ON `service_tariffs`(`wardId`);

-- CreateIndex
CREATE INDEX `service_tariffs_bedId_idx` ON `service_tariffs`(`bedId`);

-- AddForeignKey
ALTER TABLE `service_tariffs` ADD CONSTRAINT `service_tariffs_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_tariffs` ADD CONSTRAINT `service_tariffs_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_tariffs` ADD CONSTRAINT `service_tariffs_billingServiceId_fkey` FOREIGN KEY (`billingServiceId`) REFERENCES `billing_services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_tariffs` ADD CONSTRAINT `service_tariffs_labTestId_fkey` FOREIGN KEY (`labTestId`) REFERENCES `lab_test_catalog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_tariffs` ADD CONSTRAINT `service_tariffs_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `wards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_tariffs` ADD CONSTRAINT `service_tariffs_bedId_fkey` FOREIGN KEY (`bedId`) REFERENCES `beds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
