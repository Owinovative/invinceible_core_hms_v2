import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowSchemaJSON, WorkflowStepDef } from '../interfaces/workflow.interface';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * WorkflowDefinitionService
 *
 * Manages workflow definition queries and structural pre-activation validation.
 * Validation must pass before a new workflow version can enter production.
 */
@Injectable()
export class WorkflowDefinitionService {
  private readonly logger = new Logger(WorkflowDefinitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllDefinitions() {
    return this.prisma.workflowDefinition.findMany({
      include: {
        versions: {
          where: { isPublished: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getDefinition(code: string) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { code },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!definition) {
      throw new NotFoundException(`Workflow definition ${code} not found`);
    }

    return definition;
  }

  /**
   * Validates the structural integrity of a workflow schema.
   *
   * Checks:
   *   1. Exactly one start node (no other step transitions into the first step)
   *   2. At least one terminal node (empty transitions array)
   *   3. No orphan transitions (all toStepId values reference valid step IDs)
   *   4. No unreachable steps (all steps reachable from the start node via BFS)
   *   5. No circular paths (DFS cycle detection — loops only tolerated on EVENT_WAIT/TIMER steps)
   *   6. All decision expressions are non-empty strings
   *   7. Compensation targets are non-empty strings if present
   */
  validateDefinition(schema: WorkflowSchemaJSON): ValidationResult {
    const errors: string[] = [];
    const steps = schema.steps;

    if (!steps || steps.length === 0) {
      return { valid: false, errors: ['Workflow schema has no steps'] };
    }

    const stepIds = new Set(steps.map((s) => s.id));

    // ── 1. Verify all toStepId references are valid ──────────────────────────
    for (const step of steps) {
      for (const t of step.transitions) {
        if (!stepIds.has(t.toStepId)) {
          errors.push(`Step [${step.id}]: transition targets unknown step '${t.toStepId}'`);
        }
      }
    }

    // ── 2. Verify at least one terminal node ────────────────────────────────
    const terminalSteps = steps.filter((s) => s.transitions.length === 0);
    if (terminalSteps.length === 0) {
      errors.push('Workflow has no terminal step (a step with empty transitions array)');
    }

    // ── 3. Verify start node (first step has no predecessors) ───────────────
    const startStep = steps[0];
    const allToIds = new Set<string>();
    for (const step of steps) {
      for (const t of step.transitions) allToIds.add(t.toStepId);
    }
    if (allToIds.has(startStep.id)) {
      errors.push(`Start step [${startStep.id}] is the target of another transition — ambiguous entry point`);
    }

    // ── 4. Reachability check (BFS from start) ───────────────────────────────
    const reachable = new Set<string>();
    const queue: string[] = [startStep.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      const step = steps.find((s) => s.id === id);
      if (step) {
        for (const t of step.transitions) queue.push(t.toStepId);
      }
    }
    for (const step of steps) {
      if (!reachable.has(step.id)) {
        errors.push(`Step [${step.id}] is unreachable from the start node`);
      }
    }

    // ── 5. Cycle detection (DFS) ─────────────────────────────────────────────
    const cycleTolerantTypes = new Set(['EVENT_WAIT', 'TIMER']);
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (id: string, path: string[]): void => {
      if (inStack.has(id)) {
        // Tolerate cycles if the step is EVENT_WAIT or TIMER
        const loopStep = steps.find((s) => s.id === id);
        if (!loopStep || !cycleTolerantTypes.has(loopStep.type)) {
          errors.push(`Circular path detected: ${[...path, id].join(' → ')}`);
        }
        return;
      }
      if (visited.has(id)) return;
      visited.add(id);
      inStack.add(id);
      const step = steps.find((s) => s.id === id);
      if (step) {
        for (const t of step.transitions) dfs(t.toStepId, [...path, id]);
      }
      inStack.delete(id);
    };

    dfs(startStep.id, []);

    // ── 6. Validate decision expressions ────────────────────────────────────
    for (const step of steps) {
      for (const t of step.transitions) {
        if (t.condition !== undefined && t.condition.trim() === '') {
          errors.push(`Step [${step.id}]: transition condition is empty string — use undefined for unconditional transitions`);
        }
      }
    }

    // ── 7. Validate compensation targets ────────────────────────────────────
    for (const step of steps) {
      if (step.compensationWorkflowCode !== undefined && step.compensationWorkflowCode.trim() === '') {
        errors.push(`Step [${step.id}]: compensationWorkflowCode is empty — provide a valid workflow code or omit it`);
      }
    }
    if (schema.compensationWorkflowCode !== undefined && schema.compensationWorkflowCode.trim() === '') {
      errors.push('Schema-level compensationWorkflowCode is empty — provide a valid workflow code or omit it');
    }

    const valid = errors.length === 0;
    if (!valid) {
      this.logger.warn(`[DefinitionValidation] Schema validation failed with ${errors.length} error(s): ${errors.join('; ')}`);
    }

    return { valid, errors };
  }
}
