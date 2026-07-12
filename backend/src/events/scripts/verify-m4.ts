import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EventReplayService } from '../replay/event-replay.service';
import { EventTimelineService } from '../timeline/event-timeline.service';
import { EventMetricsService } from '../observability/event-metrics.service';
import { EventPublisher } from '../event-publisher';
import { PrismaService } from '../../prisma/prisma.service';

async function bootstrap() {
  console.log('Starting M4 Verification Script...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const replay = app.get(EventReplayService);
  const timeline = app.get(EventTimelineService);
  const metrics = app.get(EventMetricsService);
  const publisher = app.get(EventPublisher);
  const prisma = app.get(PrismaService);

  // 1. Transactional Outbox Verification (Simulate Rollback)
  console.log('\n--- 1. Transactional Outbox Rollback Test ---');
  try {
    await prisma.$transaction(async (tx) => {
      console.log('  Executing inside $transaction...');
      // Fake a business operation
      const triage = await tx.triage.create({
        data: {
          patientId: 1, facilityId: 1, branchId: 1, triagePriority: 'NORMAL',
          statusCode: 'READY_FOR_DOCTOR', startedAt: new Date(), triageNumber: 'TRG-TEST-1'
        }
      });
      console.log(`  Created triage record ${triage.id}`);
      
      // Simulate event publish
      const testEvent = publisher.create({
        correlationId: 'test-rollback',
        aggregateId: 'test-agg',
        aggregateType: 'Triage',
        eventType: 'TRIAGE_COMPLETED',
        eventCategory: 'DOMAIN',
        eventVersion: 1,
        patientId: 1,
        encounterId: null,
        facilityId: 1,
        branchId: 1,
        tenantId: 1,
        userId: null,
        sourceModule: 'TriageModule',
        priority: 'HIGH',
        payload: { test: true },
        metadata: {},
        timestamp: new Date()
      });
      // Override eventId so we can check it
      (testEvent as any).eventId = 'rollback-test-id';
      
      await publisher.publish(testEvent, tx);
      console.log('  Created outbox event via Publisher');
      
      throw new Error('SIMULATED_BUSINESS_FAILURE');
    });
  } catch (err: any) {
    console.log(`  Transaction failed as expected: ${err.message}`);
  }

  const outboxCheck = await prisma.clinicalEventOutbox.findUnique({ where: { uuid: 'rollback-test-id' } });
  console.log(`  Outbox event exists after rollback? ${!!outboxCheck} (Expected: false)`);

  // 2. Timeline Projection
  console.log('\n--- 2. Patient Timeline Projection ---');
  const patientTimeline = await timeline.getPatientTimeline(1, { limit: 5 });
  console.log(`  Found ${patientTimeline.length} events for Patient 1.`);
  if (patientTimeline.length > 0) {
    console.log(`  Latest event: ${patientTimeline[0].eventType} at ${patientTimeline[0].timestamp}`);
  }

  // 3. Metrics Generation
  console.log('\n--- 3. Observability Metrics ---');
  const snap = await metrics.getMetricsSnapshot();
  console.log(`  Queue Depth: ${snap.queueDepth}`);
  console.log(`  Active Replay Jobs: ${snap.replay.activeJobs}`);
  console.log(`  DLQ Pending: ${snap.dlq.pendingEvents}`);

  // 4. Simulation Replay
  console.log('\n--- 4. Simulation Replay Mode ---');
  try {
    const replayResult = await replay.replay('SIMULATION', { limit: 10 }, 'Verifier');
    console.log(`  Simulation Job ID: ${replayResult.jobId}`);
    console.log(`  Events Processed (In-Memory): ${replayResult.processedEvents}`);
    console.log(`  Duration: ${replayResult.durationMs}ms`);
  } catch (err: any) {
    console.log(`  Replay failed: ${err.message}`);
  }

  await app.close();
  console.log('\nVerification Complete.');
}

bootstrap().catch(console.error);
