-- Replace non-unique provider lookup indexes with database idempotency keys.
DROP INDEX `payments_checkoutRequestId_idx` ON `payments`;
DROP INDEX `payments_mpesaReceiptNumber_idx` ON `payments`;
DROP INDEX `payments_shaClaimId_idx` ON `payments`;

CREATE UNIQUE INDEX `payments_checkoutRequestId_key`
  ON `payments`(`checkoutRequestId`);
CREATE UNIQUE INDEX `payments_mpesaReceiptNumber_key`
  ON `payments`(`mpesaReceiptNumber`);
CREATE UNIQUE INDEX `payments_shaClaimId_paymentMethod_key`
  ON `payments`(`shaClaimId`, `paymentMethod`);
