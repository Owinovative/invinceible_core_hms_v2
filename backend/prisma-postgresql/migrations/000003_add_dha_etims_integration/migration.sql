-- Government integration layer: KRA eTIMS fiscal documents, DHA transactions,
-- durable outbound retry queue, and per-call API audit log.

-- CreateTable
CREATE TABLE "etims_invoices" (
    "id" SERIAL NOT NULL,
    "documentType" VARCHAR(30) NOT NULL DEFAULT 'SALE',
    "traderInvoiceNumber" VARCHAR(100) NOT NULL,
    "statusCode" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    "receiptTypeCode" VARCHAR(5) NOT NULL DEFAULT 'S',
    "paymentTypeCode" VARCHAR(5),
    "cuInvoiceNumber" VARCHAR(120),
    "cuReceiptNumber" VARCHAR(120),
    "internalData" VARCHAR(255),
    "receiptSignature" VARCHAR(255),
    "sdcId" VARCHAR(120),
    "mrcNumber" VARCHAR(120),
    "sdcDateTime" TIMESTAMP(3),
    "qrCodeUrl" TEXT,
    "qrCodeData" TEXT,
    "totalTaxableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTaxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'KES',
    "taxBreakdown" JSONB,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "cancelReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "correlationId" VARCHAR(120),
    "lastAttemptAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "originalId" INTEGER,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,

    CONSTRAINT "etims_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_outbound_requests" (
    "id" SERIAL NOT NULL,
    "integration" VARCHAR(30) NOT NULL,
    "operation" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "payload" JSONB,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lastHttpStatus" INTEGER,
    "correlationId" VARCHAR(120),
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "facilityId" INTEGER,
    "branchId" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_outbound_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_api_logs" (
    "id" SERIAL NOT NULL,
    "integration" VARCHAR(30) NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "requestId" VARCHAR(120) NOT NULL,
    "correlationId" VARCHAR(120),
    "httpStatus" INTEGER,
    "outcome" VARCHAR(30) NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "facilityId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dha_transactions" (
    "id" SERIAL NOT NULL,
    "transactionType" VARCHAR(60) NOT NULL,
    "statusCode" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "externalRef" VARCHAR(160),
    "fhirResourceType" VARCHAR(60),
    "apiVersion" VARCHAR(20),
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "correlationId" VARCHAR(120),
    "patientId" INTEGER,
    "invoiceId" INTEGER,
    "shaClaimId" INTEGER,
    "consultationId" INTEGER,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dha_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etims_invoices_traderInvoiceNumber_key" ON "etims_invoices"("traderInvoiceNumber");
CREATE INDEX "etims_invoices_invoiceId_idx" ON "etims_invoices"("invoiceId");
CREATE INDEX "etims_invoices_originalId_idx" ON "etims_invoices"("originalId");
CREATE INDEX "etims_invoices_statusCode_idx" ON "etims_invoices"("statusCode");
CREATE INDEX "etims_invoices_documentType_statusCode_idx" ON "etims_invoices"("documentType", "statusCode");
CREATE INDEX "etims_invoices_facilityId_branchId_statusCode_idx" ON "etims_invoices"("facilityId", "branchId", "statusCode");
CREATE INDEX "etims_invoices_cuInvoiceNumber_idx" ON "etims_invoices"("cuInvoiceNumber");
CREATE INDEX "etims_invoices_createdAt_idx" ON "etims_invoices"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "integration_outbound_requests_idempotencyKey_key" ON "integration_outbound_requests"("idempotencyKey");
CREATE INDEX "integration_outbound_requests_status_nextAttemptAt_idx" ON "integration_outbound_requests"("status", "nextAttemptAt");
CREATE INDEX "integration_outbound_requests_integration_status_idx" ON "integration_outbound_requests"("integration", "status");
CREATE INDEX "integration_outbound_requests_entityType_entityId_idx" ON "integration_outbound_requests"("entityType", "entityId");
CREATE INDEX "integration_outbound_requests_correlationId_idx" ON "integration_outbound_requests"("correlationId");
CREATE INDEX "integration_outbound_requests_createdAt_idx" ON "integration_outbound_requests"("createdAt");

-- CreateIndex
CREATE INDEX "integration_api_logs_integration_createdAt_idx" ON "integration_api_logs"("integration", "createdAt");
CREATE INDEX "integration_api_logs_correlationId_idx" ON "integration_api_logs"("correlationId");
CREATE INDEX "integration_api_logs_requestId_idx" ON "integration_api_logs"("requestId");
CREATE INDEX "integration_api_logs_outcome_createdAt_idx" ON "integration_api_logs"("outcome", "createdAt");

-- CreateIndex
CREATE INDEX "dha_transactions_transactionType_statusCode_idx" ON "dha_transactions"("transactionType", "statusCode");
CREATE INDEX "dha_transactions_patientId_idx" ON "dha_transactions"("patientId");
CREATE INDEX "dha_transactions_invoiceId_idx" ON "dha_transactions"("invoiceId");
CREATE INDEX "dha_transactions_shaClaimId_idx" ON "dha_transactions"("shaClaimId");
CREATE INDEX "dha_transactions_facilityId_createdAt_idx" ON "dha_transactions"("facilityId", "createdAt");
CREATE INDEX "dha_transactions_correlationId_idx" ON "dha_transactions"("correlationId");
CREATE INDEX "dha_transactions_createdAt_idx" ON "dha_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "etims_invoices" ADD CONSTRAINT "etims_invoices_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etims_invoices" ADD CONSTRAINT "etims_invoices_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "etims_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
