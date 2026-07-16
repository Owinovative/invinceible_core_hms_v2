-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "primaryDiagnosisId" INTEGER;

-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "etimsBranchId" VARCHAR(10) DEFAULT '00',
ADD COLUMN     "etimsCmcKey" TEXT,
ADD COLUMN     "etimsDeviceSerial" VARCHAR(100),
ADD COLUMN     "etimsTin" VARCHAR(50),
ADD COLUMN     "shaClientId" VARCHAR(255),
ADD COLUMN     "shaClientSecret" TEXT;

-- AlterTable
ALTER TABLE "lab_test_catalog" ADD COLUMN     "terminologyConceptId" INTEGER;

-- AlterTable
ALTER TABLE "medicines" ADD COLUMN     "terminologyConceptId" INTEGER;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "nationalIdNumber" VARCHAR(80),
ADD COLUMN     "shaEligibilityUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "shaMemberNumber" VARCHAR(120),
ADD COLUMN     "shaStatus" VARCHAR(50);

-- AlterTable
ALTER TABLE "sha_claims" ADD COLUMN     "diagnosisConceptId" INTEGER;

-- CreateTable
CREATE TABLE "consultation_procedures" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "terminologyConceptId" INTEGER NOT NULL,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_requests" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "contactId" INTEGER NOT NULL,
    "interventionCodes" JSONB NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "dhaConsentRequestId" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_authorizations" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "consultationId" INTEGER,
    "consentToken" TEXT NOT NULL,
    "authGuid" VARCHAR(120),
    "status" VARCHAR(50) NOT NULL DEFAULT 'AUTHORIZED',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_audit_logs" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "userId" INTEGER,
    "facilityId" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "outcome" VARCHAR(100) NOT NULL,
    "ipAddress" VARCHAR(100),
    "correlationId" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminology_sources" (
    "id" SERIAL NOT NULL,
    "sourceId" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "owner" VARCHAR(120) NOT NULL,
    "url" VARCHAR(255),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminology_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminology_collections" (
    "id" SERIAL NOT NULL,
    "collectionId" VARCHAR(120) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "owner" VARCHAR(120) NOT NULL,
    "url" VARCHAR(255),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" INTEGER,

    CONSTRAINT "terminology_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminology_versions" (
    "id" SERIAL NOT NULL,
    "system" VARCHAR(120) NOT NULL,
    "version" VARCHAR(120) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terminology_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminology_concepts" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(120) NOT NULL,
    "system" VARCHAR(255) NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "display" VARCHAR(500) NOT NULL,
    "conceptClass" VARCHAR(120),
    "datatype" VARCHAR(120),
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "owner" VARCHAR(120) NOT NULL,
    "version" VARCHAR(120),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" INTEGER,

    CONSTRAINT "terminology_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminology_mappings" (
    "id" SERIAL NOT NULL,
    "sourceConceptId" INTEGER NOT NULL,
    "targetConceptId" INTEGER NOT NULL,
    "mapType" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terminology_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminology_sync_history" (
    "id" SERIAL NOT NULL,
    "syncMode" VARCHAR(50) NOT NULL,
    "targetSystem" VARCHAR(120),
    "status" VARCHAR(50) NOT NULL,
    "conceptsAdded" INTEGER NOT NULL DEFAULT 0,
    "conceptsUpdated" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "terminology_sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_publications" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "encounterId" INTEGER,
    "patientId" INTEGER NOT NULL,
    "policy" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shr_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_bundle_snapshots" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "publicationId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fhirVersion" VARCHAR(20) NOT NULL,
    "profileVersion" VARCHAR(100),
    "bundleHash" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shr_bundle_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_publication_attempts" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "publicationId" INTEGER NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "queueJobId" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL,
    "correlationId" VARCHAR(100),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "shr_publication_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_transmission_history" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "requestHeaders" JSONB,
    "responseStatus" INTEGER,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "durationMs" INTEGER,
    "transmittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shr_transmission_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_acknowledgements" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "dhaReceiptId" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shr_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_publication_errors" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "errorType" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shr_publication_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_publication_metrics" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "totalPublications" INTEGER NOT NULL DEFAULT 0,
    "successfulCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "avgValidationTimeMs" INTEGER NOT NULL DEFAULT 0,
    "avgPublishTimeMs" INTEGER NOT NULL DEFAULT 0,
    "totalRetries" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shr_publication_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shr_bundle_dependencies" (
    "id" SERIAL NOT NULL,
    "publicationId" INTEGER NOT NULL,
    "resourceType" VARCHAR(50) NOT NULL,
    "resourceId" VARCHAR(100) NOT NULL,
    "fhirReference" VARCHAR(255) NOT NULL,

    CONSTRAINT "shr_bundle_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_event_outbox" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "correlationId" VARCHAR(36) NOT NULL,
    "aggregateId" VARCHAR(100) NOT NULL,
    "aggregateType" VARCHAR(50) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "eventCategory" VARCHAR(20) NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "patientId" INTEGER NOT NULL,
    "encounterId" INTEGER,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "tenantId" INTEGER NOT NULL DEFAULT 1,
    "userId" INTEGER,
    "sourceModule" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "priorityOrder" INTEGER NOT NULL DEFAULT 2,
    "slaSeconds" INTEGER,
    "payload" JSONB NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "signature" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "dispatchedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_events" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "correlationId" VARCHAR(36) NOT NULL,
    "aggregateId" VARCHAR(100) NOT NULL,
    "aggregateType" VARCHAR(50) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "eventCategory" VARCHAR(20) NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "sequenceNumber" INTEGER,
    "patientId" INTEGER NOT NULL,
    "encounterId" INTEGER,
    "facilityId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "tenantId" INTEGER NOT NULL DEFAULT 1,
    "userId" INTEGER,
    "sourceModule" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "slaSeconds" INTEGER,
    "payload" JSONB NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "signature" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PROCESSED',
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "processingMs" INTEGER,
    "outboxId" INTEGER,

    CONSTRAINT "clinical_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_subscriber_statuses" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "subscriberName" VARCHAR(100) NOT NULL,
    "isolationLevel" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "processingMs" INTEGER,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_subscriber_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_events" (
    "id" SERIAL NOT NULL,
    "originalEventId" VARCHAR(36) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "eventCategory" VARCHAR(20) NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "correlationId" VARCHAR(100) NOT NULL,
    "aggregateId" VARCHAR(100) NOT NULL,
    "aggregateType" VARCHAR(100) NOT NULL,
    "patientId" INTEGER,
    "encounterId" INTEGER,
    "facilityId" INTEGER,
    "tenantId" INTEGER,
    "sourceModule" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "signature" VARCHAR(128) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "failureReason" TEXT NOT NULL,
    "failureType" VARCHAR(50) NOT NULL,
    "failedSubscriber" VARCHAR(150),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "resolution" VARCHAR(30),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" VARCHAR(150),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_replay_jobs" (
    "id" SERIAL NOT NULL,
    "jobId" VARCHAR(36) NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "processedEvents" INTEGER NOT NULL DEFAULT 0,
    "skippedEvents" INTEGER NOT NULL DEFAULT 0,
    "failedEvents" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "initiatedBy" VARCHAR(150),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_replay_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" SERIAL NOT NULL,
    "workflowDefinitionId" INTEGER NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "schema" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "createdBy" VARCHAR(150),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" SERIAL NOT NULL,
    "instanceId" VARCHAR(36) NOT NULL,
    "workflowDefinitionId" INTEGER NOT NULL,
    "workflowVersionId" INTEGER NOT NULL,
    "patientId" INTEGER,
    "encounterId" INTEGER,
    "facilityId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    "currentStepId" VARCHAR(100),
    "contextVariables" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" SERIAL NOT NULL,
    "workflowInstanceId" INTEGER NOT NULL,
    "stepDefinitionId" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "triggerEventId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" SERIAL NOT NULL,
    "workflowInstanceId" INTEGER NOT NULL,
    "fromStepId" VARCHAR(100),
    "toStepId" VARCHAR(100) NOT NULL,
    "triggerEventId" VARCHAR(36),
    "conditionMet" TEXT,
    "transitionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_tasks" (
    "id" SERIAL NOT NULL,
    "taskId" VARCHAR(36) NOT NULL,
    "workflowInstanceId" INTEGER NOT NULL,
    "stepDefinitionId" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "status" VARCHAR(30) NOT NULL DEFAULT 'UNASSIGNED',
    "targetRole" VARCHAR(100),
    "targetDepartment" VARCHAR(100),
    "targetSkill" VARCHAR(100),
    "dueDate" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_assignments" (
    "id" SERIAL NOT NULL,
    "workflowTaskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "workflow_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_timers" (
    "id" SERIAL NOT NULL,
    "workflowInstanceId" INTEGER NOT NULL,
    "timerType" VARCHAR(50) NOT NULL,
    "executeAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_escalations" (
    "id" SERIAL NOT NULL,
    "workflowTaskId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "escalatedToRole" VARCHAR(100),
    "escalatedToUserId" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_audits" (
    "id" SERIAL NOT NULL,
    "workflowInstanceId" INTEGER NOT NULL,
    "oldState" VARCHAR(100),
    "newState" VARCHAR(100) NOT NULL,
    "triggerEvent" VARCHAR(100),
    "actor" VARCHAR(150),
    "reason" TEXT,
    "correlationId" VARCHAR(100),
    "durationMs" INTEGER,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_metrics" (
    "id" SERIAL NOT NULL,
    "metricName" VARCHAR(100) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "tags" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_snapshots" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeInstances" INTEGER NOT NULL,
    "completedInstances" INTEGER NOT NULL,
    "failedInstances" INTEGER NOT NULL,
    "overdueTasks" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "workflow_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConsultationSecondaryDiagnoses" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ConsultationSecondaryDiagnoses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CollectionConcepts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CollectionConcepts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "consultation_procedures_consultationId_idx" ON "consultation_procedures"("consultationId");

-- CreateIndex
CREATE INDEX "consultation_procedures_terminologyConceptId_idx" ON "consultation_procedures"("terminologyConceptId");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_procedures_consultationId_terminologyConceptId_key" ON "consultation_procedures"("consultationId", "terminologyConceptId");

-- CreateIndex
CREATE INDEX "legal_documents_type_status_idx" ON "legal_documents"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_version_key" ON "legal_documents"("type", "version");

-- CreateIndex
CREATE INDEX "legal_acceptances_userId_idx" ON "legal_acceptances"("userId");

-- CreateIndex
CREATE INDEX "legal_acceptances_documentId_idx" ON "legal_acceptances"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_acceptances_userId_documentId_key" ON "legal_acceptances"("userId", "documentId");

-- CreateIndex
CREATE INDEX "consent_requests_patientId_idx" ON "consent_requests"("patientId");

-- CreateIndex
CREATE INDEX "consent_requests_status_idx" ON "consent_requests"("status");

-- CreateIndex
CREATE INDEX "consent_requests_dhaConsentRequestId_idx" ON "consent_requests"("dhaConsentRequestId");

-- CreateIndex
CREATE INDEX "consent_authorizations_patientId_idx" ON "consent_authorizations"("patientId");

-- CreateIndex
CREATE INDEX "consent_authorizations_consultationId_idx" ON "consent_authorizations"("consultationId");

-- CreateIndex
CREATE INDEX "consent_authorizations_status_idx" ON "consent_authorizations"("status");

-- CreateIndex
CREATE INDEX "consent_audit_logs_patientId_idx" ON "consent_audit_logs"("patientId");

-- CreateIndex
CREATE INDEX "consent_audit_logs_userId_idx" ON "consent_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "consent_audit_logs_facilityId_idx" ON "consent_audit_logs"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "terminology_sources_sourceId_key" ON "terminology_sources"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "terminology_collections_collectionId_key" ON "terminology_collections"("collectionId");

-- CreateIndex
CREATE INDEX "terminology_collections_sourceId_idx" ON "terminology_collections"("sourceId");

-- CreateIndex
CREATE INDEX "terminology_versions_isCurrent_idx" ON "terminology_versions"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "terminology_versions_system_version_key" ON "terminology_versions"("system", "version");

-- CreateIndex
CREATE UNIQUE INDEX "terminology_concepts_uuid_key" ON "terminology_concepts"("uuid");

-- CreateIndex
CREATE INDEX "terminology_concepts_code_idx" ON "terminology_concepts"("code");

-- CreateIndex
CREATE INDEX "terminology_concepts_conceptClass_idx" ON "terminology_concepts"("conceptClass");

-- CreateIndex
CREATE INDEX "terminology_concepts_display_idx" ON "terminology_concepts"("display");

-- CreateIndex
CREATE UNIQUE INDEX "terminology_concepts_system_code_version_key" ON "terminology_concepts"("system", "code", "version");

-- CreateIndex
CREATE INDEX "terminology_mappings_sourceConceptId_idx" ON "terminology_mappings"("sourceConceptId");

-- CreateIndex
CREATE INDEX "terminology_mappings_targetConceptId_idx" ON "terminology_mappings"("targetConceptId");

-- CreateIndex
CREATE UNIQUE INDEX "terminology_mappings_sourceConceptId_targetConceptId_mapTyp_key" ON "terminology_mappings"("sourceConceptId", "targetConceptId", "mapType");

-- CreateIndex
CREATE INDEX "terminology_sync_history_status_idx" ON "terminology_sync_history"("status");

-- CreateIndex
CREATE INDEX "terminology_sync_history_startedAt_idx" ON "terminology_sync_history"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "shr_publications_uuid_key" ON "shr_publications"("uuid");

-- CreateIndex
CREATE INDEX "shr_publications_patientId_idx" ON "shr_publications"("patientId");

-- CreateIndex
CREATE INDEX "shr_publications_encounterId_idx" ON "shr_publications"("encounterId");

-- CreateIndex
CREATE INDEX "shr_publications_state_idx" ON "shr_publications"("state");

-- CreateIndex
CREATE UNIQUE INDEX "shr_bundle_snapshots_uuid_key" ON "shr_bundle_snapshots"("uuid");

-- CreateIndex
CREATE INDEX "shr_bundle_snapshots_bundleHash_idx" ON "shr_bundle_snapshots"("bundleHash");

-- CreateIndex
CREATE UNIQUE INDEX "shr_bundle_snapshots_publicationId_version_key" ON "shr_bundle_snapshots"("publicationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "shr_publication_attempts_uuid_key" ON "shr_publication_attempts"("uuid");

-- CreateIndex
CREATE INDEX "shr_publication_attempts_publicationId_idx" ON "shr_publication_attempts"("publicationId");

-- CreateIndex
CREATE INDEX "shr_publication_attempts_status_idx" ON "shr_publication_attempts"("status");

-- CreateIndex
CREATE INDEX "shr_publication_attempts_correlationId_idx" ON "shr_publication_attempts"("correlationId");

-- CreateIndex
CREATE INDEX "shr_transmission_history_attemptId_idx" ON "shr_transmission_history"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "shr_acknowledgements_attemptId_key" ON "shr_acknowledgements"("attemptId");

-- CreateIndex
CREATE INDEX "shr_acknowledgements_dhaReceiptId_idx" ON "shr_acknowledgements"("dhaReceiptId");

-- CreateIndex
CREATE INDEX "shr_publication_errors_attemptId_idx" ON "shr_publication_errors"("attemptId");

-- CreateIndex
CREATE INDEX "shr_publication_errors_errorType_idx" ON "shr_publication_errors"("errorType");

-- CreateIndex
CREATE UNIQUE INDEX "shr_publication_metrics_date_key" ON "shr_publication_metrics"("date");

-- CreateIndex
CREATE INDEX "shr_bundle_dependencies_publicationId_idx" ON "shr_bundle_dependencies"("publicationId");

-- CreateIndex
CREATE INDEX "shr_bundle_dependencies_resourceType_resourceId_idx" ON "shr_bundle_dependencies"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_event_outbox_uuid_key" ON "clinical_event_outbox"("uuid");

-- CreateIndex
CREATE INDEX "clinical_event_outbox_status_priorityOrder_occurredAt_idx" ON "clinical_event_outbox"("status", "priorityOrder" DESC, "occurredAt");

-- CreateIndex
CREATE INDEX "clinical_event_outbox_aggregateId_status_idx" ON "clinical_event_outbox"("aggregateId", "status");

-- CreateIndex
CREATE INDEX "clinical_event_outbox_patientId_idx" ON "clinical_event_outbox"("patientId");

-- CreateIndex
CREATE INDEX "clinical_event_outbox_facilityId_idx" ON "clinical_event_outbox"("facilityId");

-- CreateIndex
CREATE INDEX "clinical_event_outbox_correlationId_idx" ON "clinical_event_outbox"("correlationId");

-- CreateIndex
CREATE INDEX "clinical_event_outbox_eventType_idx" ON "clinical_event_outbox"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_events_uuid_key" ON "clinical_events"("uuid");

-- CreateIndex
CREATE INDEX "clinical_events_patientId_occurredAt_idx" ON "clinical_events"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "clinical_events_facilityId_occurredAt_idx" ON "clinical_events"("facilityId", "occurredAt");

-- CreateIndex
CREATE INDEX "clinical_events_eventType_occurredAt_idx" ON "clinical_events"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "clinical_events_correlationId_idx" ON "clinical_events"("correlationId");

-- CreateIndex
CREATE INDEX "clinical_events_aggregateId_idx" ON "clinical_events"("aggregateId");

-- CreateIndex
CREATE INDEX "clinical_events_status_idx" ON "clinical_events"("status");

-- CreateIndex
CREATE INDEX "clinical_events_tenantId_facilityId_patientId_idx" ON "clinical_events"("tenantId", "facilityId", "patientId");

-- CreateIndex
CREATE INDEX "event_subscriber_statuses_eventId_idx" ON "event_subscriber_statuses"("eventId");

-- CreateIndex
CREATE INDEX "event_subscriber_statuses_subscriberName_status_idx" ON "event_subscriber_statuses"("subscriberName", "status");

-- CreateIndex
CREATE INDEX "event_subscriber_statuses_status_isolationLevel_idx" ON "event_subscriber_statuses"("status", "isolationLevel");

-- CreateIndex
CREATE UNIQUE INDEX "event_subscriber_statuses_eventId_subscriberName_key" ON "event_subscriber_statuses"("eventId", "subscriberName");

-- CreateIndex
CREATE INDEX "dead_letter_events_originalEventId_idx" ON "dead_letter_events"("originalEventId");

-- CreateIndex
CREATE INDEX "dead_letter_events_status_createdAt_idx" ON "dead_letter_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "dead_letter_events_eventType_status_idx" ON "dead_letter_events"("eventType", "status");

-- CreateIndex
CREATE INDEX "dead_letter_events_patientId_status_idx" ON "dead_letter_events"("patientId", "status");

-- CreateIndex
CREATE INDEX "dead_letter_events_facilityId_status_idx" ON "dead_letter_events"("facilityId", "status");

-- CreateIndex
CREATE INDEX "dead_letter_events_failureType_idx" ON "dead_letter_events"("failureType");

-- CreateIndex
CREATE UNIQUE INDEX "event_replay_jobs_jobId_key" ON "event_replay_jobs"("jobId");

-- CreateIndex
CREATE INDEX "event_replay_jobs_status_createdAt_idx" ON "event_replay_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "event_replay_jobs_mode_status_idx" ON "event_replay_jobs"("mode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_workflowDefinitionId_versionNumber_key" ON "workflow_versions"("workflowDefinitionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_instanceId_key" ON "workflow_instances"("instanceId");

-- CreateIndex
CREATE INDEX "workflow_instances_patientId_status_idx" ON "workflow_instances"("patientId", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_encounterId_idx" ON "workflow_instances"("encounterId");

-- CreateIndex
CREATE INDEX "workflow_instances_facilityId_status_idx" ON "workflow_instances"("facilityId", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_workflowDefinitionId_status_idx" ON "workflow_instances"("workflowDefinitionId", "status");

-- CreateIndex
CREATE INDEX "workflow_steps_workflowInstanceId_status_idx" ON "workflow_steps"("workflowInstanceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflowInstanceId_stepDefinitionId_triggerE_key" ON "workflow_steps"("workflowInstanceId", "stepDefinitionId", "triggerEventId");

-- CreateIndex
CREATE INDEX "workflow_transitions_workflowInstanceId_idx" ON "workflow_transitions"("workflowInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_tasks_taskId_key" ON "workflow_tasks"("taskId");

-- CreateIndex
CREATE INDEX "workflow_tasks_workflowInstanceId_status_idx" ON "workflow_tasks"("workflowInstanceId", "status");

-- CreateIndex
CREATE INDEX "workflow_tasks_targetRole_status_idx" ON "workflow_tasks"("targetRole", "status");

-- CreateIndex
CREATE INDEX "workflow_tasks_targetDepartment_status_idx" ON "workflow_tasks"("targetDepartment", "status");

-- CreateIndex
CREATE INDEX "workflow_assignments_userId_status_idx" ON "workflow_assignments"("userId", "status");

-- CreateIndex
CREATE INDEX "workflow_assignments_workflowTaskId_idx" ON "workflow_assignments"("workflowTaskId");

-- CreateIndex
CREATE INDEX "workflow_timers_status_executeAt_idx" ON "workflow_timers"("status", "executeAt");

-- CreateIndex
CREATE INDEX "workflow_timers_workflowInstanceId_idx" ON "workflow_timers"("workflowInstanceId");

-- CreateIndex
CREATE INDEX "workflow_escalations_workflowTaskId_idx" ON "workflow_escalations"("workflowTaskId");

-- CreateIndex
CREATE INDEX "workflow_escalations_status_idx" ON "workflow_escalations"("status");

-- CreateIndex
CREATE INDEX "workflow_audits_workflowInstanceId_timestamp_idx" ON "workflow_audits"("workflowInstanceId", "timestamp");

-- CreateIndex
CREATE INDEX "workflow_audits_correlationId_idx" ON "workflow_audits"("correlationId");

-- CreateIndex
CREATE INDEX "workflow_metrics_metricName_timestamp_idx" ON "workflow_metrics"("metricName", "timestamp");

-- CreateIndex
CREATE INDEX "workflow_snapshots_timestamp_idx" ON "workflow_snapshots"("timestamp");

-- CreateIndex
CREATE INDEX "_ConsultationSecondaryDiagnoses_B_index" ON "_ConsultationSecondaryDiagnoses"("B");

-- CreateIndex
CREATE INDEX "_CollectionConcepts_B_index" ON "_CollectionConcepts"("B");

-- CreateIndex
CREATE INDEX "patients_nationalIdNumber_idx" ON "patients"("nationalIdNumber");

-- CreateIndex
CREATE INDEX "patients_shaMemberNumber_idx" ON "patients"("shaMemberNumber");

-- CreateIndex
CREATE INDEX "sha_claims_fidCode_idx" ON "sha_claims"("fidCode");

-- CreateIndex
CREATE INDEX "sha_claims_memberNumber_idx" ON "sha_claims"("memberNumber");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_primaryDiagnosisId_fkey" FOREIGN KEY ("primaryDiagnosisId") REFERENCES "terminology_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_procedures" ADD CONSTRAINT "consultation_procedures_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_procedures" ADD CONSTRAINT "consultation_procedures_terminologyConceptId_fkey" FOREIGN KEY ("terminologyConceptId") REFERENCES "terminology_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_catalog" ADD CONSTRAINT "lab_test_catalog_terminologyConceptId_fkey" FOREIGN KEY ("terminologyConceptId") REFERENCES "terminology_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_terminologyConceptId_fkey" FOREIGN KEY ("terminologyConceptId") REFERENCES "terminology_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sha_claims" ADD CONSTRAINT "sha_claims_diagnosisConceptId_fkey" FOREIGN KEY ("diagnosisConceptId") REFERENCES "terminology_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "legal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_authorizations" ADD CONSTRAINT "consent_authorizations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_authorizations" ADD CONSTRAINT "consent_authorizations_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_audit_logs" ADD CONSTRAINT "consent_audit_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_audit_logs" ADD CONSTRAINT "consent_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_audit_logs" ADD CONSTRAINT "consent_audit_logs_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminology_collections" ADD CONSTRAINT "terminology_collections_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "terminology_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminology_concepts" ADD CONSTRAINT "terminology_concepts_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "terminology_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminology_mappings" ADD CONSTRAINT "terminology_mappings_sourceConceptId_fkey" FOREIGN KEY ("sourceConceptId") REFERENCES "terminology_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminology_mappings" ADD CONSTRAINT "terminology_mappings_targetConceptId_fkey" FOREIGN KEY ("targetConceptId") REFERENCES "terminology_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_publications" ADD CONSTRAINT "shr_publications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_publications" ADD CONSTRAINT "shr_publications_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_bundle_snapshots" ADD CONSTRAINT "shr_bundle_snapshots_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "shr_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_publication_attempts" ADD CONSTRAINT "shr_publication_attempts_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "shr_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_publication_attempts" ADD CONSTRAINT "shr_publication_attempts_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "shr_bundle_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_transmission_history" ADD CONSTRAINT "shr_transmission_history_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "shr_publication_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_acknowledgements" ADD CONSTRAINT "shr_acknowledgements_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "shr_publication_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_publication_errors" ADD CONSTRAINT "shr_publication_errors_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "shr_publication_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shr_bundle_dependencies" ADD CONSTRAINT "shr_bundle_dependencies_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "shr_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_assignments" ADD CONSTRAINT "workflow_assignments_workflowTaskId_fkey" FOREIGN KEY ("workflowTaskId") REFERENCES "workflow_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_timers" ADD CONSTRAINT "workflow_timers_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_escalations" ADD CONSTRAINT "workflow_escalations_workflowTaskId_fkey" FOREIGN KEY ("workflowTaskId") REFERENCES "workflow_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_audits" ADD CONSTRAINT "workflow_audits_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConsultationSecondaryDiagnoses" ADD CONSTRAINT "_ConsultationSecondaryDiagnoses_A_fkey" FOREIGN KEY ("A") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConsultationSecondaryDiagnoses" ADD CONSTRAINT "_ConsultationSecondaryDiagnoses_B_fkey" FOREIGN KEY ("B") REFERENCES "terminology_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionConcepts" ADD CONSTRAINT "_CollectionConcepts_A_fkey" FOREIGN KEY ("A") REFERENCES "terminology_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionConcepts" ADD CONSTRAINT "_CollectionConcepts_B_fkey" FOREIGN KEY ("B") REFERENCES "terminology_concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
