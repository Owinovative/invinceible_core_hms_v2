import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisConnectionService } from './redis-connection.service';
import { SafeLoggerService } from './safe-logger.service';

export type HmsJobType =
  | 'PDF_GENERATION'
  | 'BULK_REPORT'
  | 'SHA_CLAIM_BATCH'
  | 'CSV_IMPORT'
  | 'MPESA_RECONCILIATION'
  | 'NOTIFICATION_DELIVERY'
  | 'STOCK_RECONCILIATION'
  | 'AUDIT_ANALYSIS'
  | 'LARGE_EXPORT';

export type HmsJobPayload = Record<string, unknown>;

type HmsJob = {
  id: string;
  type: HmsJobType;
  payload: HmsJobPayload;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string;
  createdAt: string;
  lastError?: string;
  failedAt?: string;
};

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly memoryQueue: HmsJob[] = [];
  private readonly idempotency = new Set<string>();
  private workerTimer?: NodeJS.Timeout;
  private active = 0;
  private stopping = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisConnection: RedisConnectionService,
    private readonly logger: SafeLoggerService,
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('WORKER_MODE') === 'true') {
      this.startWorkerLoop();
    }
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.workerTimer) clearInterval(this.workerTimer);
  }

  async enqueue(params: {
    type: HmsJobType;
    payload: HmsJobPayload;
    idempotencyKey?: string;
    maxAttempts?: number;
  }) {
    if (this.configService.get<string>('QUEUE_ENABLED') === 'false') {
      this.logger.warn('Queue disabled; job was not enqueued', {
        type: params.type,
        idempotencyKey: params.idempotencyKey,
      });
      return { queued: false, reason: 'QUEUE_DISABLED' };
    }

    const job: HmsJob = {
      id: randomUUID(),
      type: params.type,
      payload: params.payload,
      attempts: 0,
      maxAttempts: params.maxAttempts ?? 3,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    if (params.idempotencyKey && this.idempotency.has(params.idempotencyKey)) {
      return {
        queued: false,
        reason: 'DUPLICATE_JOB',
        idempotencyKey: params.idempotencyKey,
      };
    }

    const redis = this.redisConnection.getClient();
    const queueKey = this.queueKey('pending');

    if (redis) {
      try {
        if (params.idempotencyKey) {
          const added = await redis.set(
            this.queueKey(`idem:${params.idempotencyKey}`),
            job.id,
            'EX',
            86_400,
            'NX',
          );
          if (!added) {
            return {
              queued: false,
              reason: 'DUPLICATE_JOB',
              idempotencyKey: params.idempotencyKey,
            };
          }
        }
        await redis.lpush(queueKey, JSON.stringify(job));
        this.logger.info('Queued HMS job', { jobId: job.id, type: job.type });
        return { queued: true, jobId: job.id, backend: 'redis' };
      } catch (error) {
        this.redisConnection.logFallback(
          'Redis queue enqueue failed; using memory queue',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    if (params.idempotencyKey) this.idempotency.add(params.idempotencyKey);
    this.memoryQueue.push(job);
    this.logger.info('Queued HMS job', {
      jobId: job.id,
      type: job.type,
      backend: 'memory',
    });
    return { queued: true, jobId: job.id, backend: 'memory' };
  }

  startWorkerLoop() {
    if (this.workerTimer) return;
    const concurrency = Number(
      this.configService.get<string>('QUEUE_CONCURRENCY') ?? 5,
    );
    this.logger.info('Starting HMS worker loop', { concurrency });

    this.workerTimer = setInterval(() => {
      while (!this.stopping && this.active < concurrency) {
        this.active += 1;
        void this.processOne()
          .catch((error) => {
            this.logger.error('Worker loop failed safely', {
              error: error instanceof Error ? error.message : String(error),
            });
          })
          .finally(() => {
            this.active -= 1;
          });
      }
    }, 1_000);
  }

  async processOne() {
    const job = await this.nextJob();
    if (!job) return;

    const startedAt = Date.now();
    try {
      await this.handleJob(job);
      this.logger.info('HMS job completed', {
        jobId: job.id,
        type: job.type,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      await this.handleFailure(job, error);
    }
  }

  private async nextJob(): Promise<HmsJob | undefined> {
    const redis = this.redisConnection.getClient();
    if (redis) {
      try {
        const raw = await redis.rpop(this.queueKey('pending'));
        return raw ? (JSON.parse(raw) as HmsJob) : undefined;
      } catch (error) {
        this.redisConnection.logFallback(
          'Redis queue read failed; using memory queue',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    return this.memoryQueue.shift();
  }

  private async handleJob(job: HmsJob) {
    switch (job.type) {
      case 'MPESA_RECONCILIATION':
      case 'PDF_GENERATION':
      case 'BULK_REPORT':
      case 'SHA_CLAIM_BATCH':
      case 'CSV_IMPORT':
      case 'NOTIFICATION_DELIVERY':
      case 'STOCK_RECONCILIATION':
      case 'AUDIT_ANALYSIS':
      case 'LARGE_EXPORT':
        this.logger.info('HMS job acknowledged by foundation worker', {
          jobId: job.id,
          type: job.type,
        });
        return;
    }
  }

  private async handleFailure(job: HmsJob, error: unknown) {
    const failedJob = {
      ...job,
      attempts: job.attempts + 1,
      lastError: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
    };

    this.logger.error('HMS job failed safely', {
      jobId: job.id,
      type: job.type,
      attempts: failedJob.attempts,
      maxAttempts: job.maxAttempts,
      error: failedJob.lastError,
    });

    const redis = this.redisConnection.getClient();
    const target =
      failedJob.attempts >= job.maxAttempts ? 'dead-letter' : 'pending';

    if (redis) {
      await redis
        .lpush(this.queueKey(target), JSON.stringify(failedJob))
        .catch(() => undefined);
      return;
    }

    if (target === 'pending') {
      this.memoryQueue.push(failedJob);
    }
  }

  private queueKey(name: string) {
    return `${this.configService.get<string>('QUEUE_PREFIX') || 'inv_hms'}:queue:${name}`;
  }
}
