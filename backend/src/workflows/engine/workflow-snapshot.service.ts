import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * WorkflowSnapshotService
 *
 * Captures point-in-time snapshots of workflow instance state.
 * Snapshots are created at key lifecycle events to support replay, forensic analysis,
 * and compensation pre-flight verification.
 *
 * Snapshot triggers:
 *   - WAITING_STATE: Instance enters a human-task waiting state
 *   - TERMINAL_STATE: Instance reaches COMPLETED / CANCELLED / FAILED
 *   - PERIODIC: Every N transitions (default: 10)
 *   - PRE_COMPENSATION: Immediately before compensation begins
 *   - MANUAL: On-demand via API or recovery tooling
 */

export type SnapshotReason =
  | 'WAITING_STATE'
  | 'TERMINAL_STATE'
  | 'PERIODIC'
  | 'PRE_COMPENSATION'
  | 'MANUAL';

@Injectable()
export class WorkflowSnapshotService {
  private readonly logger = new Logger(WorkflowSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Captures a comprehensive snapshot of the current workflow instance state.
   */
  async captureSnapshot(instanceId: string, reason: SnapshotReason): Promise<void> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { instanceId },
        include: {
          steps: true,
          tasks: { include: { assignments: true } },
          version: { select: { versionNumber: true } },
          audits: { orderBy: { timestamp: 'desc' }, take: 5 },
        },
      });

      if (!instance) {
        this.logger.warn(`[Snapshot] Instance ${instanceId} not found — skipping snapshot`);
        return;
      }

      const snapshotData = {
        reason,
        capturedAt: new Date().toISOString(),
        instanceId: instance.instanceId,
        status: instance.status,
        currentStepId: instance.currentStepId,
        workflowVersionId: instance.workflowVersionId,
        workflowDefinitionId: instance.workflowDefinitionId,
        contextVariables: instance.contextVariables,
        steps: instance.steps.map((s) => ({
          stepDefinitionId: s.stepDefinitionId,
          status: s.status,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
        })),
        tasks: instance.tasks.map((t) => ({
          taskId: t.taskId,
          stepDefinitionId: t.stepDefinitionId,
          status: t.status,
          targetRole: t.targetRole,
          isOverdue: t.isOverdue,
          assignedToUserId: t.assignments?.[0]?.userId,
        })),
        recentAuditCount: instance.audits.length,
      };

      await this.prisma.workflowAudit.create({
        data: {
          workflowInstanceId: instance.id,
          newState: instance.status,
          triggerEvent: 'SystemSnapshot',
          reason: `Point-in-time snapshot: ${reason}`,
          metadata: snapshotData as any,
        },
      });

      this.logger.log(`[Snapshot] Captured ${reason} snapshot for instance ${instanceId}`);
    } catch (err: any) {
      this.logger.error(`[Snapshot] Failed to capture snapshot for ${instanceId}: ${err.message}`);
    }
  }

  /**
   * Captures a periodic snapshot every N transitions (default: every 10).
   */
  async capturePeriodicSnapshot(instanceId: string, transitionCount: number, every = 10): Promise<void> {
    if (transitionCount > 0 && transitionCount % every === 0) {
      await this.captureSnapshot(instanceId, 'PERIODIC');
    }
  }

  /**
   * Returns all snapshots for a workflow instance ordered by timestamp.
   */
  async getSnapshots(instanceId: string): Promise<any[]> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { instanceId },
      select: { id: true },
    });

    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);

    return this.prisma.workflowAudit.findMany({
      where: { 
        workflowInstanceId: instance.id,
        triggerEvent: 'SystemSnapshot'
      },
      orderBy: { timestamp: 'asc' },
    });
  }
}
