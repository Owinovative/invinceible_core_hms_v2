import { Injectable, Logger } from '@nestjs/common';
import { EventMetricsService } from './event-metrics.service';
import { EventFeatureFlagsService } from '../feature-flags/event-feature-flags.service';
import { RedisConnectionService } from '../../resilience/redis-connection.service';
import { PrismaService } from '../../prisma/prisma.service';

export type ComponentHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface ComponentHealth {
  name: string;
  status: ComponentHealthStatus;
  message?: string;
}

export interface PlatformHealth {
  status: ComponentHealthStatus;
  timestamp: Date;
  components: ComponentHealth[];
}

@Injectable()
export class EventHealthService {
  private readonly logger = new Logger(EventHealthService.name);

  constructor(
    private readonly metricsService: EventMetricsService,
    private readonly flags: EventFeatureFlagsService,
    private readonly redis: RedisConnectionService,
    private readonly prisma: PrismaService,
  ) {}

  async checkHealth(): Promise<PlatformHealth> {
    const components: ComponentHealth[] = [];
    let overallStatus: ComponentHealthStatus = 'HEALTHY';

    // 1. Feature Flags
    if (!this.flags.isEventBusEnabled()) {
      components.push({ name: 'EventBus', status: 'DEGRADED', message: 'Event Bus is administratively disabled.' });
      overallStatus = 'DEGRADED';
    } else {
      components.push({ name: 'EventBus', status: 'HEALTHY' });
    }

    // 2. Database Connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      components.push({ name: 'Database', status: 'HEALTHY' });
    } catch (e) {
      components.push({ name: 'Database', status: 'UNHEALTHY', message: 'Database connection failed' });
      overallStatus = 'UNHEALTHY';
    }

    // 3. Redis Deduplication Store
    const redisClient = this.redis.getClient();
    const isRedisConnected = redisClient ? redisClient.status === 'ready' : false;
    if (!isRedisConnected) {
      components.push({ name: 'Redis (Deduplicator)', status: 'DEGRADED', message: 'Redis disconnected; fail-open mode active.' });
      if (overallStatus !== 'UNHEALTHY') overallStatus = 'DEGRADED';
    } else {
      components.push({ name: 'Redis (Deduplicator)', status: 'HEALTHY' });
    }

    // 4. Queue SLA & DLQ Depth
    if (this.flags.isObservabilityEnabled()) {
      try {
        const metrics = await this.metricsService.getMetricsSnapshot();
        
        if (metrics.queueDepth > 1000) {
          components.push({ name: 'OutboxQueue', status: 'DEGRADED', message: `High queue depth: ${metrics.queueDepth}` });
          if (overallStatus !== 'UNHEALTHY') overallStatus = 'DEGRADED';
        } else {
          components.push({ name: 'OutboxQueue', status: 'HEALTHY' });
        }

        if (metrics.dlq.pendingEvents > 500) {
          components.push({ name: 'DeadLetterQueue', status: 'DEGRADED', message: `High DLQ count: ${metrics.dlq.pendingEvents}` });
          if (overallStatus !== 'UNHEALTHY') overallStatus = 'DEGRADED';
        } else {
          components.push({ name: 'DeadLetterQueue', status: 'HEALTHY' });
        }
      } catch (e) {
        this.logger.error('Failed to collect metrics for health check', e);
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      components,
    };
  }
}
