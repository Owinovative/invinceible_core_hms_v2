import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Socket } from 'net';
import { IntegrationConfigService } from '../integration-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DhaService } from './dha.service';
import type { DhaEclaimsCommand, DhaEclaimsOperation } from './eclaims-contract';
import { DHA_CLIENT, DHA_OPERATIONS, INTEGRATION_NAMES } from '../integration.constants';
import type { DhaClientPort, DhaMultipartWorkflowSubmission } from './dha.types';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import { IntegrationQueueWorker } from '../queue/integration-queue.worker';
import { IntegrationAuditService } from '../integration-audit.service';
import { NonRetryableIntegrationError, type OutboundQueueItem } from '../integration.types';

type WorkflowAction =
  | 'EMERGENCY'
  | 'AUTHORIZE'
  | 'VISIT'
  | 'INTERVENTION'
  | 'DIAGNOSIS'
  | 'BILLABLE_ITEM'
  | 'PREVIEW'
  | 'SUBMIT'
  | 'DISCHARGE'
  | 'CLOSE';

type MultipartWorkflowAction = 'PREAUTH_SUBMIT' | 'EMT_SUBMIT' | 'OTP_WHITELIST_SUBMIT';

const ACTION_OPERATION: Record<WorkflowAction, DhaEclaimsOperation> = {
  EMERGENCY: 'CREATE_EMERGENCY_CLAIM',
  AUTHORIZE: 'AUTHORIZE_CLAIM',
  VISIT: 'CREATE_VISIT',
  INTERVENTION: 'ADD_INTERVENTION',
  DIAGNOSIS: 'ADD_DIAGNOSIS',
  BILLABLE_ITEM: 'ADD_LINE',
  PREVIEW: 'PREVIEW_CLAIM',
  SUBMIT: 'SUBMIT_CLAIM',
  DISCHARGE: 'DISCHARGE_CLAIM',
  CLOSE: 'CLOSE_CLAIM',
};

const PREREQUISITE: Partial<Record<WorkflowAction, WorkflowAction>> = {
  VISIT: 'AUTHORIZE',
  INTERVENTION: 'VISIT',
  DIAGNOSIS: 'INTERVENTION',
  BILLABLE_ITEM: 'INTERVENTION',
  PREVIEW: 'BILLABLE_ITEM',
  SUBMIT: 'PREVIEW',
  DISCHARGE: 'SUBMIT',
  CLOSE: 'SUBMIT',
};

