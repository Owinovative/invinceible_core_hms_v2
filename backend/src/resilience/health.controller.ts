import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisConnectionService } from './redis-connection.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisConnection: RedisConnectionService,
  ) {}

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'invinceible-core-hms-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  @Get('ready')
  async ready() {
    const database = await this.checkDatabase();

    if (!database.ok) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ready',
      database,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('deep')
  async deep() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.redisConnection.ping(),
    ]);

    return {
      status: database.ok ? 'ok' : 'degraded',
      database,
      redis,
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
