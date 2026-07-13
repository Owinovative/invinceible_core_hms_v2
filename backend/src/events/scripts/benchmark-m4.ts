import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EventPublisher } from '../event-publisher';
import { EventReplayService } from '../replay/event-replay.service';
import { EventTimelineService } from '../timeline/event-timeline.service';
import { PrismaService } from '../../prisma/prisma.service';

async function bootstrap() {
  console.log('--- Phase 4 Performance Benchmark ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const publisher = app.get(EventPublisher);
  const replay = app.get(EventReplayService);
  const timeline = app.get(EventTimelineService);
  const prisma = app.get(PrismaService);

  // 1. Publish latency
  const iterations = 100;
  let publishTotalMs = 0;
  
  console.log(`Executing ${iterations} mock publishes (in-memory validation)`);
  for (let i = 0; i < iterations; i++) {
    const event = publisher.create({
      correlationId: `bench-${i}`,
      aggregateId: `patient-1`,
      aggregateType: 'Patient',
      eventType: 'PatientRegistered',
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      patientId: 1,
      encounterId: null,
      facilityId: 1,
      branchId: 1,
      tenantId: 1,
      userId: null,
      sourceModule: 'Benchmark',
      priority: 'HIGH',
      payload: { test: true },
      metadata: {},
      timestamp: new Date()
    });
    
    const start = performance.now();
    // We only benchmark validation and signature creation, not DB write to avoid DB overhead noise
    try {
      publisher['validator'].validate(event);
      publisher['serializer'].serialize(event);
    } catch(e) {}
    publishTotalMs += (performance.now() - start);
  }
  
  console.log(`Publish latency (avg): ${(publishTotalMs / iterations).toFixed(2)} ms`);

  // 2. Timeline generation latency
  const timelineStart = performance.now();
  await timeline.getPatientTimeline(1, { limit: 10 });
  const timelineMs = performance.now() - timelineStart;
  console.log(`Timeline generation: ${timelineMs.toFixed(2)} ms`);

  // 3. Memory & CPU
  const memUsage = process.memoryUsage();
  console.log(`Memory Usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);

  await app.close();
}

bootstrap().catch(console.error);
