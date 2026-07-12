import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriberRegistry } from '../subscribers/subscriber-registry.service';
import { EventSerializer } from '../serialization/event-serializer';
import { EventFeatureFlagsService } from '../feature-flags/event-feature-flags.service';
import { v4 as uuidv4 } from 'uuid';
import type { BaseClinicalEvent } from '../interfaces/base-clinical-event.interface';

export type ReplayMode = 'FULL' | 'SAFE' | 'SIMULATION';

export interface ReplayFilters {
  patientId?: number;
  aggregateId?: string;
  aggregateType?: string;
  correlationId?: string;
  eventTypes?: string[];
  facilityId?: number;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}

export interface ReplayResult {
  jobId: string;
  mode: ReplayMode;
  totalEvents: number;
  processedEvents: number;
  skippedEvents: number;
  failedEvents: number;
  durationMs: number;
  filters: ReplayFilters;
}

/**
 * EventReplayService — three replay modes:
 *
 * FULL       - Re-executes all subscribers as if events are new. Used for disaster recovery.
 * SAFE       - Re-executes subscribers but skips external SHR/DHA transmission.
 *              Identical to FULL except SHR outbox writes are suppressed.
 * SIMULATION - In-memory execution only. No DB writes, no subscriber side effects.
 *              Used for testing and impact analysis.
 */
