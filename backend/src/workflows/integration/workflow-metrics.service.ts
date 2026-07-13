import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

export interface WorkflowDashboardSnapshot {
  timestamp: Date;
  activeInstances: number;
  completedInstances: number;
  failedInstances: number;
  cancelledInstances: number;
  overdueTasks: number;
  activeEscalations: number;
  avgCompletionTimeMs: number | null;
  slaComplianceRate: number | null; // 0-100%
  byDefinition: {
    code: string;
    active: number;
    completed: number;
    failed: number;
  }[];
}

@Injectable()
export class WorkflowMetricsService {
  private readonly logger = new Logger(WorkflowMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a real-time operational dashboard snapshot for a facility.
   */
  async getDashboard(facilityId: number): Promise<WorkflowDashboardSnapshot> {
    const now = new Date();

    const [
      activeCount,
      completedCount,
      failedCount,
      cancelledCount,
      overdueTaskCount,
      activeEscalationCount,
      definitions,
    ] = await Promise.all([
      this.prisma.workflowInstance.count({ where: { facilityId, status: { in: ['CREATED', 'READY', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'ESCALATED'] } } }),
      this.prisma.workflowInstance.count({ where: { facilityId, status: 'COMPLETED' } }),
      this.prisma.workflowInstance.count({ where: { facilityId, status: 'FAILED' } }),
      this.prisma.workflowInstance.count({ where: { facilityId, status: 'CANCELLED' } }),
      this.prisma.workflowTask.count({ where: { instance: { facilityId }, isOverdue: true, status: { in: ['UNASSIGNED', 'ASSIGNED', 'CLAIMED', 'IN_PROGRESS'] } } }),
      this.prisma.workflowEscalation.count({ where: { status: 'ACTIVE', task: { instance: { facilityId } } } }),
      this.prisma.workflowDefinition.findMany({
        where: { isActive: true },
        include: {
          instances: {
            where: { facilityId },
            select: { status: true },
          },
        },
      }),
    ]);

    // Average completion time
    const completedInstances = await this.prisma.workflowInstance.findMany({
      where: { facilityId, status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
      take: 1000,
    });

    let avgCompletionTimeMs: number | null = null;
    if (completedInstances.length > 0) {
      const total = completedInstances.reduce((sum, i) => {
        return sum + (i.completedAt!.getTime() - i.startedAt!.getTime());
      }, 0);
      avgCompletionTimeMs = Math.round(total / completedInstances.length);
    }

    // SLA compliance (tasks not overdue out of total completed tasks)
    const totalCompletedTasks = await this.prisma.workflowTask.count({ where: { instance: { facilityId }, status: 'COMPLETED' } });
    const overdueCompletedTasks = await this.prisma.workflowTask.count({ where: { instance: { facilityId }, status: 'COMPLETED', isOverdue: true } });
    const slaComplianceRate = totalCompletedTasks > 0
      ? Math.round(((totalCompletedTasks - overdueCompletedTasks) / totalCompletedTasks) * 100)
      : null;

    // Per-definition breakdown
    const byDefinition = definitions.map((def) => ({
      code: def.code,
      active: def.instances.filter((i) => ['CREATED', 'READY', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'ESCALATED'].includes(i.status)).length,
      completed: def.instances.filter((i) => i.status === 'COMPLETED').length,
      failed: def.instances.filter((i) => i.status === 'FAILED').length,
    }));

    // Take a snapshot
    await this.prisma.workflowSnapshot.create({
      data: {
        timestamp: now,
        activeInstances: activeCount,
        completedInstances: completedCount,
        failedInstances: failedCount,
        overdueTasks: overdueTaskCount,
        data: {
          cancelledInstances: cancelledCount,
          activeEscalations: activeEscalationCount,
          avgCompletionTimeMs,
          slaComplianceRate,
        },
      },
    });

    return {
      timestamp: now,
      activeInstances: activeCount,
      completedInstances: completedCount,
      failedInstances: failedCount,
      cancelledInstances: cancelledCount,
      overdueTasks: overdueTaskCount,
      activeEscalations: activeEscalationCount,
      avgCompletionTimeMs,
      slaComplianceRate,
      byDefinition,
    };
  }

  /**
   * Returns historical snapshots for a time range.
   */
  async getHistoricalSnapshots(from: Date, to: Date): Promise<any[]> {
    return this.prisma.workflowSnapshot.findMany({
      where: { timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Returns comprehensive KPI metrics for a facility.
   */
  async getKPIs(facilityId: number): Promise<Record<string, any>> {
    // ── Basic counts ──────────────────────────────────────────────────────────
    const [totalCount, completedCount, failedCount, cancelledCount] = await Promise.all([
      this.prisma.workflowInstance.count({ where: { facilityId } }),
      this.prisma.workflowInstance.count({ where: { facilityId, status: 'COMPLETED' } }),
      this.prisma.workflowInstance.count({ where: { facilityId, status: 'FAILED' } }),
      this.prisma.workflowInstance.count({ where: { facilityId, status: 'CANCELLED' } }),
    ]);

    // ── Workflow success rate ─────────────────────────────────────────────────
    const workflowSuccessRate = totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : null;

    // ── Average + Median workflow duration ────────────────────────────────────
    const completedWithTimes = await this.prisma.workflowInstance.findMany({
      where: { facilityId, status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
      take: 2000,
    });

    let averageWorkflowDurationMin: number | null = null;
    let medianCompletionTimeMin: number | null = null;
    if (completedWithTimes.length > 0) {
      const durations = completedWithTimes
        .map((i) => (i.completedAt!.getTime() - i.startedAt!.getTime()) / 60000)
        .sort((a, b) => a - b);
      averageWorkflowDurationMin = Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10;
      const mid = Math.floor(durations.length / 2);
      medianCompletionTimeMin = durations.length % 2 === 0
        ? Math.round(((durations[mid - 1] + durations[mid]) / 2) * 10) / 10
        : Math.round(durations[mid] * 10) / 10;
    }

    // ── SLA breach percentage ─────────────────────────────────────────────────
    const [totalTasks, overdueTasks] = await Promise.all([
      this.prisma.workflowTask.count({ where: { instance: { facilityId } } }),
      this.prisma.workflowTask.count({ where: { instance: { facilityId }, isOverdue: true } }),
    ]);
    const slaBreachPercentage = totalTasks > 0
      ? Math.round((overdueTasks / totalTasks) * 100)
      : 0;

    // ── Abandoned workflows ───────────────────────────────────────────────────
    const abandonedWorkflowCount = cancelledCount;

    // ── Bottleneck step (step with the most overdue tasks) ───────────────────
    const stepOverdueCounts = await this.prisma.workflowTask.groupBy({
      by: ['stepDefinitionId'],
      where: { instance: { facilityId }, isOverdue: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });
    const bottleneckStep = stepOverdueCounts[0]?.stepDefinitionId ?? null;

    // ── Compensation rate ─────────────────────────────────────────────────────
    // Instances that were IN_PROGRESS but ended as CANCELLED
    const compensationAuditCount = await this.prisma.workflowAudit.count({
      where: {
        instance: { facilityId },
        triggerEvent: { contains: 'Compensation' },
      },
    });
    const compensationRate = totalCount > 0
      ? Math.round((compensationAuditCount / totalCount) * 100)
      : 0;

    // ── Workflow restart count ────────────────────────────────────────────────
    // Approximate: audit entries that transition from FAILED → IN_PROGRESS
    const workflowRestartCount = await this.prisma.workflowAudit.count({
      where: {
        instance: { facilityId },
        oldState: 'FAILED',
        newState: 'IN_PROGRESS',
      },
    });

    return {
      facilityId,
      generatedAt: new Date(),
      totalWorkflows: totalCount,
      completedWorkflows: completedCount,
      failedWorkflows: failedCount,
      cancelledWorkflows: cancelledCount,
      workflowSuccessRate,
      averageWorkflowDurationMin,
      medianCompletionTimeMin,
      slaBreachPercentage,
      abandonedWorkflowCount,
      bottleneckStep,
      compensationRate,
      workflowRestartCount,
    };
  }
}

