import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskEscalationService {
  private readonly logger = new Logger(TaskEscalationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an escalation record for a task that has breached its SLA.
   */
  async escalateTask(
    taskId: number,
    reason: string,
    escalateToRole?: string,
    escalateToUserId?: number,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.workflowTask.findUnique({ where: { id: taskId } });
      if (!task) throw new Error(`Task with id ${taskId} not found`);

      // Mark task as overdue
      await tx.workflowTask.update({
        where: { id: taskId },
        data: { isOverdue: true },
      });

      // Create escalation record
      const escalation = await tx.workflowEscalation.create({
        data: {
          workflowTaskId: taskId,
          reason,
          escalatedToRole: escalateToRole,
          escalatedToUserId: escalateToUserId,
          status: 'ACTIVE',
        },
      });

      // Audit
      await tx.workflowAudit.create({
        data: {
          workflowInstanceId: task.workflowInstanceId,
          oldState: task.status,
          newState: 'ESCALATED',
          triggerEvent: 'TaskEscalated',
          reason,
        },
      });

      this.logger.warn(`Task ${task.taskId} escalated: ${reason}`);
      return escalation;
    });
  }

  /**
   * Resolves an active escalation.
   */
  async resolveEscalation(
    escalationId: number,
    facilityId: number,
  ): Promise<any> {
    const escalation = await this.prisma.workflowEscalation.findFirst({
      where: {
        id: escalationId,
        task: { instance: { facilityId } },
      },
      select: { id: true },
    });
    if (!escalation) throw new Error(`Escalation ${escalationId} not found`);

    return this.prisma.workflowEscalation.update({
      where: { id: escalation.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  /**
   * Returns all active escalations for a facility.
   */
  async getActiveEscalations(facilityId: number): Promise<any[]> {
    return this.prisma.workflowEscalation.findMany({
      where: {
        status: 'ACTIVE',
        task: {
          instance: { facilityId },
        },
      },
      include: {
        task: {
          include: {
            instance: { select: { instanceId: true, patientId: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
