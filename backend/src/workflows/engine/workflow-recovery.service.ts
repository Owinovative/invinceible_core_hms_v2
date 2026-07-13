import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class WorkflowRecoveryService {
  private readonly logger = new Logger(WorkflowRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * Periodic recovery sweep: detects stalled or stuck workflow instances.
   * Runs every 5 minutes.
   * A workflow is "stalled" if it has been IN_PROGRESS or WAITING for more than 2 hours
   * without any audit activity.
   */
  @Cron('0 */5 * * * *') // Every 5 minutes
  async recoverStalledInstances(): Promise<void> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const stalledInstances = await this.prisma.workflowInstance.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'WAITING'] },
        updatedAt: { lt: twoHoursAgo },
      },
      take: 50, // Process in batches
    });

    if (stalledInstances.length === 0) return;

    this.logger.warn(`[Recovery] Found ${stalledInstances.length} stalled workflow instance(s). Attempting recovery...`);

    for (const instance of stalledInstances) {
      try {
        // Transition to BLOCKED status so it can be reviewed and manually progressed
        await this.workflowEngine.transitionInstance(
          instance.instanceId,
          'BLOCKED',
          'AutoRecovery',
          undefined,
        );
        this.logger.warn(`[Recovery] Instance ${instance.instanceId} transitioned to BLOCKED after stall detection.`);
      } catch (err: any) {
        this.logger.error(`[Recovery] Failed to recover instance ${instance.instanceId}: ${err.message}`);
      }
    }
  }

  /**
   * Returns all currently BLOCKED instances for admin review.
   */
  async getBlockedInstances(facilityId?: number): Promise<any[]> {
    return this.prisma.workflowInstance.findMany({
      where: {
        status: 'BLOCKED',
        ...(facilityId ? { facilityId } : {}),
      },
      include: {
        definition: { select: { code: true, name: true } },
        tasks: { where: { status: { in: ['UNASSIGNED', 'ASSIGNED', 'CLAIMED'] } } },
      },
      orderBy: { updatedAt: 'asc' },
    });
  }
}
