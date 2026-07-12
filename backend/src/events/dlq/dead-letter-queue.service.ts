import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { BaseClinicalEvent } from '../interfaces/base-clinical-event.interface';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pushes a failed event to the Dead Letter Queue.
   */
  async pushToDlq(
    event: BaseClinicalEvent,
    subscriberName: string,
    failureType: string,
    failureReason: string,
  ): Promise<void> {
    this.logger.warn(`Pushing event ${event.eventId} to DLQ from subscriber ${subscriberName}`);
    
    await this.prisma.deadLetterEvent.create({
      data: {
        originalEventId: event.eventId,
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        eventVersion: event.eventVersion,
        correlationId: event.correlationId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        patientId: event.patientId,
        encounterId: event.encounterId,
        facilityId: event.facilityId,
        tenantId: event.tenantId,
        sourceModule: event.sourceModule,
        payload: event.payload as any,
        checksum: event.checksum,
        signature: event.signature,
        metadata: event.metadata as any,
        occurredAt: event.timestamp,
        failureType,
        failureReason,
        failedSubscriber: subscriberName,
        status: 'PENDING',
      }
    });
  }

  async archiveEvent(dlqId: number, adminUser: string, notes?: string): Promise<void> {
    await this.updateDlqStatus(dlqId, 'ARCHIVED', 'MANUAL', adminUser, notes);
  }

  async ignoreEvent(dlqId: number, adminUser: string, notes?: string): Promise<void> {
    await this.updateDlqStatus(dlqId, 'IGNORED', 'MANUAL', adminUser, notes);
  }

  async deleteEvent(dlqId: number, adminUser: string, notes?: string): Promise<void> {
    await this.updateDlqStatus(dlqId, 'DELETED', 'MANUAL', adminUser, notes);
  }

  private async updateDlqStatus(
    dlqId: number,
    status: string,
    resolution: string,
    resolvedBy: string,
    notes?: string
  ): Promise<void> {
    const exists = await this.prisma.deadLetterEvent.findUnique({ where: { id: dlqId } });
    if (!exists) throw new NotFoundException(`DLQ event ${dlqId} not found`);

    await this.prisma.deadLetterEvent.update({
      where: { id: dlqId },
      data: {
        status,
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
        notes: notes ? (exists.notes ? `${exists.notes}\n${notes}` : notes) : exists.notes,
      }
    });
  }

  async getPendingEvents(limit = 100): Promise<any[]> {
    return this.prisma.deadLetterEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }
}
