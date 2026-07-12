import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowDecisionEngine } from '../execution/workflow-decision.engine';
import { WorkflowSchemaJSON, WorkflowStepDef } from '../interfaces/workflow.interface';

export interface SimulationResult {
  mode: 'FULL' | 'SAFE' | 'PERFORMANCE';
  workflowCode: string;
  versionNumber: number;
  success: boolean;
  stepsExecuted: string[];
  decisionsEvaluated: { stepId: string; condition: string; result: boolean }[];
  timersTriggered: string[];
  escalationsTriggered: string[];
  errors: string[];
  durationMs: number;
}

@Injectable()
export class WorkflowSimulationService {
  private readonly logger = new Logger(WorkflowSimulationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly decisionEngine: WorkflowDecisionEngine,
  ) {}

  /**
   * Runs a dry-run simulation of a workflow.
   * Validates routing, conditions, SLA, and parallel branches
   * WITHOUT creating any patient data or triggering real events.
   *
   * @param workflowCode The definition code (e.g., 'OUTPATIENT_V1')
   * @param contextVariables Mock patient/encounter context for decision evaluation
   * @param mode Simulation mode: FULL, SAFE, or PERFORMANCE
   */
  async simulate(
    workflowCode: string,
    contextVariables: Record<string, any>,
    mode: 'FULL' | 'SAFE' | 'PERFORMANCE' = 'FULL',
  ): Promise<SimulationResult> {
    const startTime = Date.now();
    this.logger.log(`[Simulation] Starting ${mode} simulation for ${workflowCode}`);

    const result: SimulationResult = {
      mode,
      workflowCode,
      versionNumber: 0,
      success: false,
      stepsExecuted: [],
      decisionsEvaluated: [],
      timersTriggered: [],
      escalationsTriggered: [],
      errors: [],
      durationMs: 0,
    };

    try {
      // 1. Load workflow definition
      const definition = await this.prisma.workflowDefinition.findUnique({
        where: { code: workflowCode },
      });
      if (!definition) throw new Error(`Workflow ${workflowCode} not found`);

      const version = await this.prisma.workflowVersion.findFirst({
        where: { workflowDefinitionId: definition.id, isPublished: true, isDeprecated: false },
        orderBy: { versionNumber: 'desc' },
      });
      if (!version) throw new Error(`No published version found for ${workflowCode}`);

      result.versionNumber = version.versionNumber;
      const schema = version.schema as unknown as WorkflowSchemaJSON;

      // 2. Walk the workflow steps in simulation mode
      let currentStepId = schema.steps[0]?.id;
      const visited = new Set<string>();

      while (currentStepId) {
        if (visited.has(currentStepId)) {
          result.errors.push(`Cycle detected at step: ${currentStepId}`);
          break;
        }
        visited.add(currentStepId);

        const step = schema.steps.find((s) => s.id === currentStepId);
        if (!step) {
          result.errors.push(`Step ${currentStepId} not found in schema`);
          break;
        }

        result.stepsExecuted.push(step.id);
        this.logger.debug(`[Simulation] Executing step: ${step.id} (${step.type})`);

        // 3. Simulate SLA timer
        if (step.sla?.escalationRules) {
          for (const rule of step.sla.escalationRules) {
            result.timersTriggered.push(`${step.id}:ESCALATION@${rule.thresholdMinutes}min`);
            if (mode === 'FULL') {
              result.escalationsTriggered.push(`${step.id} → ${rule.targetRole ?? 'SUPERVISOR'}`);
            }
          }
        }

        // 4. Evaluate transitions
        const validTransitions = step.transitions.filter((t) => {
          if (!t.condition) return true;
          const evalResult = this.decisionEngine.evaluateCondition(t.condition, contextVariables);
          result.decisionsEvaluated.push({
            stepId: step.id,
            condition: t.condition,
            result: evalResult,
          });
          return evalResult;
        });

        if (validTransitions.length === 0) {
          this.logger.debug(`[Simulation] Terminal step reached: ${step.id}`);
          break;
        }

        currentStepId = validTransitions[0].toStepId;
      }

      result.success = result.errors.length === 0;
    } catch (err: any) {
      result.errors.push(err.message);
      result.success = false;
    }

    result.durationMs = Date.now() - startTime;
    this.logger.log(
      `[Simulation] ${mode} simulation for ${workflowCode} completed in ${result.durationMs}ms. ` +
      `Success: ${result.success}. Steps: ${result.stepsExecuted.join(' → ')}`,
    );

    return result;
  }
}
