import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health.controller';
import { CacheService } from './cache.service';
import { GlobalExceptionFilter } from './global-exception.filter';
import { JobQueueService } from './job-queue.service';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { RateLimitService } from './rate-limit.service';
import { RedisConnectionService } from './redis-connection.service';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { RequestTimeoutInterceptor } from './request-timeout.interceptor';
import { SafeLoggerService } from './safe-logger.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [
    CacheService,
    JobQueueService,
    RateLimitMiddleware,
    RateLimitService,
    RedisConnectionService,
    RequestContextMiddleware,
    RequestLoggingMiddleware,
    SafeLoggerService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimeoutInterceptor,
    },
  ],
  exports: [
    CacheService,
    JobQueueService,
    RateLimitMiddleware,
    RateLimitService,
    RedisConnectionService,
    RequestContextMiddleware,
    RequestLoggingMiddleware,
    SafeLoggerService,
  ],
})
export class ResilienceModule {}
