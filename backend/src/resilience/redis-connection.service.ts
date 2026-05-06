import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SafeLoggerService } from './safe-logger.service';

@Injectable()
export class RedisConnectionService implements OnModuleDestroy {
  private client?: Redis;
  private fallbackLogged = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: SafeLoggerService,
  ) {}

  get isConfigured() {
    return Boolean(this.configService.get<string>('REDIS_URL'));
  }

  getClient() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) return undefined;

    if (!this.client) {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2_500,
        commandTimeout: 2_500,
        retryStrategy: (times) => Math.min(times * 250, 2_000),
      });

      this.client.on('error', (error) => {
        this.logFallback(
          'Redis connection error; using safe fallback where possible',
          {
            error: error.message,
          },
        );
      });
      this.client.on('connect', () => {
        this.fallbackLogged = false;
        this.logger.info('Redis connected');
      });
    }

    return this.client;
  }

  async ping() {
    const client = this.getClient();
    if (!client) {
      return { configured: false, ok: true, mode: 'memory-fallback' };
    }

    try {
      if (client.status === 'wait') {
        await client.connect();
      }
      const response = await client.ping();
      return { configured: true, ok: response === 'PONG', mode: 'redis' };
    } catch (error) {
      this.logFallback(
        'Redis ping failed; using safe fallback where possible',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return { configured: true, ok: false, mode: 'memory-fallback' };
    }
  }

  logFallback(message: string, context?: Record<string, unknown>) {
    if (this.fallbackLogged) return;
    this.fallbackLogged = true;
    this.logger.warn(message, context);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
    }
  }
}
