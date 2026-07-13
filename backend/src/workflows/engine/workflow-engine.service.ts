import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowVersionService } from './workflow-version.service';
import { WorkflowStateMachine } from './workflow-state-machine';
import { WorkflowEventPublisher } from '../integration/workflow-event-publisher';
import { WorkflowStatus } from '../interfaces/workflow.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly versionService: WorkflowVersionService,
    private readonly stateMachine: WorkflowStateMachine,
    private readonly eventPublisher: WorkflowEventPublisher,
  ) {}

  async instantiateWorkflow(workflowCode: string, payload: {
    patientId: number;
    encounterId?: number;
    facilityId: number;
    tenantId?: number;
    contextVariables?: Record<string, any>;
    correlationId?: string;
  }) {
    this.logger.log(`Instantiating workflow ${workflowCode} for patient ${payload.patientId}`);
    
    // 1. Get the latest version
    const { definition, version } = await this.versionService.getLatestVersion(workflowCode);

    // 2. Create Instance and Initial Audit
    const instanceId = uuidv4();
    
    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.create({
        data: {
          instanceId,
          workflowDefinitionId: definition.id,
          workflowVersionId: version.id,
          patientId: payload.patientId,
          encounterId: payload.encounterId,
          facilityId: payload.facilityId,
          tenantId: payload.tenantId || 1,
          status: 'CREATED',
          contextVariables: payload.contextVariables || {},
          startedAt: new Date()
        }
      });

      await tx.workflowAudit.create({
        data: {
          workflowInstanceId: instance.id,
          oldState: null,
          newState: 'CREATED',
          triggerEvent: 'WorkflowInstantiation',
          correlationId: payload.correlationId,
          reason: 'Initial creation from Event Bus trigger'
        }
      });

      await this.eventPublisher.publishWorkflowCreated({
        instanceId,
        workflowCode,
        patientId: payload.patientId,
        encounterId: payload.encounterId,
        facilityId: payload.facilityId,
        tenantId: payload.tenantId,
        correlationId: payload.correlationId,
      }, tx);

      return instance;
    });
  }

  async transitionInstance(instanceId: string, toStatus: WorkflowStatus, triggerEvent?: string, correlationId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.findUnique({
        where: { instanceId },
        include: { version: { include: { definition: true } } }
      });
      if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);

      // 1. Validate Transition
      this.stateMachine.assertInstanceTransition(instance.status as WorkflowStatus, toStatus);

      // 2. Update Instance
      const updated = await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { 
          status: toStatus,
          completedAt: toStatus === 'COMPLETED' || toStatus === 'CANCELLED' || toStatus === 'FAILED' ? new Date() : null
        }
      });

      // 3. Audit
      await tx.workflowAudit.create({
        data: {
          workflowInstanceId: instance.id,
          oldState: instance.status,
          newState: toStatus,
          triggerEvent,
          correlationId,
          reason: 'State transition requested'
        }
      });

      if (toStatus === 'COMPLETED') {
        await this.eventPublisher.publishWorkflowCompleted({
          instanceId,
          workflowCode: instance.version.definition.code,
          patientId: instance.patientId ?? undefined,
          encounterId: instance.encounterId ?? undefined,
          facilityId: instance.facilityId,
          tenantId: instance.tenantId,
          correlationId,
        }, tx);
      }

      return updated;
    });
  }
}
