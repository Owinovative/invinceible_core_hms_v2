import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowStepDef } from '../interfaces/workflow.interface';
import { TaskService } from '../tasks/task.service';
import { WorkflowDecisionEngine } from './workflow-decision.engine';
import { WorkflowStateMachine } from '../engine/workflow-state-machine';

@Injectable()
export class WorkflowStepRunnerService {
  private readonly logger = new Logger(WorkflowStepRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
    private readonly decisionEngine: WorkflowDecisionEngine,
    private readonly stateMachine: WorkflowStateMachine,
  ) {}

  /**
   * Initializes a new step execution.
   */
  async startStep(instanceId: string, stepDef: WorkflowStepDef, contextVariables: any) {
    this.logger.log(`Starting step [${stepDef.id}] for instance [${instanceId}]`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve instance
      const instance = await tx.workflowInstance.findUnique({
        where: { instanceId }
      });
      if (!instance) throw new Error(`Instance ${instanceId} not found`);

      // 2. Idempotency Check (Does this step already exist for this instance?)
      // For simple linear workflows, a step runs once. For loops, we need triggerEventId.
      // Here we assume basic idempotency per instance + stepId
      let step = await tx.workflowStep.findFirst({
        where: { workflowInstanceId: instance.id, stepDefinitionId: stepDef.id }
      });

      if (!step) {
        step = await tx.workflowStep.create({
          data: {
            workflowInstanceId: instance.id,
            stepDefinitionId: stepDef.id,
            status: 'ACTIVE',
            startedAt: new Date()
          }
        });
      } else if (step.status === 'COMPLETED' || step.status === 'SKIPPED') {
        this.logger.warn(`Step [${stepDef.id}] already completed/skipped for instance [${instanceId}]`);
        return step;
      }

      // 3. Update Instance current step
      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { currentStepId: stepDef.id, status: 'IN_PROGRESS' }
      });

      // 4. Handle Step Type
      switch (stepDef.type) {
        case 'TASK':
          await this.taskService.createTask(tx, instance, step, stepDef);
          // Instance enters WAITING state until human task completes
          await tx.workflowInstance.update({
            where: { id: instance.id },
            data: { status: 'WAITING' }
          });
          break;
        case 'DECISION':
        case 'EVENT_WAIT':
        case 'TIMER':
        case 'PARALLEL':
          // Future implementations
          this.logger.warn(`Step type ${stepDef.type} is not fully implemented yet.`);
          break;
        default:
          throw new Error(`Unknown step type: ${stepDef.type}`);
      }

      return step;
    });
  }

  /**
   * Completes a step and determines the next step.
   */
  async completeStep(instanceId: string, stepId: string) {
    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.findUnique({
        where: { instanceId },
        include: { version: true }
      });
      if (!instance) throw new Error(`Instance ${instanceId} not found`);

      const step = await tx.workflowStep.findFirst({
        where: { workflowInstanceId: instance.id, stepDefinitionId: stepId }
      });

      if (!step || step.status === 'COMPLETED') return null;

      // Mark step completed
      await tx.workflowStep.update({
        where: { id: step.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });

      // Find next step definition via router/executor (handled by WorkflowExecutor)
      return { instance, step };
    });
  }
}
