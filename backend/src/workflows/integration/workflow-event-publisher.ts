import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '../../events/event-publisher';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowEventTypes } from '../../events/registry/event-registry';
import { v4 as uuidv4 } from 'uuid';

/**
 * WorkflowEventPublisher
 *
 * The Workflow Engine's dedicated outbound event gateway.
 * Publishes workflow lifecycle events into the Phase 4 Event Bus using the
 * Transactional Outbox Pattern — ensuring workflow state changes are
 * atomically paired with their event publications.
 *
 * Transport chain:
 *   WorkflowEngine → WorkflowEventPublisher → EventPublisher → Outbox → EventDispatcher
 *
 * This is the ONLY class in the WorkflowModule allowed to call EventPublisher.
 */
@Injectable()
export class WorkflowEventPublisher {
  private readonly logger = new Logger(WorkflowEventPublisher.name);

  constructor(
    private readonly eventPublisher: EventPublisher,
    private readonly prisma: PrismaService,
  ) {}

  async publishWorkflowCreated(opts: {
    instanceId: string;
    workflowCode: string;
    patientId?: number;
    encounterId?: number;
    facilityId: number;
    tenantId?: number;
    correlationId?: string;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const event = this.eventPublisher.create({
      eventType: WorkflowEventTypes.WORKFLOW_CREATED as any,
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      correlationId: opts.correlationId ?? uuidv4(),
      aggregateId: opts.instanceId,
      aggregateType: 'WorkflowInstance',
      patientId: opts.patientId ?? 0,
      encounterId: opts.encounterId ?? null,
      facilityId: opts.facilityId,
      branchId: opts.facilityId,
      tenantId: opts.tenantId ?? 1,
      userId: 0,
      sourceModule: 'WorkflowModule',
      priority: 'MEDIUM',
      timestamp: new Date(),
      metadata: {},
      payload: {
        instanceId: opts.instanceId,
        workflowCode: opts.workflowCode,
      },
    });

    await this.eventPublisher.publish(event, tx);
    this.logger.log(`[WorkflowEventPublisher] Published WorkflowCreated for instance ${opts.instanceId}`);
  }

  async publishWorkflowCompleted(opts: {
    instanceId: string;
    workflowCode: string;
    patientId?: number;
    encounterId?: number;
    facilityId: number;
    tenantId?: number;
    correlationId?: string;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const event = this.eventPublisher.create({
      eventType: WorkflowEventTypes.WORKFLOW_COMPLETED as any,
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      correlationId: opts.correlationId ?? uuidv4(),
      aggregateId: opts.instanceId,
      aggregateType: 'WorkflowInstance',
      patientId: opts.patientId ?? 0,
      encounterId: opts.encounterId ?? null,
      facilityId: opts.facilityId,
      branchId: opts.facilityId,
      tenantId: opts.tenantId ?? 1,
      userId: 0,
      sourceModule: 'WorkflowModule',
      priority: 'MEDIUM',
      timestamp: new Date(),
      metadata: {},
      payload: {
        instanceId: opts.instanceId,
        workflowCode: opts.workflowCode,
      },
    });

    await this.eventPublisher.publish(event, tx);
    this.logger.log(`[WorkflowEventPublisher] Published WorkflowCompleted for instance ${opts.instanceId}`);
  }

  async publishTaskAssigned(opts: {
    taskId: string;
    instanceId: string;
    targetRole?: string;
    userId?: number;
    patientId?: number;
    facilityId: number;
    tenantId?: number;
    correlationId?: string;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const event = this.eventPublisher.create({
      eventType: WorkflowEventTypes.TASK_ASSIGNED as any,
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      correlationId: opts.correlationId ?? uuidv4(),
      aggregateId: opts.taskId,
      aggregateType: 'WorkflowTask',
      patientId: opts.patientId ?? 0,
      encounterId: null,
      facilityId: opts.facilityId,
      branchId: opts.facilityId,
      tenantId: opts.tenantId ?? 1,
      userId: 0,
      sourceModule: 'WorkflowModule',
      priority: 'LOW',
      timestamp: new Date(),
      metadata: {},
      payload: {
        taskId: opts.taskId,
        instanceId: opts.instanceId,
        targetRole: opts.targetRole,
        assignedToUserId: opts.userId,
      },
    });

    await this.eventPublisher.publish(event, tx);
    this.logger.log(`[WorkflowEventPublisher] Published TaskAssigned for task ${opts.taskId}`);
  }

  async publishWorkflowEscalated(opts: {
    instanceId: string;
    taskId: string;
    reason: string;
    escalatedToRole?: string;
    patientId?: number;
    facilityId: number;
    tenantId?: number;
    correlationId?: string;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const event = this.eventPublisher.create({
      eventType: WorkflowEventTypes.WORKFLOW_ESCALATED as any,
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      correlationId: opts.correlationId ?? uuidv4(),
      aggregateId: opts.instanceId,
      aggregateType: 'WorkflowInstance',
      patientId: opts.patientId ?? 0,
      encounterId: null,
      facilityId: opts.facilityId,
      branchId: opts.facilityId,
      tenantId: opts.tenantId ?? 1,
      userId: 0,
      sourceModule: 'WorkflowModule',
      priority: 'HIGH',
      timestamp: new Date(),
      metadata: {},
      payload: {
        instanceId: opts.instanceId,
        taskId: opts.taskId,
        reason: opts.reason,
        escalatedToRole: opts.escalatedToRole,
      },
    });

    await this.eventPublisher.publish(event, tx);
    this.logger.log(`[WorkflowEventPublisher] Published WorkflowEscalated for instance ${opts.instanceId}`);
  }
}