@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriberRegistry: SubscriberRegistry,
    private readonly serializer: EventSerializer,
    private readonly flags: EventFeatureFlagsService,
  ) {}

  /**
   * Initiates a replay job.
   */
  async replay(mode: ReplayMode, filters: ReplayFilters, initiatedBy?: string): Promise<ReplayResult> {
    if (!this.flags.isReplayEnabled()) {
      throw new BadRequestException('Event replay is currently disabled via feature flags.');
    }
    if (mode === 'SIMULATION' && !this.flags.isSimulationEnabled()) {
      throw new BadRequestException('Simulation mode is currently disabled via feature flags.');
    }

    const jobId = uuidv4();
    const startedAt = Date.now();

    this.logger.log(`Starting ${mode} replay job ${jobId}. Filters: ${JSON.stringify(filters)}`);

    // Create replay job record
    const job = await this.prisma.eventReplayJob.create({
      data: {
        jobId,
        mode,
        status: 'RUNNING',
        filters: filters as any,
        initiatedBy,
      },
    });

    try {
      // Fetch events matching filters
      const events = await this.fetchEvents(filters);
      const totalEvents = events.length;

      await this.prisma.eventReplayJob.update({
        where: { id: job.id },
        data: { totalEvents },
      });

      let processedEvents = 0;
      let skippedEvents = 0;
      let failedEvents = 0;

      // Process in chronological order (guaranteed by query ordering)
      for (const storedEvent of events) {
        const eventPayload = this.buildEventPayload(storedEvent);

        // Verify integrity before replay
        if (!this.serializer.verifyIntegrity(eventPayload)) {
          this.logger.warn(`[Replay] Skipping tampered event ${storedEvent.uuid}`);
          skippedEvents++;
          continue;
        }

        if (mode === 'SIMULATION') {
          // Simulation: just log what would happen, no actual execution
          this.logger.debug(`[SIMULATION] Would replay ${storedEvent.eventType} for patient ${storedEvent.patientId}`);
          processedEvents++;
          continue;
        }

        // Get subscribers for this event
        const subscribers = this.subscriberRegistry.getSubscribersForEvent(storedEvent.eventType);

        if (subscribers.length === 0) {
          skippedEvents++;
          continue;
        }

        let eventFailed = false;
        for (const subscriber of subscribers) {
          // In SAFE mode, skip SHR/DHA integration subscribers
          if (mode === 'SAFE' && this.isExternalIntegrationSubscriber(subscriber.subscriberName)) {
            this.logger.debug(`[SAFE Replay] Skipping external subscriber ${subscriber.subscriberName}`);
            skippedEvents++;
            continue;
          }

          try {
            await subscriber.execute(eventPayload);
          } catch (error: any) {
            this.logger.error(`[Replay] Subscriber ${subscriber.subscriberName} failed on event ${storedEvent.uuid}`, error);
            eventFailed = true;
          }
        }

        if (eventFailed) {
          failedEvents++;
        } else {
          processedEvents++;
        }

        // Update progress every 100 events
        if ((processedEvents + failedEvents + skippedEvents) % 100 === 0) {
          await this.prisma.eventReplayJob.update({
            where: { id: job.id },
            data: { processedEvents, skippedEvents, failedEvents },
          });
        }
      }

      const durationMs = Date.now() - startedAt;

      await this.prisma.eventReplayJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          processedEvents,
          skippedEvents,
          failedEvents,
          completedAt: new Date(),
          durationMs,
        },
      });

      this.logger.log(
        `[Replay] Job ${jobId} COMPLETED. Mode: ${mode}, Total: ${totalEvents}, ` +
        `Processed: ${processedEvents}, Skipped: ${skippedEvents}, Failed: ${failedEvents}, Duration: ${durationMs}ms`,
      );

      return { jobId, mode, totalEvents, processedEvents, skippedEvents, failedEvents, durationMs, filters };

    } catch (error: any) {
      await this.prisma.eventReplayJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', completedAt: new Date(), durationMs: Date.now() - startedAt },
      });
      this.logger.error(`[Replay] Job ${jobId} FAILED`, error);
      throw error;
    }
  }

  /**
   * Replay a single event from the Dead Letter Queue.
   */
  async replayFromDlq(dlqId: number, mode: ReplayMode = 'FULL'): Promise<void> {
    const dlqEvent = await this.prisma.deadLetterEvent.findUnique({ where: { id: dlqId } });
    if (!dlqEvent) throw new BadRequestException(`DLQ event ${dlqId} not found`);
    if (dlqEvent.status === 'DELETED') throw new BadRequestException('Cannot replay a deleted DLQ event');

    const eventPayload: BaseClinicalEvent = {
      eventId: dlqEvent.originalEventId,
      correlationId: dlqEvent.correlationId,
      aggregateId: dlqEvent.aggregateId,
      aggregateType: dlqEvent.aggregateType,
      eventType: dlqEvent.eventType,
      eventCategory: dlqEvent.eventCategory as any,
      eventVersion: dlqEvent.eventVersion,
      patientId: dlqEvent.patientId ?? 0,
      encounterId: dlqEvent.encounterId ?? null,
      facilityId: dlqEvent.facilityId ?? 0,
      branchId: null,
      tenantId: dlqEvent.tenantId ?? 0,
      userId: null,
      sourceModule: dlqEvent.sourceModule ?? 'DLQ',
      priority: 'HIGH',
      payload: dlqEvent.payload as any,
      signature: dlqEvent.signature,
      checksum: dlqEvent.checksum,
      metadata: (dlqEvent.metadata as any) ?? {},
      timestamp: dlqEvent.occurredAt,
    };

    const subscribers = this.subscriberRegistry.getSubscribersForEvent(dlqEvent.eventType);
    for (const subscriber of subscribers) {
      if (mode === 'SAFE' && this.isExternalIntegrationSubscriber(subscriber.subscriberName)) continue;
      await subscriber.execute(eventPayload);
    }

    await this.prisma.deadLetterEvent.update({
      where: { id: dlqId },
      data: { status: 'REPLAYED', resolvedAt: new Date(), resolution: 'MANUAL', retryCount: { increment: 1 }, lastRetryAt: new Date() },
    });
  }

  /**
   * Get all replay jobs (for dashboard).
   */
  async getReplayJobs(limit = 50): Promise<any[]> {
    return this.prisma.eventReplayJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async fetchEvents(filters: ReplayFilters): Promise<any[]> {
    const where: any = {};

    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.aggregateId) where.aggregateId = filters.aggregateId;
    if (filters.aggregateType) where.aggregateType = filters.aggregateType;
    if (filters.correlationId) where.correlationId = filters.correlationId;
    if (filters.facilityId) where.facilityId = filters.facilityId;
    if (filters.eventTypes?.length) where.eventType = { in: filters.eventTypes };
    if (filters.fromDate || filters.toDate) {
      where.occurredAt = {};
      if (filters.fromDate) where.occurredAt.gte = filters.fromDate;
      if (filters.toDate) where.occurredAt.lte = filters.toDate;
    }

    return this.prisma.clinicalEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'asc' }],
      take: filters.limit ?? 10000,
    });
  }

  private buildEventPayload(storedEvent: any): BaseClinicalEvent {
    return {
      eventId: storedEvent.uuid,
      correlationId: storedEvent.correlationId,
      aggregateId: storedEvent.aggregateId,
      aggregateType: storedEvent.aggregateType,
      eventType: storedEvent.eventType,
      eventCategory: storedEvent.eventCategory,
      eventVersion: storedEvent.eventVersion,
      patientId: storedEvent.patientId,
      encounterId: storedEvent.encounterId,
      facilityId: storedEvent.facilityId,
      branchId: storedEvent.branchId,
      tenantId: storedEvent.tenantId,
      userId: storedEvent.userId,
      sourceModule: storedEvent.sourceModule,
      priority: storedEvent.priority,
      slaSeconds: storedEvent.slaSeconds,
      payload: storedEvent.payload,
      signature: storedEvent.signature,
      checksum: storedEvent.checksum,
      metadata: storedEvent.metadata ?? {},
      timestamp: storedEvent.occurredAt,
    };
  }

  private isExternalIntegrationSubscriber(subscriberName: string): boolean {
    // ShrEventSubscriber calls ShrTimelineService which calls IntegrationQueueService
    return subscriberName.includes('Shr') || subscriberName.includes('Dha') || subscriberName.includes('Integration');
  }
}
