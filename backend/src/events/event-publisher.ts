import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventSerializer } from './serialization/event-serializer';
import { EventValidator } from './validation/event-validator';
import { EventRegistryService } from './registry/event-registry.service';
import type { BaseClinicalEvent } from './interfaces/base-clinical-event.interface';
import type { EventPriority } from './interfaces/base-clinical-event.interface';
import { v4 as uuidv4 } from 'uuid';

const PRIORITY_ORDER: Record<EventPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * EventPublisher — the sole outbound gateway for all clinical modules to publish events.
 *
 * Implementation uses the Transactional Outbox Pattern:
 * - The event is written into the clinical_events_outbox table atomically
 *   within the same database transaction as the originating business operation.
 * - The EventDispatcher (background worker) reads from the outbox and dispatches
 *   to registered subscribers.
 *
 * Usage (in a clinical service):
 *   const event = this.eventPublisher.create({ ... });
 *   await prisma.$transaction(async (tx) => {
 *     await prisma.triage.create({ ... });       // business operation
 *     await this.eventPublisher.publish(event, tx); // outbox write in same tx
 *   });
 */
@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serializer: EventSerializer,
    private readonly validator: EventValidator,
    private readonly registry: EventRegistryService,
  ) {}

  /**
   * Factory method to create a fully formed, signed, immutable event.
   * Clinical modules should call this first, then pass the result to publish().
   */
  create<TPayload extends Record<string, unknown>>(
    partial: Omit<
      BaseClinicalEvent<TPayload>,
      'eventId' | 'checksum' | 'signature'
    >,
  ): BaseClinicalEvent<TPayload> {
    const eventId = uuidv4();
    const checksum = this.serializer.computeChecksum(partial.payload);
    const signature = this.serializer.computeSignature(
      eventId,
      partial.eventType,
      partial.timestamp,
      checksum,
    );

    const event: BaseClinicalEvent<TPayload> = Object.freeze({
      eventId,
      checksum,
      signature,
      ...partial,
    });

    return event;
  }

  /**
   * Persists the event to the Transactional Outbox within the provided Prisma transaction.
   * If no transaction is provided, a standalone write is performed.
   *
   * @param event   The frozen BaseClinicalEvent to publish.
   * @param tx      The active Prisma transaction context (strongly recommended).
   */
  async publish(
    event: BaseClinicalEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // Step 1: Validate against schema registry
    this.validator.validate(event);

    // Step 2: Verify payload integrity before persistence
    if (!this.serializer.verifyIntegrity(event)) {
      throw new Error(
        `EventPublisher: Integrity check failed for event "${event.eventType}" (${event.eventId}). ` +
          `Event will NOT be published.`,
      );
    }

    const client = tx ?? this.prisma;
    const priorityOrder = PRIORITY_ORDER[event.priority];
    const entry = this.registry.getEntry(event.eventType);

    // Step 3: Write to outbox (same transaction as caller)
    await (client as PrismaService).clinicalEventOutbox.create({
      data: {
        uuid: event.eventId,
        correlationId: event.correlationId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        eventVersion: event.eventVersion,
        patientId: event.patientId,
        encounterId: event.encounterId,
        facilityId: event.facilityId,
        branchId: event.branchId,
        tenantId: event.tenantId,
        userId: event.userId,
        sourceModule: event.sourceModule,
        priority: event.priority,
        priorityOrder,
        slaSeconds: entry.slaSeconds ?? null,
        payload: event.payload as object,
        checksum: event.checksum,
        signature: event.signature,
        metadata: (event.metadata ?? {}) as object,
        occurredAt: event.timestamp,
        status: 'PENDING',
      },
    });

    this.logger.log(
      `EventPublisher: Enqueued "${event.eventType}" (${event.eventId}) ` +
        `priority=${event.priority} patient=${event.patientId} facility=${event.facilityId}`,
    );
  }
}
