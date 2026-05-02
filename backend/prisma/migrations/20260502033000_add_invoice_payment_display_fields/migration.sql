ALTER TABLE `facilities`
  ADD COLUMN `mpesaAccountNumber` VARCHAR(80) NULL,
  ADD COLUMN `mpesaPochiNumber` VARCHAR(80) NULL;

ALTER TABLE `branches`
  ADD COLUMN `mpesaAccountNumber` VARCHAR(80) NULL,
  ADD COLUMN `mpesaPochiNumber` VARCHAR(80) NULL;
