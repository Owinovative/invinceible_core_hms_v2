import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowVersionService } from '../engine/workflow-version.service';
import { WorkflowSchemaJSON } from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowTemplateService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly versionService: WorkflowVersionService,
  ) {}

  async onModuleInit() {
    this.logger.log('Ensuring default workflow templates are seeded...');
    await this.seedOutpatientWorkflow();
    // In the future: seed Inpatient, Emergency, ANC, Lab, Pharmacy...
  }

  private async seedOutpatientWorkflow() {
    const code = 'OUTPATIENT_V1';
    
    // Check if it already exists
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { code }
    });
    
    if (existing) {
      return; // Already seeded
    }

    const schema: WorkflowSchemaJSON = {
      workflow: 'Standard Outpatient Workflow',
      version: 1,
      trigger: 'PatientRegistrationCompleted',
      variables: {
        age: 'patient.age',
        priority: 'triage.priority',
        hasInsurance: 'patient.hasInsurance'
      },
      steps: [
        {
          id: 'triage',
          name: 'Patient Triage',
          type: 'TASK',
          taskDefinition: {
            title: 'Complete Triage',
            targetRole: 'NURSE'
          },
          transitions: [
            { toStepId: 'consultation' }
          ],
          sla: {
            targetDurationMinutes: 15,
            escalationRules: [
              { thresholdMinutes: 30, action: 'NOTIFY', targetRole: 'CHARGE_NURSE' }
            ]
          }
        },
        {
          id: 'consultation',
          name: 'Doctor Consultation',
          type: 'TASK',
          taskDefinition: {
            title: 'Medical Consultation',
            targetRole: 'MEDICAL_OFFICER'
          },
          transitions: [
            { toStepId: 'pharmacy', condition: 'hasPrescription == true' },
            { toStepId: 'discharge', condition: 'hasPrescription == false' }
          ]
        },
        {
          id: 'pharmacy',
          name: 'Pharmacy Dispense',
          type: 'TASK',
          taskDefinition: {
            title: 'Dispense Medication',
            targetRole: 'PHARMACIST'
          },
          transitions: [
            { toStepId: 'discharge' }
          ]
        },
        {
          id: 'discharge',
          name: 'Patient Discharge',
          type: 'TASK',
          taskDefinition: {
            title: 'Complete Discharge',
            targetRole: 'RECEPTIONIST'
          },
          transitions: [] // End of workflow
        }
      ]
    };

    await this.versionService.publishVersion(code, schema);
    this.logger.log('Seeded Standard Outpatient Workflow (OUTPATIENT_V1)');
  }
}
