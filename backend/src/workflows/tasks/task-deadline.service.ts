import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskEscalationService } from './task-escalation.service';

@Injectable()
export class TaskDeadlineService {
  private readonly logger = new Logger(TaskDeadlineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escalationService: TaskEscalationService,
  ) {}

  /**
   * Cron job: sweeps every minute for overdue tasks and pending timer escalations.
   * This is the SLA enforcement engine.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweepOverdueTasks() {
    const now = new Date();

    // 1. Find tasks that are past their due date and not yet flagged
    const overdueTasks = await this.prisma.workflowTask.findMany({
      where: {
        dueDate: { lt: now },
        isOverdue: false,
        status: { in: ['UNASSIGNED', 'ASSIGNED', 'CLAIMED', 'IN_PROGRESS'] },
      },
    });

    for (const task of overdueTasks) {
      this.logger.warn(`Task ${task.taskId} is overdue (due: ${task.dueDate})`);
      await this.escalationService.escalateTask(
        task.id,
        `Task exceeded SLA deadline at ${task.dueDate?.toISOString()}`,
        task.targetRole ?? undefined, // Escalate to same role supervisor
      );
    }

    // 2. Fire pending workflow timers
    const pendingTimers = await this.prisma.workflowTimer.findMany({
      where: {
        status: 'PENDING',
        executeAt: { lte: now },
      },
    });

    for (const timer of pendingTimers) {
      this.logger.log(`Firing timer ${timer.id} (type: ${timer.timerType})`);

      switch (timer.timerType) {
        case 'ESCALATION': {
          const payload = timer.payload as any;
          if (payload?.taskId) {
            await this.escalationService.escalateTask(
              payload.taskId,
              `Timer-based escalation fired at ${now.toISOString()}`,
              payload?.rule?.targetRole,
            );
          }
          break;
        }
        case 'REMINDER':
          this.logger.log(`Reminder timer fired for instance ${timer.workflowInstanceId}`);
          // Future: push notification / in-app alert
          break;
        case 'AUTO_TRANSITION':
          this.logger.log(`Auto-transition timer fired for instance ${timer.workflowInstanceId}`);
          // Future: automatically progress the workflow step
          break;
        case 'DEADLINE':
          this.logger.warn(`Deadline timer breached for instance ${timer.workflowInstanceId}`);
          break;
      }

      // Mark timer as executed
      await this.prisma.workflowTimer.update({
        where: { id: timer.id },
        data: { status: 'EXECUTED' },
      });
    }
  }
}
