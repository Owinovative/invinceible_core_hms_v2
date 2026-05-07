-- Hot-path list and consultation workspace indexes.
CREATE INDEX `consultations_createdAt_idx` ON `consultations`(`createdAt`);
CREATE INDEX `consultations_updatedAt_idx` ON `consultations`(`updatedAt`);
CREATE INDEX `consultations_facilityId_branchId_statusCode_startedAt_idx` ON `consultations`(`facilityId`, `branchId`, `statusCode`, `startedAt`);
CREATE INDEX `consultations_doctorId_statusCode_startedAt_idx` ON `consultations`(`doctorId`, `statusCode`, `startedAt`);

CREATE INDEX `service_tariffs_code_idx` ON `service_tariffs`(`code`);
CREATE INDEX `service_tariffs_name_idx` ON `service_tariffs`(`name`);
CREATE INDEX `service_tariffs_isActive_idx` ON `service_tariffs`(`isActive`);
CREATE INDEX `service_tariffs_createdAt_idx` ON `service_tariffs`(`createdAt`);
CREATE INDEX `service_tariffs_updatedAt_idx` ON `service_tariffs`(`updatedAt`);
CREATE INDEX `service_tariffs_facilityId_branchId_category_name_idx` ON `service_tariffs`(`facilityId`, `branchId`, `category`, `name`);
CREATE INDEX `service_tariffs_facilityId_branchId_isActive_idx` ON `service_tariffs`(`facilityId`, `branchId`, `isActive`);

CREATE INDEX `notifications_facilityId_branchId_isResolved_createdAt_idx` ON `notifications`(`facilityId`, `branchId`, `isResolved`, `createdAt`);
CREATE INDEX `notifications_targetUserId_isRead_createdAt_idx` ON `notifications`(`targetUserId`, `isRead`, `createdAt`);
CREATE INDEX `notifications_targetStaffId_isRead_createdAt_idx` ON `notifications`(`targetStaffId`, `isRead`, `createdAt`);
CREATE INDEX `notifications_moduleName_isResolved_createdAt_idx` ON `notifications`(`moduleName`, `isResolved`, `createdAt`);

CREATE INDEX `branch_medicine_stocks_facilityId_branchId_isActive_idx` ON `branch_medicine_stocks`(`facilityId`, `branchId`, `isActive`);
CREATE INDEX `branch_medicine_stocks_branchId_stockQuantity_idx` ON `branch_medicine_stocks`(`branchId`, `stockQuantity`);
CREATE INDEX `branch_medicine_stocks_branchId_updatedAt_idx` ON `branch_medicine_stocks`(`branchId`, `updatedAt`);
