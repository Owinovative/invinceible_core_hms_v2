import { Injectable, Logger } from '@nestjs/common';
import { WorkflowPolicyEngine } from './workflow-policy.engine';

@Injectable()
export class WorkflowRouterService {
  private readonly logger = new Logger(WorkflowRouterService.name);

  constructor(private readonly policyEngine: WorkflowPolicyEngine) {}

  /**
   * Resolves the correct workflow definition code for a patient.
   * Delegates to the Policy Engine which evaluates the routing rules.
   */
  async route(context: Record<string, any>): Promise<string> {
    const code = await this.policyEngine.resolveWorkflowCode(context);
    this.logger.log(`[Router] Routed to workflow: ${code} (context: age=${context.age}, emergency=${context.isEmergency}, pregnant=${context.isPregnant})`);
    return code;
  }
}
