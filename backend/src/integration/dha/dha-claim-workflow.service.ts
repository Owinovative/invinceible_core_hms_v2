import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import { IntegrationConfigService } from '../integration-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DhaService } from './dha.service';
import type { DhaEclaimsCommand, DhaEclaimsOperation } from './eclaims-contract';

type WorkflowAction =
  | 'AUTHORIZE'
  | 'VISIT'
  | 'INTERVENTION'
  | 'DIAGNOSIS'
  | 'BILLABLE_ITEM'
  | 'PREVIEW'
  | 'SUBMIT'
  | 'DISCHARGE'
  | 'CLOSE';

const ACTION_OPERATION: Record<WorkflowAction, DhaEclaimsOperation> = {
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
export class DhaClaimWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dha: DhaService,
    private readonly config: IntegrationConfigService,
  ) {}

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

  async stageAttachment(params: {
    workflowId: number;
    documentType: string;
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
  }) {
    const workflow = await this.prisma.dhaClaimWorkflow.findUnique({ where: { id: params.workflowId } });
    if (!workflow) throw new NotFoundException(`DHA workflow ${params.workflowId} not found`);
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
    return this.prisma.dhaWorkflowAttachment.create({
      data: {
        workflowId: workflow.id,
        documentType: params.documentType,
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
        idempotencyKey: `dha:workflow:${workflowId}:${idempotencyKey}`,
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

  private withWorkflowValues(
    workflow: { serviceType: string; dhaAuthorizationGuid: string | null },
    action: WorkflowAction,
    payload: Record<string, unknown>,
  ) {
    if (action === 'AUTHORIZE') return { ...payload, service_type: workflow.serviceType };
    if (action === 'VISIT') {
      return {
        ...payload,
        service_type: workflow.serviceType,
        ...(workflow.dhaAuthorizationGuid && !payload.auth_guid
          ? { auth_guid: workflow.dhaAuthorizationGuid } : {}),
      };
    }
    return payload;
  }
}
