import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriberRegistry, type SubscriberHandler } from '../subscribers/subscriber-registry.service';
import { EventDeduplicator } from './event-deduplicator.service';
import { EventSerializer } from '../serialization/event-serializer';
import { EventRegistryService } from '../registry/event-registry.service';
import type { BaseClinicalEvent } from '../interfaces/base-clinical-event.interface';

/**
 * EventDispatcher — the engine that reads from the Transactional Outbox and delivers
 * events to registered subscribers.
 * 
 * Features:
 * - Aggregate Ordering: Events for the same aggregate (e.g., patient) are strictly ordered.
 * - Priority Queuing: Higher priority events are fetched first.
 * - Subscriber Isolation: A failure in one subscriber does not affect others (unless CRITICAL).
 * - Deduplication: Prevents double-processing via Redis.
 */
@Injectable()
export class EventDispatcher implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(EventDispatcher.name);
  private isShuttingDown = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_DELAY_MS = 1000;
  private readonly BATCH_SIZE = 100;
  private readonly MAX_RETRIES = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriberRegistry: SubscriberRegistry,
    private readonly deduplicator: EventDeduplicator,
    private readonly serializer: EventSerializer,
    private readonly eventRegistry: EventRegistryService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Starting Event Dispatcher...');
    this.startPolling();
  }

  onApplicationShutdown() {
    this.logger.log('Shutting down Event Dispatcher...');
    this.isShuttingDown = true;
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
    }
  }

  private startPolling() {
    if (this.isShuttingDown) return;

    this.pollingInterval = setTimeout(async () => {
      try {
        await this.processOutbox();
      } catch (error) {
        this.logger.error('Error in EventDispatcher polling loop', error);
      } finally {
        this.startPolling(); // Loop
      }
    }, this.POLLING_DELAY_MS);
  }

  /**
   * Main processing loop.
   */
  private async processOutbox() {
    // 1. Fetch pending/failed events.
    // Order by priority DESC, then occurredAt ASC.
    const candidates = await this.prisma.clinicalEventOutbox.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        retryCount: { lt: this.MAX_RETRIES },
      },
      orderBy: [
        { priorityOrder: 'desc' },
        { occurredAt: 'asc' },
      ],
      take: this.BATCH_SIZE,
    });

    if (candidates.length === 0) return;

    // 2. Enforce Aggregate Ordering.
    // We can only process the OLDEST pending event for any given aggregate.
    // By grouping in memory and taking the first one (since query is ordered by occurredAt asc),
    // we ensure we never process out-of-order for a specific patient/encounter.
    const headEvents = new Map<string, typeof candidates[0]>();
    for (const event of candidates) {
      if (!headEvents.has(event.aggregateId)) {
        headEvents.set(event.aggregateId, event);
      }
    }

    const eventsToProcess = Array.from(headEvents.values());

    // 3. Process concurrently across DIFFERENT aggregates.
    await Promise.all(
      eventsToProcess.map(async (outboxRecord) => {
        await this.dispatchSingleEvent(outboxRecord);
      }),
    );
  }

  private async dispatchSingleEvent(outboxRecord: any) {
    const { uuid, eventType } = outboxRecord;

    // 4. Lock row to prevent concurrent workers from processing it
    const locked = await this.prisma.clinicalEventOutbox.updateMany({
      where: { id: outboxRecord.id, status: outboxRecord.status },
      data: { status: 'DISPATCHING' },
    });

    if (locked.count === 0) {
      return; // Another worker grabbed it
    }

    try {
      // 5. Deduplication Layer
      const isUnique = await this.deduplicator.isUnique(uuid);
      if (!isUnique) {
        // Drop it. Move straight to processed/archived.
        await this.moveToPermanentStore(outboxRecord, 'PROCESSED', []);
        return;
      }

      // Reconstruct the immutable BaseClinicalEvent from the outbox record
      const eventPayload: BaseClinicalEvent = {
        eventId: outboxRecord.uuid,
        correlationId: outboxRecord.correlationId,
        aggregateId: outboxRecord.aggregateId,
        aggregateType: outboxRecord.aggregateType,
        eventType: outboxRecord.eventType,
        eventCategory: outboxRecord.eventCategory as any,
        eventVersion: outboxRecord.eventVersion,
        patientId: outboxRecord.patientId,
        encounterId: outboxRecord.encounterId,
        facilityId: outboxRecord.facilityId,
        branchId: outboxRecord.branchId,
        tenantId: outboxRecord.tenantId,
        userId: outboxRecord.userId,
        sourceModule: outboxRecord.sourceModule,
        priority: outboxRecord.priority as any,
        slaSeconds: outboxRecord.slaSeconds,
        payload: outboxRecord.payload,
        signature: outboxRecord.signature,
        checksum: outboxRecord.checksum,
        metadata: outboxRecord.metadata,
        timestamp: outboxRecord.occurredAt,
      };

      // 6. Security verification (in case DB was tampered with)
      if (!this.serializer.verifyIntegrity(eventPayload)) {
        this.logger.error(`Tamper detection failed for event ${uuid} in Outbox! Marking DEAD_LETTER.`);
        await this.moveToPermanentStore(outboxRecord, 'DEAD_LETTER', []);
        return;
      }

      // 7. Get Subscribers
      const subscribers = this.subscriberRegistry.getSubscribersForEvent(eventType);
      
      let allSubscribersSucceeded = true;
      let criticalFailure = false;
      const startTimeMs = Date.now();

      // 8. Execute Subscribers with Isolation
      const subscriberResults: any[] = [];
      for (const subscriber of subscribers) {
        const result = await this.executeSubscriber(subscriber, eventPayload);
        subscriberResults.push(result);
        
        if (!result.success) {
          allSubscribersSucceeded = false;
          if (subscriber.options.isolationLevel === 'CRITICAL') {
            criticalFailure = true;
            this.logger.error(`CRITICAL subscriber ${subscriber.subscriberName} failed for event ${uuid}. Halting dispatch.`);
            break; // Stop executing further subscribers for this event
          }
        }
      }

      const processingMs = Date.now() - startTimeMs;
      const slaBreached = outboxRecord.slaSeconds ? (processingMs > (outboxRecord.slaSeconds * 1000)) : false;
      
      if (slaBreached) {
        this.logger.warn(`SLA Breach: Event ${uuid} took ${processingMs}ms (Limit: ${outboxRecord.slaSeconds}s)`);
      }

      // 9. Conclude Dispatch
      if (criticalFailure || !allSubscribersSucceeded) {
        await this.markOutboxFailed(outboxRecord.id, outboxRecord.retryCount);
      } else {
        // Move to permanent store and delete from outbox, inserting subscriber statuses
        await this.moveToPermanentStore(outboxRecord, 'PROCESSED', subscriberResults, processingMs, slaBreached);
      }

    } catch (error: any) {
      this.logger.error(`Fatal error dispatching event ${uuid}`, error);
      await this.markOutboxFailed(outboxRecord.id, outboxRecord.retryCount, error.message);
    }
  }

  /**
   * Executes a single subscriber and returns its status.
   */
  private async executeSubscriber(subscriber: SubscriberHandler, event: BaseClinicalEvent): Promise<any> {
    const startedAt = new Date();
    
    try {
      await subscriber.execute(event);
      return {
        subscriberName: subscriber.subscriberName,
        isolationLevel: subscriber.options.isolationLevel ?? 'NORMAL',
        status: 'SUCCESS',
        startedAt,
        completedAt: new Date(),
        processingMs: Date.now() - startedAt.getTime(),
      };
    } catch (error: any) {
      this.logger.error(`Subscriber ${subscriber.subscriberName} failed on event ${event.eventId}`, error);
      return {
        subscriberName: subscriber.subscriberName,
        isolationLevel: subscriber.options.isolationLevel ?? 'NORMAL',
        status: 'FAILED',
        startedAt,
        completedAt: new Date(),
        processingMs: Date.now() - startedAt.getTime(),
        failureReason: error.message,
      };
    }
  }

  private async markOutboxFailed(id: number, currentRetryCount: number, reason?: string) {
    const nextStatus = currentRetryCount >= this.MAX_RETRIES - 1 ? 'FAILED' : 'FAILED'; 
    await this.prisma.clinicalEventOutbox.update({
      where: { id },
      data: {
        status: nextStatus,
        retryCount: { increment: 1 },
        failureReason: reason,
      }
    });
  }

  private async moveToPermanentStore(outboxRecord: any, status: string, subscriberResults: any[], processingMs?: number, slaBreached?: boolean) {
    await this.prisma.$transaction(async (tx) => {
      // Insert into permanent store
      const permanent = await tx.clinicalEvent.create({
        data: {
          uuid: outboxRecord.uuid,
          correlationId: outboxRecord.correlationId,
          aggregateId: outboxRecord.aggregateId,
          aggregateType: outboxRecord.aggregateType,
          eventType: outboxRecord.eventType,
          eventCategory: outboxRecord.eventCategory,
          eventVersion: outboxRecord.eventVersion,
          patientId: outboxRecord.patientId,
          encounterId: outboxRecord.encounterId,
          facilityId: outboxRecord.facilityId,
          branchId: outboxRecord.branchId,
          tenantId: outboxRecord.tenantId,
          userId: outboxRecord.userId,
          sourceModule: outboxRecord.sourceModule,
          priority: outboxRecord.priority,
          slaSeconds: outboxRecord.slaSeconds,
          payload: outboxRecord.payload,
          checksum: outboxRecord.checksum,
          signature: outboxRecord.signature,
          metadata: outboxRecord.metadata,
          occurredAt: outboxRecord.occurredAt,
          status,
          processingMs,
          slaBreached: slaBreached ?? false,
          processedAt: new Date(),
          outboxId: outboxRecord.id,
        }
      });

      // Insert subscriber statuses linked to the permanent event ID
      if (subscriberResults.length > 0) {
        await tx.eventSubscriberStatus.createMany({
          data: subscriberResults.map(res => ({
            eventId: permanent.id,
            subscriberName: res.subscriberName,
            isolationLevel: res.isolationLevel,
            status: res.status,
            startedAt: res.startedAt,
            completedAt: res.completedAt,
            processingMs: res.processingMs,
            failureReason: res.failureReason,
          })),
        });
      }

      // Remove from outbox
      await tx.clinicalEventOutbox.delete({
        where: { id: outboxRecord.id }
      });
    });
  }
}
