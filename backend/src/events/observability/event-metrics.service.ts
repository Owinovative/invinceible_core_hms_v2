import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EventMetricsSnapshot {
  timestamp: Date;
  throughput: {
    eventsLastMinute: number;
    eventsLastHour: number;
    eventsLast24Hours: number;
  };
  queueDepth: number;
  latency: {
    avgProcessingMs: number;
    maxProcessingMs: number;
    slaBreachCount: number;
  };
  dlq: {
    pendingEvents: number;
    topFailingSubscribers: { subscriberName: string; count: number }[];
  };
  replay: {
    activeJobs: number;
    completedJobsToday: number;
  };
}

@Injectable()
export class EventMetricsService {
  private readonly logger = new Logger(EventMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMetricsSnapshot(): Promise<EventMetricsSnapshot> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Throughput
    const [eventsLastMinute, eventsLastHour, eventsLast24Hours] = await Promise.all([
      this.prisma.clinicalEvent.count({ where: { occurredAt: { gte: oneMinuteAgo } } }),
      this.prisma.clinicalEvent.count({ where: { occurredAt: { gte: oneHourAgo } } }),
      this.prisma.clinicalEvent.count({ where: { occurredAt: { gte: oneDayAgo } } }),
    ]);

    // Queue Depth (Outbox events not yet processed by all subscribers)
    const queueDepth = await this.prisma.clinicalEventOutbox.count();

    // Latency & SLA (from subscriber statuses in the last hour)
    const latencyAgg = await this.prisma.eventSubscriberStatus.aggregate({
      where: { startedAt: { gte: oneHourAgo }, status: 'SUCCESS' },
      _avg: { processingMs: true },
      _max: { processingMs: true },
    });
    const slaBreachCount = await this.prisma.eventSubscriberStatus.count({
      where: { startedAt: { gte: oneHourAgo }, slaBreached: true },
    });

    // DLQ Metrics
    const pendingEvents = await this.prisma.deadLetterEvent.count({
      where: { status: 'PENDING' },
    });
    
    const failingSubscribersRaw = await this.prisma.deadLetterEvent.groupBy({
      by: ['failedSubscriber'],
      where: { status: 'PENDING', failedSubscriber: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });
    
    const topFailingSubscribers = failingSubscribersRaw.map(s => ({
      subscriberName: s.failedSubscriber!,
      count: s._count.id,
    }));

    // Replay Metrics
    const activeJobs = await this.prisma.eventReplayJob.count({
      where: { status: 'RUNNING' },
    });
    const completedJobsToday = await this.prisma.eventReplayJob.count({
      where: { status: 'COMPLETED', completedAt: { gte: oneDayAgo } },
    });

    return {
      timestamp: now,
      throughput: { eventsLastMinute, eventsLastHour, eventsLast24Hours },
      queueDepth,
      latency: {
        avgProcessingMs: latencyAgg._avg.processingMs ? Math.round(latencyAgg._avg.processingMs) : 0,
        maxProcessingMs: latencyAgg._max.processingMs ?? 0,
        slaBreachCount,
      },
      dlq: { pendingEvents, topFailingSubscribers },
      replay: { activeJobs, completedJobsToday },
    };
  }
}
