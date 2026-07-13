import { Injectable, Logger } from '@nestjs/common';
import { WorkflowStepDef } from '../interfaces/workflow.interface';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  async createTask(tx: Prisma.TransactionClient, instance: any, step: any, stepDef: WorkflowStepDef) {
    if (!stepDef.taskDefinition) throw new Error(`Step ${stepDef.id} is missing taskDefinition`);
    
    const taskId = uuidv4();
    let dueDate: Date | null = null;

    if (stepDef.sla && stepDef.sla.targetDurationMinutes) {
      dueDate = new Date();
      dueDate.setMinutes(dueDate.getMinutes() + stepDef.sla.targetDurationMinutes);
    }

    const task = await tx.workflowTask.create({
      data: {
        taskId,
        workflowInstanceId: instance.id,
        stepDefinitionId: stepDef.id,
        title: stepDef.taskDefinition.title,
        status: 'UNASSIGNED',
        targetRole: stepDef.taskDefinition.targetRole,
        targetDepartment: stepDef.taskDefinition.targetDepartment,
        dueDate
      }
    });

    this.logger.log(`Created human task ${taskId} for step ${stepDef.id} targeting role ${task.targetRole}`);
    
    // If SLA defined, we would theoretically insert a WorkflowTimer here.
    if (stepDef.sla && stepDef.sla.escalationRules) {
      for (const rule of stepDef.sla.escalationRules) {
        const executeAt = new Date();
        executeAt.setMinutes(executeAt.getMinutes() + rule.thresholdMinutes);
        
        await tx.workflowTimer.create({
          data: {
            workflowInstanceId: instance.id,
            timerType: 'ESCALATION',
            executeAt,
            payload: { taskId: task.id, rule } as any
          }
        });
      }
    }

    return task;
  }
}
