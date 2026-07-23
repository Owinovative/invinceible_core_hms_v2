ALTER TABLE "external_lab_referrals"
  ADD COLUMN "invoiceNumber" VARCHAR(60),
  ADD COLUMN "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "balanceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "external_lab_referrals" referral
SET
  "invoiceNumber" = 'XLABINV-' || LPAD(referral."id"::text, 8, '0'),
  "totalAmount" = totals.amount,
  "balanceAmount" = totals.amount
FROM (
  SELECT
    "externalLabReferralId",
    COALESCE(SUM("priceAmount"), 0) AS amount
  FROM "external_lab_order_items"
  GROUP BY "externalLabReferralId"
) totals
WHERE totals."externalLabReferralId" = referral."id";

UPDATE "external_lab_referrals"
SET "invoiceNumber" = 'XLABINV-' || LPAD("id"::text, 8, '0')
WHERE "invoiceNumber" IS NULL;

ALTER TABLE "external_lab_referrals"
  ALTER COLUMN "invoiceNumber" SET NOT NULL;

CREATE UNIQUE INDEX "external_lab_referrals_invoiceNumber_key"
  ON "external_lab_referrals"("invoiceNumber");

CREATE TABLE "external_lab_payments" (
  "id" SERIAL NOT NULL,
  "paymentNumber" VARCHAR(60) NOT NULL,
  "externalLabReferralId" INTEGER NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "paymentMethod" VARCHAR(40) NOT NULL,
  "transactionReference" VARCHAR(120),
  "receivedByUserId" INTEGER,
  "receivedByStaffId" INTEGER,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_lab_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "external_lab_payments_referral_fkey"
    FOREIGN KEY ("externalLabReferralId") REFERENCES "external_lab_referrals"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "external_lab_payments_paymentNumber_key" ON "external_lab_payments"("paymentNumber");
CREATE INDEX "external_lab_payments_referral_paid_idx" ON "external_lab_payments"("externalLabReferralId", "paidAt");
CREATE UNIQUE INDEX "external_lab_payments_paymentMethod_transactionReference_key" ON "external_lab_payments"("paymentMethod", "transactionReference");

CREATE TABLE "external_lab_report_shares" (
  "id" SERIAL NOT NULL,
  "externalLabReferralId" INTEGER NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "lastAccessedAt" TIMESTAMP(3),
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_lab_report_shares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "external_lab_report_shares_referral_fkey"
    FOREIGN KEY ("externalLabReferralId") REFERENCES "external_lab_referrals"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "external_lab_report_shares_tokenHash_key" ON "external_lab_report_shares"("tokenHash");
CREATE INDEX "external_lab_report_shares_referral_expires_idx" ON "external_lab_report_shares"("externalLabReferralId", "expiresAt");
CREATE INDEX "external_lab_report_shares_expires_revoked_idx" ON "external_lab_report_shares"("expiresAt", "revokedAt");
