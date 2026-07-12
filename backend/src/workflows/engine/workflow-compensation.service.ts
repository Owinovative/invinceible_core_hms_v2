import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowSnapshotService } from './workflow-snapshot.service';

/**
 * WorkflowCompensationService
 *
 * Manages compensating transactions (rollback) for workflow instances.
 *
 * Compensation is a first-class workflow concept — it is itself an ordered sequence
 * of reverse actions, one per completed step that defined a compensationWorkflowCode.
 *
 * Lifecycle:
 *   1. Capture PRE_COMPENSATION snapshot (forensic preservation)
 *   2. Walk completed steps in REVERSE order
 *   3. For each step with compensationWorkflowCode, log the compensation action
 *   4. Mark the instance as CANCELLED and write an audit entry
 *
 * Future: Each compensationWorkflowCode can trigger a full compensation sub-workflow.
 */
@Injectable()
export class WorkflowCompensationService {
  private readonly logger = new Logger(WorkflowCompensationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngine: WorkflowEngineService,
    private readonly snapshotService: WorkflowSnapshotService,
  ) {}

  /**
   * Initiates compensation for a workflow instance.
   * Captures a pre-compensation snapshot, reverses completed steps, and cancels the instance.
   */
  async startCompensation(
    instanceId: string,
    reason: string,
    correlationId?: string,
  ): Promise<{ instanceId: string; compensatedSteps: string[]; status: string }> {
    this.logger.log(`[Compensation] Starting compensation for instance ${instanceId}. Reason: ${reason}`);

    // 1. Capture snapshot BEFORE any compensation action
    await this.snapshotService.captureSnapshot(instanceId, 'PRE_COMPENSATION');

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { instanceId },
      include: {
        steps: { where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } },
        version: true,
      },
    });

    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);

    if (['COMPLETED', 'CANCELLED'].includes(instance.status)) {
      throw new Error(`Cannot compensate instance ${instanceId} in status ${instance.status}`);
    }

    // 2. Walk completed steps in reverse order (LIFO — last in, first compensated)
    const compensatedSteps: string[] = [];
    const schema = instance.version?.schema as any;
    const stepDefs: any[] = schema?.steps ?? [];

    for (const completedStep of instance.steps) {
      const stepDef = stepDefs.find((s: any) => s.id === completedStep.stepDefinitionId);
      const compensationCode = stepDef?.compensationWorkflowCode;

      if (compensationCode) {
        this.logger.log(
          `[Compensation] Step [${completedStep.stepDefinitionId}] → Compensation workflow: ${compensationCode}`,
        );
        compensatedSteps.push(completedStep.stepDefinitionId);

        // Future: await this.workflowEngine.instantiateWorkflow(compensationCode, { ... });
        // For now: record the compensation intent in the audit log
        await this.prisma.workflowAudit.create({
          data: {
            workflowInstanceId: instance.id,
            oldState: completedStep.status,
            newState: 'COMPENSATED',
            triggerEvent: 'CompensationStarted',
            correlationId,
            reason: `Compensating step [${completedStep.stepDefinitionId}] via ${compensationCode}`,
            metadata: { compensationWorkflowCode: compensationCode, stepId: completedStep.stepDefinitionId } as any,
          },
        });
      }
    }

    // 3. Transition the instance to CANCELLED (via engine to guarantee audit + outbox)
    await this.workflowEngine.transitionInstance(instanceId, 'CANCELLED', 'CompensationCompleted', correlationId);

    this.logger.log(
      `[Compensation] Instance ${instanceId} cancelled. Steps compensated: [${compensatedSteps.join(', ')}]`,
    );

    return { instanceId, compensatedSteps, status: 'CANCELLED' };
  }

  /**
   * Returns the compensation history (audit entries) for a workflow instance.
   */
  async getCompensationHistory(instanceId: string): Promise<any[]> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { instanceId },
      select: { id: true },
    });

    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);

    return this.prisma.workflowAudit.findMany({
      where: {
        workflowInstanceId: instance.id,
        triggerEvent: { contains: 'Compensation' },
      },
      orderBy: { timestamp: 'asc' },
    });
  }
}
