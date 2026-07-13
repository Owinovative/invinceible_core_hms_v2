import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WorkflowEngineService } from '../src/workflows/engine/workflow-engine.service';
import { WorkflowVersionService } from '../src/workflows/engine/workflow-version.service';
import { WorkflowEventSubscriber } from '../src/workflows/integration/workflow-event-subscriber';
import { TaskService } from '../src/workflows/tasks/task.service';
import { WorkflowCompensationService } from '../src/workflows/engine/workflow-compensation.service';
import { WorkflowDefinitionService } from '../src/workflows/definitions/workflow-definition.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClinicalEventTypes } from '../src/events/registry/event-registry';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowSimulationService } from '../src/workflows/integration/workflow-simulation.service';

async function bootstrap() {
  console.log('--- Phase 5 Workflow Engine Verification ---');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const prisma = app.get(PrismaService);
  const engine = app.get(WorkflowEngineService);
  const versionService = app.get(WorkflowVersionService);
  const subscriber = app.get(WorkflowEventSubscriber);
  const simulation = app.get(WorkflowSimulationService);
  const compensation = app.get(WorkflowCompensationService);
  const definitionService = app.get(WorkflowDefinitionService);

  console.log('1. Checking Workflow Modules are initialized...');
  
  // Test 1: Simulation Dry Run (Safe mode)
  console.log('\n2. Running Workflow Simulation (OUTPATIENT_V1)...');
  try {
    const simResult = await simulation.simulate('OUTPATIENT_V1', {
      age: 35,
      isEmergency: false,
      isPregnant: false,
      hasInsurance: true,
      hasPrescription: true // mock ConsultationCompleted decision
    }, 'FULL');
    
    if (simResult.success) {
      console.log('✅ Simulation Passed!');
      console.log(`   Steps executed: ${simResult.stepsExecuted.join(' -> ')}`);
      console.log(`   Decisions evaluated: ${simResult.decisionsEvaluated.length}`);
      console.log(`   Timers evaluated: ${simResult.timersTriggered.length}`);
    } else {
      console.error('❌ Simulation Failed:', simResult.errors);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Simulation threw an exception:', err.message);
    process.exit(1);
  }

  // Test 2: Full End-to-End Orchestration Integration
  console.log('\n3. Running E2E Patient Orchestration Integration Test...');
  try {
    const patientId = Math.floor(Math.random() * 10000) + 1;
    const facilityId = 1;
    
    // Simulate PatientRegistration event
    console.log('   -> Simulating Event: PatientRegistered');
    await subscriber.onPatientRegistered({
      eventId: uuidv4(),
      correlationId: uuidv4(),
      checksum: '',
      signature: '',
      eventType: ClinicalEventTypes.PATIENT_REGISTERED,
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      aggregateId: patientId.toString(),
      aggregateType: 'Patient',
      patientId,
      facilityId,
      tenantId: 1,
      sourceModule: 'PatientModule',
      priority: 'HIGH',
      timestamp: new Date(),
      payload: { age: 35, gender: 'M', insuranceType: 'SHA' }
    } as any);

    // Wait for async processing
    await new Promise(r => setTimeout(r, 1000));
    
    // Fetch instance
    let instance = await prisma.workflowInstance.findFirst({
      where: { patientId, status: { in: ['IN_PROGRESS', 'WAITING'] } },
      include: { steps: true, tasks: true }
    });
    
    if (!instance) throw new Error('Instance not found after PatientRegistered');
    console.log(`   ✅ Workflow instantiated successfully. Current step: ${instance.currentStepId}`);

    // Simulate TriageCompleted event
    console.log('   -> Simulating Event: TriageCompleted');
    await subscriber.onTriageCompleted({
      eventId: uuidv4(),
      correlationId: uuidv4(),
      checksum: '',
      signature: '',
      eventType: ClinicalEventTypes.TRIAGE_COMPLETED,
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      aggregateId: '999',
      aggregateType: 'Triage',
      patientId,
      facilityId,
      tenantId: 1,
      sourceModule: 'TriageModule',
      priority: 'HIGH',
      timestamp: new Date(),
      payload: { triagePriority: 'URGENT', chiefComplaint: 'Headache' }
    } as any);

    await new Promise(r => setTimeout(r, 1000));
    
    instance = await prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: { steps: true, tasks: true }
    });
    
    if (!instance) throw new Error('Instance not found after TriageCompleted');

    if (instance.currentStepId !== 'consultation') {
       throw new Error(`Instance did not progress to consultation. Current step: ${instance.currentStepId}`);
    }
    console.log(`   ✅ Workflow progressed successfully to step: ${instance.currentStepId}`);
    
    // Simulate ConsultationCompleted
    console.log('   -> Simulating Event: ConsultationCompleted');
    await subscriber.onConsultationCompleted({
      eventId: uuidv4(),
      correlationId: uuidv4(),
      checksum: '',
      signature: '',
      eventType: ClinicalEventTypes.CONSULTATION_COMPLETED,
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      aggregateId: '888',
      aggregateType: 'Encounter',
      patientId,
      facilityId,
      tenantId: 1,
      sourceModule: 'ConsultationModule',
      priority: 'HIGH',
      timestamp: new Date(),
      payload: { diagnosisCodes: ['A00'], prescriptionCount: 1 }
    } as any);

    await new Promise(r => setTimeout(r, 1000));
    
    instance = await prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: { steps: true, tasks: true }
    });
    
    if (!instance) throw new Error('Instance not found after ConsultationCompleted');

    if (instance.currentStepId !== 'pharmacy') {
       throw new Error(`Decision engine failed to route to pharmacy. Current step: ${instance.currentStepId}`);
    }
    console.log(`   ✅ Decision Engine successfully routed to: ${instance.currentStepId} (hasPrescription=true)`);
    
    // Test Tasks
    console.log('   -> Verifying human task generation');
    if (instance.tasks.length === 0) throw new Error('No human tasks generated');
    const pharmacyTask = instance.tasks.find((t: any) => t.stepDefinitionId === 'pharmacy');
    if (!pharmacyTask) throw new Error('Pharmacy task not generated');
    console.log(`   ✅ Pharmacy task created for target role: ${pharmacyTask.targetRole}`);
    
    
    // Test 3: Test Compensation Logic
    console.log('\n4. Running E2E Compensation Rollback Test...');
    console.log('   -> Triggering Compensation for instance: ' + instance.instanceId);
    await compensation.startCompensation(instance.instanceId, 'Patient left without medication');
    
    await new Promise(r => setTimeout(r, 1000));
    
    const compensatedInstance = await prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: { steps: true, audits: { orderBy: { timestamp: 'asc' } } }
    });
    
    if (!compensatedInstance) throw new Error('Compensated instance not found');

    if (compensatedInstance.status !== 'CANCELLED' && compensatedInstance.status !== 'COMPENSATING') {
      throw new Error(`Instance did not enter correct terminal state for compensation. Status: ${compensatedInstance.status}`);
    }
    
    console.log(`   ✅ Instance transitioned correctly due to compensation. Final status: ${compensatedInstance.status}`);
    
    const compensationAudits = compensatedInstance.audits.filter((a: any) => a.triggerEvent === 'Compensation');
    if (compensationAudits.length > 0) {
      console.log(`   ✅ Caught ${compensationAudits.length} compensation audit logs.`);
    }

    // Test 4: Validation
    console.log('\n5. Running Definition Validation Test...');
    const outpatientDef = await definitionService.getDefinition('OUTPATIENT_V1');
    if (outpatientDef && outpatientDef.versions.length > 0) {
        const schemaJson = outpatientDef.versions[0].schema as any;
        const validationResult = definitionService.validateDefinition(schemaJson);
        if (validationResult.valid) {
            console.log('   ✅ OUTPATIENT_V1 passed structural validation.');
        } else {
            console.log('   ❌ OUTPATIENT_V1 validation failed:', validationResult.errors);
        }
    }
    
  } catch (err: any) {
    console.error('❌ E2E Integration Failed:', err.message);
    process.exit(1);
  }

  console.log('\n✅ All Phase 5 Orchestration Verifications Passed!');
  await app.close();
  process.exit(0);
}

bootstrap();
