import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowStateMachine } from '../engine/workflow-state-machine';
import { TaskStatus } from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowAssignmentService {
  private readonly logger = new Logger(WorkflowAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: WorkflowStateMachine,
  ) {}

  /**
   * Assigns a task to a specific user by userId.
   * Validates state transition from UNASSIGNED → ASSIGNED.
   */
  async assignTask(taskId: string, userId: number): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.workflowTask.findUnique({ where: { taskId } });
      if (!task) throw new Error(`Task ${taskId} not found`);

      this.stateMachine.assertTaskTransition(task.status as TaskStatus, 'ASSIGNED');

      const updated = await tx.workflowTask.update({
        where: { id: task.id },
        data: { status: 'ASSIGNED' },
      });

      await tx.workflowAssignment.create({
        data: {
          workflowTaskId: task.id,
          userId,
          status: 'ACTIVE',
        },
      });

      await tx.workflowAudit.create({
        data: {
          workflowInstanceId: task.workflowInstanceId,
          oldState: task.status,
          newState: 'ASSIGNED',
          triggerEvent: 'TaskAssigned',
          actor: userId.toString(),
          reason: `Task assigned to user ${userId}`,
        },
      });

      this.logger.log(`Task ${taskId} assigned to user ${userId}`);
      return updated;
    });
  }

  /**
   * User claims a task that was assigned to them (or to their role).
   * ASSIGNED → CLAIMED
   */
  async claimTask(taskId: string, userId: number): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.workflowTask.findUnique({ where: { taskId } });
      if (!task) throw new Error(`Task ${taskId} not found`);

      this.stateMachine.assertTaskTransition(task.status as TaskStatus, 'CLAIMED');

      const updated = await tx.workflowTask.update({
        where: { id: task.id },
        data: { status: 'CLAIMED' },
      });

      await tx.workflowAudit.create({
        data: {
          workflowInstanceId: task.workflowInstanceId,
          oldState: task.status,
          newState: 'CLAIMED',
          triggerEvent: 'TaskClaimed',
          actor: userId.toString(),
          reason: `Task claimed by user ${userId}`,
        },
      });

      this.logger.log(`Task ${taskId} claimed by user ${userId}`);
      return updated;
    });
  }

  /**
   * Completes a task.
   * IN_PROGRESS → COMPLETED (or CLAIMED → COMPLETED shortcut not allowed; must go through IN_PROGRESS)
   */
  async completeTask(taskId: string, userId: number): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.workflowTask.findUnique({ where: { taskId } });
      if (!task) throw new Error(`Task ${taskId} not found`);

      this.stateMachine.assertTaskTransition(task.status as TaskStatus, 'COMPLETED');

      const updated = await tx.workflowTask.update({
        where: { id: task.id },
        data: { status: 'COMPLETED' },
      });

      // Mark assignment as completed
      await tx.workflowAssignment.updateMany({
        where: { workflowTaskId: task.id, status: 'ACTIVE' },
        data: { status: 'COMPLETED' },
      });

      await tx.workflowAudit.create({
        data: {
          workflowInstanceId: task.workflowInstanceId,
          oldState: task.status,
          newState: 'COMPLETED',
          triggerEvent: 'TaskCompleted',
          actor: userId.toString(),
          reason: `Task completed by user ${userId}`,
        },
      });

      this.logger.log(`Task ${taskId} completed by user ${userId}`);
      return updated;
    });
  }

  /**
   * Retrieves tasks assigned to a specific role within a facility.
   */
  async getTasksByRole(role: string, facilityId: number): Promise<any[]> {
    return this.prisma.workflowTask.findMany({
      where: {
        targetRole: role,
        status: { in: ['UNASSIGNED', 'ASSIGNED'] },
        instance: { facilityId },
      },
      include: {
        instance: {
          select: { instanceId: true, patientId: true, encounterId: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Retrieves tasks assigned to a specific user.
   */
  async getTasksByUser(userId: number): Promise<any[]> {
    return this.prisma.workflowTask.findMany({
      where: {
        assignments: { some: { userId, status: 'ACTIVE' } },
        status: { in: ['ASSIGNED', 'CLAIMED', 'IN_PROGRESS'] },
      },
      include: {
        instance: {
          select: { instanceId: true, patientId: true, encounterId: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
