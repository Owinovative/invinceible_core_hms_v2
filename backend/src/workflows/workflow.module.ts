import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

// Engine
import { WorkflowEngineService } from './engine/workflow-engine.service';
import { WorkflowStateMachine } from './engine/workflow-state-machine';
import { WorkflowPolicyEngine } from './engine/workflow-policy.engine';
import { WorkflowRouterService } from './engine/workflow-router.service';
import { WorkflowRecoveryService } from './engine/workflow-recovery.service';
import { WorkflowVersionService } from './engine/workflow-version.service';
import { WorkflowSnapshotService } from './engine/workflow-snapshot.service';
import { WorkflowCompensationService } from './engine/workflow-compensation.service';

// Definitions
import { WorkflowDefinitionService } from './definitions/workflow-definition.service';
import { WorkflowTemplateService } from './definitions/workflow-template.service';

// Execution
import { WorkflowExecutorService } from './execution/workflow-executor.service';
import { WorkflowStepRunnerService } from './execution/workflow-step-runner.service';
import { WorkflowDecisionEngine } from './execution/workflow-decision.engine';
import { WorkflowAssignmentService } from './execution/workflow-assignment.service';

// Tasks
import { TaskService } from './tasks/task.service';
import { TaskEscalationService } from './tasks/task-escalation.service';
import { TaskDeadlineService } from './tasks/task-deadline.service';

// Integration
import { WorkflowAuditService } from './integration/workflow-audit.service';
import { WorkflowSimulationService } from './integration/workflow-simulation.service';
import { WorkflowMetricsService } from './integration/workflow-metrics.service';
import { WorkflowEventSubscriber } from './integration/workflow-event-subscriber';
import { WorkflowEventPublisher } from './integration/workflow-event-publisher';
import { WorkflowController } from './integration/workflow.controller';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    // Engine
    WorkflowEngineService,
    WorkflowStateMachine,
    WorkflowPolicyEngine,
    WorkflowRouterService,
    WorkflowRecoveryService,
    WorkflowVersionService,
    WorkflowSnapshotService,
    WorkflowCompensationService,

    // Definitions
    WorkflowDefinitionService,
    WorkflowTemplateService,

    // Execution
    WorkflowExecutorService,
    WorkflowStepRunnerService,
    WorkflowDecisionEngine,
    WorkflowAssignmentService,

    // Tasks
    TaskService,
    TaskEscalationService,
    TaskDeadlineService,

    // Integration
    WorkflowAuditService,
    WorkflowSimulationService,
    WorkflowMetricsService,
    WorkflowEventSubscriber,
    WorkflowEventPublisher,
  ],
  controllers: [WorkflowController],
  exports: [
    WorkflowEngineService,
    WorkflowSimulationService,
    WorkflowEventPublisher,
  ],
})
export class WorkflowModule {}