@Injectable()
export class DhaClaimWorkflowService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dha: DhaService,
    private readonly config: IntegrationConfigService,
    private readonly queue: IntegrationQueueService,
    private readonly worker: IntegrationQueueWorker,
    private readonly audit: IntegrationAuditService,
    @Inject(DHA_CLIENT) private readonly client: DhaClientPort,
  ) {}

  onModuleInit() {
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.SCAN_WORKFLOW_ATTACHMENT,
      (item) => this.handleAttachmentScan(item),
    );
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.SUBMIT_MULTIPART_WORKFLOW,
      (item) => this.handleMultipartWorkflow(item),
    );
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.UPLOAD_WORKFLOW_ATTACHMENT,
      (item) => this.handleAttachmentUpload(item),
    );
  }

  async create(params: {
    patientId: number;
    serviceType: 'INPATIENT' | 'OUTPATIENT';
    interventionCodes: string[];
    shaClaimId?: number;
    consultationId?: number;
    actorUserId?: number;
  }) {
    const patient = await this.prisma.patient.findUnique({ where: { id: params.patientId } });
    if (!patient) throw new NotFoundException(`Patient ${params.patientId} not found`);
    if (params.interventionCodes.length === 0) {
      throw new BadRequestException('At least one DHA intervention code is required');
    }
    return this.prisma.dhaClaimWorkflow.create({
      data: {
        status: 'DRAFT',
        serviceType: params.serviceType,
        patientId: patient.id,
        facilityId: patient.facilityId,
        shaClaimId: params.shaClaimId ?? null,
        consultationId: params.consultationId ?? null,
        createdByUserId: params.actorUserId ?? null,
        steps: {
          create: [{
            sequence: 0,
            action: 'INTERVENTION_PLAN',
            status: 'COMPLETED',
            idempotencyKey: `dha:workflow:${patient.id}:${Date.now()}:plan`,
            requestData: { interventionCodes: params.interventionCodes },
            completedAt: new Date(),
          }],
        },
      },
      include: { steps: true },
    });
  }

  async get(workflowId: number, facilityId?: number) {
    const workflow = await this.prisma.dhaClaimWorkflow.findFirst({
      where: {
        id: workflowId,
        ...(facilityId ? { facilityId } : {}),
      },
      include: {
        steps: { orderBy: { sequence: 'asc' } },
        attachments: {
          select: {
            id: true,
            status: true,
            documentType: true,
            interventionCode: true,
            fileName: true,
            mimeType: true,
            byteSize: true,
            sha256: true,
            dhaFileId: true,
            dhaAttachmentId: true,
            scanStatus: true,
            scanDetail: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!workflow) throw new NotFoundException(`DHA workflow ${workflowId} not found`);
    return workflow;
  }

  async stageAttachment(params: {
    workflowId: number;
    documentType: string;
    interventionCode: string;
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
  }) {
    const workflow = await this.prisma.dhaClaimWorkflow.findUnique({
      where: { id: params.workflowId }, include: { steps: true },
    });
    if (!workflow) throw new NotFoundException(`DHA workflow ${params.workflowId} not found`);
    const hasVisit = workflow.steps.some((step) => step.action === 'VISIT' && step.status === 'COMPLETED');
    const hasIntervention = workflow.steps.some((step) => step.action === 'INTERVENTION' && step.status === 'COMPLETED');
    if (!hasVisit || !hasIntervention) {
      throw new BadRequestException(
        'DHA attachments require completed visit and intervention workflow steps',
      );
    }
    if (params.file.size <= 0 || params.file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('DHA attachments must be between 1 byte and 10 MiB');
    }
    if (!params.file.mimetype || !params.file.mimetype.includes('/')) {
      throw new BadRequestException('DHA attachment must include a valid MIME type');
    }
    const key = Buffer.from(this.config.dhaAttachmentEncryptionKey, 'hex');
    if (key.length !== 32) {
      throw new BadRequestException('DHA attachment encryption is not configured');
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(params.file.buffer), cipher.final()]);
    const attachment = await this.prisma.dhaWorkflowAttachment.create({
      data: {
        workflowId: workflow.id,
        documentType: params.documentType,
        interventionCode: params.interventionCode,
        fileName: params.file.originalname,
        mimeType: params.file.mimetype,
        byteSize: params.file.size,
        sha256: createHash('sha256').update(params.file.buffer).digest('hex'),
        encryptedData: encrypted.toString('base64'),
        encryptionIv: iv.toString('base64'),
        encryptionTag: cipher.getAuthTag().toString('base64'),
        // A scanner must explicitly clear this state before upload is eligible.
        scanStatus: 'PENDING',
      },
    });
    await this.queueAttachmentOperation(attachment.id, 'SCAN');
    return attachment;
  }

  /** The queue holds an ID only; ciphertext and consent tokens never enter JSON payloads. */
  private async queueAttachmentOperation(attachmentId: number, operation: 'SCAN' | 'UPLOAD') {
    const attachment = await this.prisma.dhaWorkflowAttachment.findUnique({
      where: { id: attachmentId },
      include: { workflow: true },
    });
    if (!attachment) throw new NotFoundException(`DHA attachment ${attachmentId} not found`);
    const queueOperation = operation === 'SCAN'
      ? DHA_OPERATIONS.SCAN_WORKFLOW_ATTACHMENT
      : DHA_OPERATIONS.UPLOAD_WORKFLOW_ATTACHMENT;
    const result = await this.queue.enqueue({
      integration: INTEGRATION_NAMES.DHA,
      operation: queueOperation,
      entityType: 'DHA_WORKFLOW_ATTACHMENT',
      entityId: String(attachment.id),
      payload: { attachmentId: attachment.id },
      idempotencyKey: `dha:attachment:${attachment.id}:${operation.toLowerCase()}`,
      facilityId: attachment.workflow.facilityId,
      branchId: attachment.workflow.branchId ?? undefined,
    });
    await this.prisma.dhaWorkflowAttachment.update({
      where: { id: attachment.id },
      data: { status: operation === 'SCAN' ? 'SCAN_QUEUED' : 'UPLOAD_QUEUED' },
    });
    return result;
  }

  private attachmentId(item: OutboundQueueItem): number {
    const attachmentId = (item.payload as { attachmentId?: unknown } | null)?.attachmentId;
    if (!Number.isInteger(attachmentId) || (attachmentId as number) < 1) {
      throw new NonRetryableIntegrationError('DHA attachment queue payload is invalid');
    }
    return attachmentId as number;
  }

  private decryptAttachment(attachment: {
    encryptedData: string; encryptionIv: string; encryptionTag: string;
  }): Buffer {
    const key = Buffer.from(this.config.dhaAttachmentEncryptionKey, 'hex');
    if (key.length !== 32) throw new NonRetryableIntegrationError('DHA attachment encryption is not configured');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(attachment.encryptionIv, 'base64'));
    decipher.setAuthTag(Buffer.from(attachment.encryptionTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(attachment.encryptedData, 'base64')), decipher.final()]);
  }

  private async handleAttachmentScan(item: OutboundQueueItem): Promise<void> {
    const attachment = await this.prisma.dhaWorkflowAttachment.findUnique({ where: { id: this.attachmentId(item) } });
    if (!attachment) throw new NonRetryableIntegrationError('DHA attachment no longer exists');
    if (attachment.scanStatus === 'CLEAN') return;
    if (attachment.scanStatus === 'INFECTED') throw new NonRetryableIntegrationError('DHA attachment was rejected by malware scanning');
    await this.prisma.dhaWorkflowAttachment.update({ where: { id: attachment.id }, data: { status: 'SCANNING', scanStatus: 'SCANNING', scanDetail: null } });
    const bytes = this.decryptAttachment(attachment);
    try {
      await this.scanWithClamAv(bytes);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Attachment scanner failed';
      const infected = error instanceof NonRetryableIntegrationError;
      await this.prisma.dhaWorkflowAttachment.update({
        where: { id: attachment.id },
        data: { status: infected ? 'REJECTED' : 'SCAN_FAILED', scanStatus: infected ? 'INFECTED' : 'FAILED', scanDetail: detail.slice(0, 4_000) },
      });
      throw error;
    }
    await this.prisma.dhaWorkflowAttachment.update({
      where: { id: attachment.id }, data: { status: 'CLEAN', scanStatus: 'CLEAN', scanDetail: 'clamd INSTREAM: clean' },
    });
    await this.queueAttachmentOperation(attachment.id, 'UPLOAD');
  }

  private async handleAttachmentUpload(item: OutboundQueueItem): Promise<void> {
    const attachment = await this.prisma.dhaWorkflowAttachment.findUnique({
      where: { id: this.attachmentId(item) }, include: { workflow: true },
    });
    if (!attachment) throw new NonRetryableIntegrationError('DHA attachment no longer exists');
    if (attachment.status === 'UPLOADED') return;
    if (attachment.scanStatus !== 'CLEAN') throw new NonRetryableIntegrationError('DHA attachment has not passed malware scanning');
    if (!attachment.interventionCode) throw new NonRetryableIntegrationError('DHA attachment is missing intervention_code');
    const consentToken = attachment.workflow.dhaVisitToken ?? attachment.workflow.dhaAuthorizationToken;
    if (!consentToken) throw new NonRetryableIntegrationError('DHA attachment requires a completed authorization or visit token');
    await this.prisma.dhaWorkflowAttachment.update({ where: { id: attachment.id }, data: { status: 'UPLOADING' } });
    const result = await this.client.uploadClaimAttachment({
      consentToken,
      documentType: attachment.documentType,
      interventionCode: attachment.interventionCode,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      bytes: this.decryptAttachment(attachment),
    }, { facilityId: attachment.workflow.facilityId, branchId: attachment.workflow.branchId ?? undefined, correlationId: item.correlationId ?? undefined });
    if (result.status === 'REJECTED' || result.status === 'FAILED') {
      throw new NonRetryableIntegrationError('DHA rejected claim attachment');
    }
    await this.prisma.dhaWorkflowAttachment.update({
      where: { id: attachment.id }, data: { status: 'UPLOADED', dhaAttachmentId: result.externalRef ?? null },
    });
  }

  /** clamd INSTREAM avoids temporary plaintext files and blocks on any scanner uncertainty. */
  private async scanWithClamAv(bytes: Buffer): Promise<void> {
    if (this.config.dhaMode === 'mock') return;
    const host = this.config.dhaAttachmentClamavHost;
    if (!host) throw new Error('DHA attachment scanner is not configured');
    const response = await new Promise<string>((resolve, reject) => {
      const socket = new Socket();
      const timer = setTimeout(() => socket.destroy(new Error('ClamAV scan timed out')), this.config.dhaAttachmentScanTimeoutMs);
      socket.once('error', (error) => {
        clearTimeout(timer);
        socket.destroy();
        reject(error);
      });
      socket.once('data', (data: Buffer) => {
        clearTimeout(timer);
        socket.destroy();
        resolve(data.toString('utf8'));
      });
      socket.connect(this.config.dhaAttachmentClamavPort, host, () => {
        socket.write(Buffer.from('zINSTREAM\0'));
        const length = Buffer.alloc(4);
        length.writeUInt32BE(bytes.length, 0);
        socket.write(length);
        socket.write(bytes);
        socket.write(Buffer.alloc(4));
      });
    });
    if (/\bOK\b/i.test(response)) return;
    if (/\bFOUND\b/i.test(response)) throw new NonRetryableIntegrationError(`Malware scanner rejected attachment: ${response.trim()}`);
    throw new Error(`Malware scanner returned an indeterminate result: ${response.trim()}`);
  }

  async queueAction(
    workflowId: number,
    action: WorkflowAction,
    payload: Record<string, unknown>,
    idempotencyKey: string,
    actorUserId?: number,
  ) {
    const workflow = await this.prisma.dhaClaimWorkflow.findUnique({
      where: { id: workflowId }, include: { steps: true },
    });
    if (!workflow) throw new NotFoundException(`DHA workflow ${workflowId} not found`);
    if (['COMPLETED', 'CLOSED'].includes(workflow.status)) {
      throw new BadRequestException('DHA workflow is already terminal');
    }
    const workflowStepKey = `dha:workflow:${workflowId}:${idempotencyKey}`;
    const duplicate = workflow.steps.find(
      (step) => step.idempotencyKey === workflowStepKey,
    );
    if (duplicate) {
      if (!duplicate.transactionId) {
        throw new ConflictException(
          'The prior DHA workflow action is pending recovery; do not submit a duplicate action',
        );
      }
      const transaction = await this.prisma.dhaTransaction.findUnique({
        where: { id: duplicate.transactionId },
      });
      if (!transaction) {
        throw new ConflictException(
          'The prior DHA workflow action has an invalid transaction reference',
        );
      }
      return { workflowId, stepId: duplicate.id, transaction, idempotent: true };
    }
    const sequence = Math.max(0, ...workflow.steps.map((step) => step.sequence)) + 1;
    const predecessor = PREREQUISITE[action];
    if (predecessor && !workflow.steps.some((step) => step.action === predecessor && step.status === 'COMPLETED')) {
      throw new BadRequestException(`DHA workflow action ${action} requires completed ${predecessor}`);
    }

    const step = await this.prisma.dhaClaimWorkflowStep.create({
      data: {
        workflowId,
        sequence,
        action,
        status: 'QUEUED',
        idempotencyKey: workflowStepKey,
        requestData: payload as never,
        queuedAt: new Date(),
      },
    });

    const command: DhaEclaimsCommand = {
      operation: ACTION_OPERATION[action],
      payload: this.withWorkflowValues(workflow, action, payload),
    };
    const { transaction } = await this.dha.queueEclaimsOperation(command, idempotencyKey, {
      facilityId: workflow.facilityId,
      branchId: workflow.branchId ?? undefined,
      patientId: workflow.patientId,
      actorUserId,
      workflowId,
      workflowStepId: step.id,
    });
    await this.prisma.dhaClaimWorkflowStep.update({
      where: { id: step.id }, data: { transactionId: transaction.id },
    });
    await this.prisma.dhaClaimWorkflow.update({
      where: { id: workflowId }, data: { status: 'IN_PROGRESS', lastError: null },
    });
    return { workflowId, stepId: step.id, transaction };
  }

  async recover(workflowId: number) {
    const workflow = await this.prisma.dhaClaimWorkflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    if (!workflow) throw new NotFoundException(`DHA workflow ${workflowId} not found`);
    const recoverable = workflow.steps.filter(
      (step) => step.transactionId && ['QUEUED', 'FAILED'].includes(step.status),
    );
    if (recoverable.length === 0) {
      return { workflowId, recovered: 0, reason: 'NO_RECOVERABLE_ACTIONS' as const };
    }
    const results = await Promise.all(
      recoverable.map((step) => this.dha.recoverEclaimsTransaction(step.transactionId!)),
    );
    await this.prisma.dhaClaimWorkflow.update({
      where: { id: workflowId },
      data: { status: 'IN_PROGRESS', lastError: null },
    });
    await this.prisma.dhaClaimWorkflowStep.updateMany({
      where: { id: { in: recoverable.map((step) => step.id) } },
      data: { status: 'QUEUED', errorMessage: null, queuedAt: new Date() },
    });
    return { workflowId, recovered: results.filter((result) => result.recovered).length };
  }

  async queueMultipartAction(
    workflowId: number,
    action: MultipartWorkflowAction,
    payload: Record<string, unknown>,
    idempotencyKey: string,
    actorUserId?: number,
  ) {
    const workflow = await this.prisma.dhaClaimWorkflow.findUnique({
      where: { id: workflowId },
      include: { steps: true, attachments: true },
    });
    if (!workflow) throw new NotFoundException(`DHA workflow ${workflowId} not found`);
    if (['SUBMITTED', 'DISCHARGED', 'CLOSED', 'COMPLETED'].includes(workflow.status)) {
      throw new BadRequestException('DHA workflow is already terminal');
    }
    this.validateMultipartPayload(action, payload, workflow.attachments.length);
    if (action === 'PREAUTH_SUBMIT') {
      const hasVisit = workflow.steps.some(
        (step) => step.action === 'VISIT' && step.status === 'COMPLETED',
      );
      const hasIntervention = workflow.steps.some(
        (step) => step.action === 'INTERVENTION' && step.status === 'COMPLETED',
      );
      if (!hasVisit || !hasIntervention || !(workflow.dhaVisitToken ?? workflow.dhaAuthorizationToken)) {
        throw new BadRequestException(
          'DHA preauthorization requires completed visit, intervention, and consent token',
        );
      }
    }
    const key = `dha:workflow:${workflowId}:${idempotencyKey}`;
    const duplicate = workflow.steps.find((step) => step.idempotencyKey === key);
    if (duplicate) return { workflowId, stepId: duplicate.id, idempotent: true };
    const step = await this.prisma.dhaClaimWorkflowStep.create({
      data: {
        workflowId,
        sequence: Math.max(0, ...workflow.steps.map((item) => item.sequence)) + 1,
        action,
        status: 'QUEUED',
        idempotencyKey: key,
        requestData: payload as never,
        queuedAt: new Date(),
      },
    });
    await this.queue.enqueue({
      integration: INTEGRATION_NAMES.DHA,
      operation: DHA_OPERATIONS.SUBMIT_MULTIPART_WORKFLOW,
      entityType: 'DHA_WORKFLOW_STEP',
      entityId: String(step.id),
      payload: { workflowId, stepId: step.id },
      idempotencyKey: `dha:multipart:${step.id}`,
      facilityId: workflow.facilityId,
      branchId: workflow.branchId ?? undefined,
    });
    await this.prisma.dhaClaimWorkflow.update({
      where: { id: workflowId }, data: { status: 'IN_PROGRESS', lastError: null },
    });
    await this.audit.recordEvent({
      moduleName: 'DHA', actionName: `${action}_QUEUED`, entityType: 'DHA_CLAIM_WORKFLOW_STEP',
      entityId: String(step.id), description: `DHA ${action} queued`, facilityId: workflow.facilityId,
      branchId: workflow.branchId ?? undefined, actorUserId,
    });
    return { workflowId, stepId: step.id, idempotent: false };
  }

  private validateMultipartPayload(
    action: MultipartWorkflowAction,
    payload: Record<string, unknown>,
    attachmentCount: number,
  ) {
    const required = action === 'PREAUTH_SUBMIT'
      ? ['preauth_type', 'intervention_code', 'service_start', 'service_end', 'items', 'diagnoses', 'doctors', 'provider_notification_email']
      : action === 'EMT_SUBMIT'
        ? ['provider_registration_number', 'diagnoses', 'interventions']
        : ['beneficiary_cr_id', 'reason_type', 'reason', 'biometric_attempts', 'facility_fr_code'];
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        throw new BadRequestException(`DHA ${action} requires ${field}`);
      }
    }
    if (action === 'PREAUTH_SUBMIT') {
      const type = String(payload.preauth_type).toUpperCase();
      const extensions: Record<string, string[]> = {
        SURGICAL: ['chief_complaint', 'surgery_date', 'type_of_anaesthesia', 'vital_signs', 'history_of_present_illness', 'physical_examination', 'investigation_report_details'],
        RENAL: ['number_of_sessions_required', 'frequency_of_sessions', 'clinical_indications', 'cost_per_session'],
        ONCOLOGY: ['carcinoma_staging', 'number_of_sessions_required', 'comorbidity', 'cost_per_session', 'treatment_setting'],
        OPTICAL: ['necessity_of_service', 'lens_prescription', 'lens_amount', 'eye_examination_amount', 'frame_amount', 'new_or_replacement'],
        IMAGING: ['clinical_indications'],
        NORMAL: [],
      };
      if (!extensions[type]) throw new BadRequestException('DHA preauth_type is invalid');
      for (const field of extensions[type]) if (!payload[field]) throw new BadRequestException(`DHA ${type} preauth requires ${field}`);
      if (attachmentCount === 0) throw new BadRequestException('DHA preauthorization requires supporting attachments');
    }
    if (action === 'OTP_WHITELIST_SUBMIT' && attachmentCount === 0) {
      throw new BadRequestException('DHA OTP whitelist requests require supporting attachments');
    }
  }

  private async handleMultipartWorkflow(item: OutboundQueueItem): Promise<void> {
    const input = item.payload as { workflowId?: unknown; stepId?: unknown };
    if (!Number.isInteger(input?.workflowId) || !Number.isInteger(input?.stepId)) throw new NonRetryableIntegrationError('Invalid DHA multipart workflow queue payload');
    const step = await this.prisma.dhaClaimWorkflowStep.findUnique({
      where: { id: input.stepId as number }, include: { workflow: { include: { attachments: true } } },
    });
    if (!step || step.workflowId !== input.workflowId) throw new NonRetryableIntegrationError('DHA multipart workflow step not found');
    if (step.status === 'COMPLETED') return;
    const payload = (step.requestData ?? {}) as Record<string, unknown>;
    const attachments = step.workflow.attachments;
    if (attachments.some((attachment) => attachment.scanStatus !== 'CLEAN')) throw new Error('DHA multipart workflow is waiting for clean attachment scans');
    const action = step.action as MultipartWorkflowAction;
    const submission = this.buildMultipartSubmission(action, payload, attachments, step.workflow.dhaVisitToken ?? step.workflow.dhaAuthorizationToken);
    try {
      const result = await this.client.submitMultipartWorkflow(submission, { facilityId: step.workflow.facilityId, branchId: step.workflow.branchId ?? undefined, correlationId: item.correlationId ?? undefined });
      if (result.status === 'REJECTED' || result.status === 'FAILED') throw new NonRetryableIntegrationError(`DHA rejected ${action}`);
      await this.prisma.dhaClaimWorkflowStep.update({ where: { id: step.id }, data: { status: 'COMPLETED', responseData: (result.raw ?? {}) as never, completedAt: new Date(), errorMessage: null } });
      await this.prisma.dhaClaimWorkflow.update({ where: { id: step.workflowId }, data: { status: action === 'EMT_SUBMIT' ? 'SUBMITTED' : 'IN_PROGRESS', dhaClaimReference: result.externalRef ?? step.workflow.dhaClaimReference, lastError: null } });
      await this.audit.recordEvent({ moduleName: 'DHA', actionName: `${action}_COMPLETED`, entityType: 'DHA_CLAIM_WORKFLOW_STEP', entityId: String(step.id), description: `DHA ${action} completed`, facilityId: step.workflow.facilityId, branchId: step.workflow.branchId ?? undefined });
    } catch (error) {
      const permanent = error instanceof NonRetryableIntegrationError;
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.dhaClaimWorkflowStep.update({ where: { id: step.id }, data: { status: permanent ? 'FAILED' : 'QUEUED', errorMessage: message.slice(0, 4_000) } });
      await this.prisma.dhaClaimWorkflow.update({ where: { id: step.workflowId }, data: { status: permanent ? 'FAILED' : 'IN_PROGRESS', lastError: message.slice(0, 4_000) } });
      throw error;
    }
  }

  private buildMultipartSubmission(
    action: MultipartWorkflowAction,
    payload: Record<string, unknown>,
    attachments: Array<{ documentType: string; fileName: string; mimeType: string; encryptedData: string; encryptionIv: string; encryptionTag: string }>,
    consentToken: string | null,
  ): DhaMultipartWorkflowSubmission {
    const path = action === 'PREAUTH_SUBMIT' ? '/preauths' : action === 'EMT_SUBMIT' ? '/claims/emt' : '/patients/otp-whitelists';
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (key !== 'preauth_type') fields[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    if (action === 'PREAUTH_SUBMIT' && consentToken && !fields.consent_token) fields.consent_token = consentToken;
    const metadata = attachments.map((attachment, index) => ({ title: attachment.fileName, document_type: attachment.documentType, file_field_name: `attachments_${index}_file_blob` }));
    if (attachments.length) fields.attachments = JSON.stringify(metadata);
    return { path, fields, files: attachments.map((attachment, index) => ({ fieldName: `attachments_${index}_file_blob`, fileName: attachment.fileName, mimeType: attachment.mimeType, bytes: this.decryptAttachment(attachment) })) };
  }

  private withWorkflowValues(
    workflow: {
      serviceType: string;
      dhaAuthorizationGuid: string | null;
      dhaAuthorizationToken: string | null;
      dhaVisitToken: string | null;
    },
    action: WorkflowAction,
    payload: Record<string, unknown>,
  ) {
    if (action === 'EMERGENCY') {
      return { ...payload };
    }
    if (action === 'AUTHORIZE') return { ...payload, service_type: workflow.serviceType };
    if (action === 'VISIT') {
      return {
        ...payload,
        service_type: workflow.serviceType,
        ...(workflow.dhaAuthorizationGuid && !payload.auth_guid
          ? { auth_guid: workflow.dhaAuthorizationGuid } : {}),
      };
    }
    const consentToken = workflow.dhaVisitToken ?? workflow.dhaAuthorizationToken;
    return {
      ...payload,
      ...(consentToken && !payload.consent_token
        ? { consent_token: consentToken }
        : {}),
    };
  }
}
