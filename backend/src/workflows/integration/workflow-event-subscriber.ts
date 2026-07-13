import { Injectable, Logger } from '@nestjs/common';
import { SubscribeClinicalEvent } from '../../events/subscribers/subscribe.decorator';
import { ClinicalEventTypes } from '../../events/registry/event-registry';
import type { BaseClinicalEvent } from '../../events/interfaces/base-clinical-event.interface';
import { WorkflowEngineService } from '../engine/workflow-engine.service';
import { WorkflowExecutorService } from '../execution/workflow-executor.service';
import { WorkflowVersionService } from '../engine/workflow-version.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * WorkflowEventSubscriber
 *
 * The ONLY entry point through which the Workflow Engine reacts to Clinical Events.
 * Subscribes to domain events from the Phase 4 Event Bus and orchestrates workflow
 * instantiation and progression in response.
 *
 * Architecture:
 *   ClinicalEvent → EventDispatcher → WorkflowEventSubscriber → WorkflowEngine
 *
 * No clinical module communicates directly with the Workflow Engine.
 * All coupling is strictly through the Event Bus.
 */
@Injectable()
export class WorkflowEventSubscriber {
  private readonly logger = new Logger(WorkflowEventSubscriber.name);

  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly workflowExecutor: WorkflowExecutorService,
    private readonly workflowVersionService: WorkflowVersionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * PatientRegistered → Instantiate Standard Outpatient Workflow (default template).
   * The router determines the correct template based on patient context variables.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.PATIENT_REGISTERED, { isolationLevel: 'NORMAL' })
  async onPatientRegistered(event: BaseClinicalEvent): Promise<void> {
    this.logger.log(
      `[Workflow] PatientRegistered received — patient: ${event.patientId}, facility: ${event.facilityId}`,
    );

    try {
      const payload = event.payload as any;

      const instance = await this.workflowEngine.instantiateWorkflow('OUTPATIENT_V1', {
        patientId: event.patientId,
        encounterId: event.encounterId ?? undefined,
        facilityId: event.facilityId,
        tenantId: event.tenantId,
        contextVariables: {
          age: payload?.age ?? null,
          gender: payload?.gender ?? null,
          hasInsurance: !!payload?.insuranceType,
          priority: 'NORMAL',
        },
        correlationId: event.correlationId,
      });

      this.logger.log(`[Workflow] Outpatient workflow instantiated: ${instance.instanceId}`);

      // Load schema to begin execution
      const { version } = await this.workflowVersionService.getLatestVersion('OUTPATIENT_V1');
      await this.workflowExecutor.startExecution(instance.instanceId, version.schema as any);
    } catch (err: any) {
      this.logger.error(`[Workflow] Failed to instantiate workflow on PatientRegistered: ${err.message}`);
    }
  }

  /**
   * TriageCompleted → Advance the workflow instance from triage step → consultation step.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.TRIAGE_COMPLETED, { isolationLevel: 'NORMAL' })
  async onTriageCompleted(event: BaseClinicalEvent): Promise<void> {
    this.logger.log(
      `[Workflow] TriageCompleted received — patient: ${event.patientId}`,
    );

    try {
      const payload = event.payload as any;

      // Find the active workflow instance for this patient
      const instance = await this.prisma.workflowInstance.findFirst({
        where: {
          patientId: event.patientId,
          status: { in: ['IN_PROGRESS', 'WAITING', 'CREATED', 'READY'] },
        },
        include: { version: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!instance) {
        this.logger.warn(`[Workflow] No active workflow instance found for patient ${event.patientId} on TriageCompleted`);
        return;
      }

      // Update context variables with triage data
      const updatedVars = {
        ...(instance.contextVariables as object),
        priority: payload?.triagePriority ?? 'NORMAL',
        chiefComplaint: payload?.chiefComplaint ?? null,
      };

      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { contextVariables: updatedVars },
      });

      // Progress from 'triage' step
      await this.workflowExecutor.progressExecution(
        instance.instanceId,
        'triage',
        instance.version.schema as any,
      );
    } catch (err: any) {
      this.logger.error(`[Workflow] Failed to progress workflow on TriageCompleted: ${err.message}`);
    }
  }

  /**
   * ConsultationCompleted → Advance the workflow instance from consultation step.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.CONSULTATION_COMPLETED, { isolationLevel: 'NORMAL' })
  async onConsultationCompleted(event: BaseClinicalEvent): Promise<void> {
    this.logger.log(
      `[Workflow] ConsultationCompleted received — patient: ${event.patientId}, encounter: ${event.encounterId}`,
    );

    try {
      const payload = event.payload as any;

      const instance = await this.prisma.workflowInstance.findFirst({
        where: {
          patientId: event.patientId,
          status: { in: ['IN_PROGRESS', 'WAITING'] },
        },
        include: { version: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!instance) {
        this.logger.warn(`[Workflow] No active workflow instance for patient ${event.patientId} on ConsultationCompleted`);
        return;
      }

      // Inject consultation outcome into context
      const updatedVars = {
        ...(instance.contextVariables as object),
        hasPrescription: !!(payload?.diagnosisCodes?.length || payload?.prescriptionCount > 0),
        diagnosisCodes: payload?.diagnosisCodes ?? [],
      };

      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { contextVariables: updatedVars },
      });

      await this.workflowExecutor.progressExecution(
        instance.instanceId,
        'consultation',
        instance.version.schema as any,
      );
    } catch (err: any) {
      this.logger.error(`[Workflow] Failed to progress workflow on ConsultationCompleted: ${err.message}`);
    }
  }

  /**
   * DischargeCompleted → Complete and archive the patient workflow instance.
   */
  @SubscribeClinicalEvent(ClinicalEventTypes.DISCHARGE_COMPLETED, { isolationLevel: 'NORMAL' })
  async onDischargeCompleted(event: BaseClinicalEvent): Promise<void> {
    this.logger.log(
      `[Workflow] DischargeCompleted received — patient: ${event.patientId}`,
    );

    try {
      const instance = await this.prisma.workflowInstance.findFirst({
        where: {
          patientId: event.patientId,
          status: { in: ['IN_PROGRESS', 'WAITING', 'COMPLETED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!instance) return;

      if (instance.status !== 'COMPLETED') {
        await this.workflowEngine.transitionInstance(
          instance.instanceId,
          'COMPLETED',
          'DischargeCompleted',
          event.correlationId,
        );
      }

      this.logger.log(`[Workflow] Instance ${instance.instanceId} archived upon discharge.`);
    } catch (err: any) {
      this.logger.error(`[Workflow] Failed to complete workflow on DischargeCompleted: ${err.message}`);
    }
  }
}
