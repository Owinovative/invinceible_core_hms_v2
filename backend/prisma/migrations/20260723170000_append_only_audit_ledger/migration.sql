ALTER TABLE `audit_logs`
  ADD COLUMN `integrity_hash` VARCHAR(64) NULL;

UPDATE `audit_logs`
SET `integrity_hash` = SHA2(
  CONCAT_WS(
    '|',
    `id`,
    `moduleName`,
    `actionName`,
    COALESCE(`entityType`, ''),
    COALESCE(`entityId`, ''),
    COALESCE(`facilityId`, ''),
    COALESCE(`branchId`, ''),
    COALESCE(`actorUserId`, ''),
    COALESCE(`actorStaffId`, ''),
    COALESCE(`beforeData`, ''),
    COALESCE(`afterData`, ''),
    DATE_FORMAT(`createdAt`, '%Y-%m-%dT%H:%i:%s.%fZ')
  ),
  256
);

ALTER TABLE `audit_logs`
  MODIFY COLUMN `integrity_hash` VARCHAR(64) NOT NULL;

CREATE TRIGGER `audit_logs_set_integrity_hash`
BEFORE INSERT ON `audit_logs`
FOR EACH ROW
SET NEW.`integrity_hash` = SHA2(
  CONCAT_WS(
    '|',
    NEW.`moduleName`,
    NEW.`actionName`,
    COALESCE(NEW.`entityType`, ''),
    COALESCE(NEW.`entityId`, ''),
    COALESCE(NEW.`facilityId`, ''),
    COALESCE(NEW.`branchId`, ''),
    COALESCE(NEW.`actorUserId`, ''),
    COALESCE(NEW.`actorStaffId`, ''),
    COALESCE(NEW.`beforeData`, ''),
    COALESCE(NEW.`afterData`, ''),
    DATE_FORMAT(COALESCE(NEW.`createdAt`, CURRENT_TIMESTAMP(3)), '%Y-%m-%dT%H:%i:%s.%fZ')
  ),
  256
);

CREATE TRIGGER `audit_logs_reject_update`
BEFORE UPDATE ON `audit_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'Audit ledger entries are append-only';

CREATE TRIGGER `audit_logs_reject_delete`
BEFORE DELETE ON `audit_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'Audit ledger entries are append-only';
