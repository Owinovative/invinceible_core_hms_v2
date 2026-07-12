import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDecisionEngine } from '../execution/workflow-decision.engine';
import { WorkflowVersionService } from './workflow-version.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowSchemaJSON } from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowPolicyEngine {
  private readonly logger = new Logger(WorkflowPolicyEngine.name);

  constructor(
    private readonly decisionEngine: WorkflowDecisionEngine,
    private readonly versionService: WorkflowVersionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Evaluates all guard conditions for a proposed workflow step transition.
   * Returns true if all guards pass; false if any guard blocks the transition.
   */
  evaluateGuards(guards: string[], context: Record<string, any>): boolean {
    for (const guard of guards) {
      const passes = this.decisionEngine.evaluateCondition(guard, context);
      if (!passes) {
        this.logger.warn(`[PolicyEngine] Guard FAILED: "${guard}"`);
        return false;
      }
    }
    return true;
  }

  /**
   * Determines the correct workflow definition code for a given patient context.
   * This is the Dynamic Router — the rule engine that selects the template.
   *
   * Priority order: Emergency > ANC > Pediatric > Default Outpatient
   */
  async resolveWorkflowCode(context: Record<string, any>): Promise<string> {
    if (context.triagePriority === 'EMERGENCY' || context.isEmergency) {
      const exists = await this.definitionExists('EMERGENCY_V1');
      if (exists) return 'EMERGENCY_V1';
    }

    if (context.isPregnant) {
      const exists = await this.definitionExists('ANC_V1');
      if (exists) return 'ANC_V1';
    }

    if (context.age !== null && context.age < 5) {
      const exists = await this.definitionExists('PEDIATRIC_V1');
      if (exists) return 'PEDIATRIC_V1';
    }

    return 'OUTPATIENT_V1'; // Default fallback
  }

  private async definitionExists(code: string): Promise<boolean> {
    const def = await this.prisma.workflowDefinition.findUnique({ where: { code } });
    return !!def;
  }
}
