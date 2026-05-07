CREATE INDEX `lab_test_catalog_testName_idx` ON `lab_test_catalog`(`testName`);
CREATE INDEX `lab_test_catalog_category_idx` ON `lab_test_catalog`(`category`);
CREATE INDEX `lab_test_catalog_isActive_idx` ON `lab_test_catalog`(`isActive`);
CREATE INDEX `lab_test_catalog_createdAt_idx` ON `lab_test_catalog`(`createdAt`);

CREATE INDEX `billing_services_name_idx` ON `billing_services`(`name`);
CREATE INDEX `billing_services_category_idx` ON `billing_services`(`category`);
CREATE INDEX `billing_services_isActive_idx` ON `billing_services`(`isActive`);
CREATE INDEX `billing_services_createdAt_idx` ON `billing_services`(`createdAt`);
CREATE INDEX `billing_services_updatedAt_idx` ON `billing_services`(`updatedAt`);
