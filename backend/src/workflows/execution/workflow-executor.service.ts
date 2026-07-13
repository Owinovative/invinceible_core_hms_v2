import { Injectable, Logger } from '@nestjs/common';
import { WorkflowStepRunnerService } from './workflow-step-runner.service';
import { WorkflowDecisionEngine } from './workflow-decision.engine';
import { WorkflowSchemaJSON, WorkflowStepDef } from '../interfaces/workflow.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stepRunner: WorkflowStepRunnerService,
    private readonly decisionEngine: WorkflowDecisionEngine,
  ) {}

  /**
   * Starts a workflow from its very first step.
   */
  async startExecution(instanceId: string, schema: WorkflowSchemaJSON) {
    this.logger.log(`Starting execution for instance ${instanceId}`);
    
    // Find first step (usually the first one in the array, or designated start node)
    const firstStep = schema.steps[0];
    if (!firstStep) {
      this.logger.warn(`Workflow schema has no steps.`);
      return;
    }

    const instance = await this.prisma.workflowInstance.findUnique({ where: { instanceId }});
    if (!instance) throw new Error(`Instance ${instanceId} not found`);
    await this.stepRunner.startStep(instanceId, firstStep, instance.contextVariables);
  }

  /**
   * Progresses the workflow to the next step based on transitions.
   */
  async progressExecution(instanceId: string, currentStepId: string, schema: WorkflowSchemaJSON) {
    this.logger.log(`Progressing execution for instance ${instanceId} from step ${currentStepId}`);

    const instance = await this.prisma.workflowInstance.findUnique({ where: { instanceId }});
    if (!instance) throw new Error(`Instance ${instanceId} not found`);
    const currentStepDef = schema.steps.find(s => s.id === currentStepId);

    if (!currentStepDef) throw new Error(`Step ${currentStepId} not found in schema`);

    // Complete the current step
    const completionResult = await this.stepRunner.completeStep(instanceId, currentStepId);
    if (!completionResult) return; // Already completed or not found

    // Evaluate transitions
    const validTransitions = currentStepDef.transitions.filter(transition => {
      if (!transition.condition) return true; // Unconditional transition
      return this.decisionEngine.evaluateCondition(transition.condition, instance.contextVariables as Record<string, any>);
    });

    if (validTransitions.length === 0) {
      // Reached the end or blocked
      this.logger.log(`Workflow instance ${instanceId} reached terminal state.`);
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
      return;
    }

    // For PARALLEL gateways we start ALL valid transitions;
    // for normal steps we take the FIRST matching condition.
    const nextTransitions = currentStepDef.type === 'PARALLEL'
      ? validTransitions
      : [validTransitions[0]];

    for (const nextTransition of nextTransitions) {
      const nextStepDef = schema.steps.find(s => s.id === nextTransition.toStepId);
      if (!nextStepDef) continue;

      // ── Parallel Join check ─────────────────────────────────────────────
      // If the next step defines a joinType, verify all required predecessors
      // have completed before we allow progression.
      if (nextStepDef.joinType) {
        const predecessors = schema.steps.filter(s =>
          s.transitions.some(t => t.toStepId === nextStepDef.id)
        );
        const predecessorIds = predecessors.map(s => s.id);

        const completedPredecessors = await this.prisma.workflowStep.findMany({
          where: {
            workflowInstanceId: instance.id,
            stepDefinitionId: { in: predecessorIds },
            status: 'COMPLETED',
          },
        });

        const completedIds = new Set(completedPredecessors.map(s => s.stepDefinitionId));

        const joinSatisfied = nextStepDef.joinType === 'ALL'
          ? predecessorIds.every(id => completedIds.has(id))
          : predecessorIds.some(id => completedIds.has(id));

        if (!joinSatisfied) {
          this.logger.log(
            `[Join] Step [${nextStepDef.id}] join type=${nextStepDef.joinType} not satisfied yet. ` +
            `Completed: [${[...completedIds].join(', ')}] / Required: [${predecessorIds.join(', ')}]`,
          );
          continue; // Block — wait for remaining branches
        }
      }

      // Record the transition
      await this.prisma.workflowTransition.create({
        data: {
          workflowInstanceId: instance.id,
          fromStepId: currentStepId,
          toStepId: nextStepDef.id,
          conditionMet: nextTransition.condition || 'DEFAULT',
        },
      });

      // Enrich audit with decision result
      if (nextTransition.condition) {
        const audit = this.decisionEngine.evaluateConditionWithAudit(
          nextTransition.condition,
          instance.contextVariables as Record<string, any>,
        );
        await this.prisma.workflowAudit.create({
          data: {
            workflowInstanceId: instance.id,
            oldState: currentStepId,
            newState: nextStepDef.id,
            triggerEvent: 'DecisionEvaluated',
            reason: `Transition condition evaluated`,
            metadata: {
              decisionExpression: audit.expression,
              decisionResult: audit.result,
              resolvedValues: audit.resolvedValues,
            } as any,
          },
        });
      }

      await this.stepRunner.startStep(instanceId, nextStepDef, instance.contextVariables);
    }
  }
}
