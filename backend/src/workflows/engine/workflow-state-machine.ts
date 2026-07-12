import { Injectable, Logger } from '@nestjs/common';
import { WorkflowStatus, WorkflowStepStatus, TaskStatus } from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowStateMachine {
  private readonly logger = new Logger(WorkflowStateMachine.name);

  // Define valid transitions for a Workflow Instance
  private readonly instanceTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
    CREATED: ['READY', 'CANCELLED', 'FAILED'],
    READY: ['IN_PROGRESS', 'CANCELLED', 'FAILED'],
    IN_PROGRESS: ['WAITING', 'BLOCKED', 'COMPLETED', 'FAILED', 'CANCELLED'],
    WAITING: ['IN_PROGRESS', 'FAILED', 'CANCELLED'],
    BLOCKED: ['IN_PROGRESS', 'FAILED', 'CANCELLED', 'ESCALATED'],
    ESCALATED: ['IN_PROGRESS', 'FAILED', 'CANCELLED'],
    COMPLETED: [],
    FAILED: [],
    CANCELLED: []
  };

  // Define valid transitions for a Workflow Step
  private readonly stepTransitions: Record<WorkflowStepStatus, WorkflowStepStatus[]> = {
    PENDING: ['ACTIVE', 'SKIPPED', 'FAILED'],
    ACTIVE: ['COMPLETED', 'FAILED'],
    COMPLETED: [],
    SKIPPED: [],
    FAILED: []
  };

  // Define valid transitions for a Human Task
  private readonly taskTransitions: Record<TaskStatus, TaskStatus[]> = {
    UNASSIGNED: ['ASSIGNED', 'CANCELLED', 'EXPIRED'],
    ASSIGNED: ['CLAIMED', 'CANCELLED', 'EXPIRED', 'UNASSIGNED'], // Unassigned via reassignment
    CLAIMED: ['IN_PROGRESS', 'ASSIGNED', 'CANCELLED', 'EXPIRED'], // Back to ASSIGNED if returned
    IN_PROGRESS: ['COMPLETED', 'ASSIGNED', 'CANCELLED', 'EXPIRED'],
    COMPLETED: [],
    CANCELLED: [],
    EXPIRED: []
  };

  canTransitionInstance(from: WorkflowStatus, to: WorkflowStatus): boolean {
    const validStates = this.instanceTransitions[from];
    return validStates ? validStates.includes(to) : false;
  }

  canTransitionStep(from: WorkflowStepStatus, to: WorkflowStepStatus): boolean {
    const validStates = this.stepTransitions[from];
    return validStates ? validStates.includes(to) : false;
  }

  canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
    const validStates = this.taskTransitions[from];
    return validStates ? validStates.includes(to) : false;
  }

  assertInstanceTransition(from: WorkflowStatus, to: WorkflowStatus): void {
    if (!this.canTransitionInstance(from, to)) {
      throw new Error(`Invalid workflow instance transition from ${from} to ${to}`);
    }
  }

  assertStepTransition(from: WorkflowStepStatus, to: WorkflowStepStatus): void {
    if (!this.canTransitionStep(from, to)) {
      throw new Error(`Invalid workflow step transition from ${from} to ${to}`);
    }
  }

  assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
    if (!this.canTransitionTask(from, to)) {
      throw new Error(`Invalid task transition from ${from} to ${to}`);
    }
  }
}
