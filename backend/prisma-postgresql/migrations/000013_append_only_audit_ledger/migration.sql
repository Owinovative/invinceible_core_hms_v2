CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "audit_logs"
  ADD COLUMN "integrity_hash" VARCHAR(64);

UPDATE "audit_logs"
SET "integrity_hash" = encode(
  digest(
    concat_ws(
      '|',
      "id"::text,
      "moduleName",
      "actionName",
      COALESCE("entityType", ''),
      COALESCE("entityId", ''),
      COALESCE("facilityId"::text, ''),
      COALESCE("branchId"::text, ''),
      COALESCE("actorUserId"::text, ''),
      COALESCE("actorStaffId"::text, ''),
      COALESCE("beforeData", ''),
      COALESCE("afterData", ''),
      "createdAt"::text
    ),
    'sha256'
  ),
  'hex'
);

ALTER TABLE "audit_logs"
  ALTER COLUMN "integrity_hash" SET NOT NULL;

CREATE OR REPLACE FUNCTION hms_set_audit_integrity_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."integrity_hash" := encode(
    digest(
      concat_ws(
        '|',
        NEW."moduleName",
        NEW."actionName",
        COALESCE(NEW."entityType", ''),
        COALESCE(NEW."entityId", ''),
        COALESCE(NEW."facilityId"::text, ''),
        COALESCE(NEW."branchId"::text, ''),
        COALESCE(NEW."actorUserId"::text, ''),
        COALESCE(NEW."actorStaffId"::text, ''),
        COALESCE(NEW."beforeData", ''),
        COALESCE(NEW."afterData", ''),
        COALESCE(NEW."createdAt", CURRENT_TIMESTAMP)::text
      ),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION hms_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit ledger entries are append-only';
END;
$$;

CREATE TRIGGER "audit_logs_set_integrity_hash"
BEFORE INSERT ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION hms_set_audit_integrity_hash();

CREATE TRIGGER "audit_logs_reject_update"
BEFORE UPDATE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION hms_reject_audit_mutation();

CREATE TRIGGER "audit_logs_reject_delete"
BEFORE DELETE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION hms_reject_audit_mutation();
