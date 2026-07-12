export type WorkflowStatus = 
  | 'CREATED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ESCALATED';

export type WorkflowStepStatus = 
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED';

export type TaskStatus = 
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'CLAIMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface WorkflowVariableMapping {
  [variableName: string]: string; // e.g. { age: "patient.age", priority: "triage.priority" }
}

export interface WorkflowTransitionDef {
  toStepId: string;
  condition?: string; // Evaluated by Decision Engine (e.g., "age < 5")
}

export interface WorkflowSLADef {
  targetDurationMinutes: number;
  escalationRules?: WorkflowEscalationRuleDef[];
}

export interface WorkflowEscalationRuleDef {
  thresholdMinutes: number;
  action: 'NOTIFY' | 'REASSIGN' | 'ESCALATE';
  targetRole?: string;
}

export interface WorkflowCompensationDef {
  actionId: string;
  payloadTemplate: Record<string, any>;
}

export interface WorkflowStepDef {
  id: string;
  name: string;
  type: 'TASK' | 'EVENT_WAIT' | 'PARALLEL' | 'DECISION' | 'TIMER';
  
  // Join condition for parallel incoming transitions
  joinType?: 'ALL' | 'ANY';

  // Compensation
  compensationWorkflowCode?: string;

  // Task integration
  taskDefinition?: {
    title: string;
    targetRole?: string;
    targetDepartment?: string;
  };
  
  // For EVENT_WAIT
  waitForEvent?: string; // e.g. "LaboratoryResultVerified"
  
  // For PARALLEL
  branches?: WorkflowStepDef[][];
  
  transitions: WorkflowTransitionDef[];
  
  sla?: WorkflowSLADef;
  compensation?: WorkflowCompensationDef;
}

export interface WorkflowSchemaJSON {
  workflow: string;
  version: number;
  trigger: string;
  variables: WorkflowVariableMapping;
  steps: WorkflowStepDef[];
  sla?: WorkflowSLADef;
  escalations?: WorkflowEscalationRuleDef[];
  compensationWorkflowCode?: string; // Workflow-level compensation
}
