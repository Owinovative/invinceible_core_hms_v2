import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TimelineFilters {
  eventTypes?: string[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}

@Injectable()
export class EventTimelineService {
  private readonly logger = new Logger(EventTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a chronological timeline of all events for a patient.
   */
  async getPatientTimeline(patientId: number, filters?: TimelineFilters): Promise<any[]> {
    return this.getTimeline({ patientId }, filters);
  }

  /**
   * Generates a chronological timeline for a specific encounter.
   */
  async getEncounterTimeline(encounterId: number, filters?: TimelineFilters): Promise<any[]> {
    return this.getTimeline({ encounterId }, filters);
  }

  /**
   * Generates a chronological timeline matching a specific correlation ID.
   * Useful for tracing a single distributed transaction (e.g. a complete lab order workflow).
   */
  async getCorrelationTimeline(correlationId: string, filters?: TimelineFilters): Promise<any[]> {
    return this.getTimeline({ correlationId }, filters);
  }

  private async getTimeline(baseWhere: any, filters?: TimelineFilters): Promise<any[]> {
    const where = { ...baseWhere };

    if (filters?.eventTypes?.length) {
      where.eventType = { in: filters.eventTypes };
    }
    
    if (filters?.fromDate || filters?.toDate) {
      where.occurredAt = {};
      if (filters.fromDate) where.occurredAt.gte = filters.fromDate;
      if (filters.toDate) where.occurredAt.lte = filters.toDate;
    }

    const events = await this.prisma.clinicalEvent.findMany({
      where,
      orderBy: { occurredAt: 'asc' }, // Strict chronological order
      take: filters?.limit ?? 1000,
    });

    if (!events.length) {
      return [];
    }

    // Map DB rows to a clean timeline projection
    return events.map((e) => ({
      eventId: e.uuid,
      eventType: e.eventType,
      category: e.eventCategory,
      timestamp: e.occurredAt,
      actorId: e.userId,
      module: e.sourceModule,
      aggregateId: e.aggregateId,
      correlationId: e.correlationId,
      payload: e.payload,
    }));
  }
}
