ALTER TABLE `prescription_items`
  ADD COLUMN `route` VARCHAR(100) NULL,
  ADD COLUMN `medicineNameSnapshot` VARCHAR(180) NULL,
  ADD COLUMN `stockStatusAtPrescribing` VARCHAR(50) NULL,
  ADD COLUMN `acceptedAlternativeForMedicineId` INTEGER NULL;

CREATE INDEX `prescription_items_acceptedAlternativeForMedicineId_idx`
  ON `prescription_items`(`acceptedAlternativeForMedicineId`);
