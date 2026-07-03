import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IntegrationConfigService } from '../integration-config.service';
import { IntegrationLoggerService } from '../integration-logger.service';
import type {
  OutboundQueueHandler,
  OutboundQueueItem,
} from '../integration.types';
import { isNonRetryableError } from '../integration.types';
import { IntegrationHttpError, toErrorMessage } from '../http/retry-policy';
import { IntegrationQueueService } from './integration-queue.service';

/**
 * Background worker draining the durable outbound queue. Connector services
 * register a handler per (integration, operation); the worker claims due
 * requests, dispatches them, and reports success/failure back to the queue,
 * which drives exponential backoff and dead-lettering. It runs in both web
 * and worker processes — claiming is atomic, so overlap is safe.
 */
@Injectable()
export class IntegrationQueueWorker implements OnModuleInit, OnModuleDestroy {
  private readonly handlers = new Map<string, OutboundQueueHandler>();
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly queue: IntegrationQueueService,
    private readonly config: IntegrationConfigService,
    private readonly logger: IntegrationLoggerService,
  ) {}

  onModuleInit() {
    if (this.config.workerEnabled && this.config.anyIntegrationEnabled) {
      this.start();
    }
  }

  onModuleDestroy() {
    this.stop();
  }

  registerHandler(
    integration: string,
    operation: string,
    handler: OutboundQueueHandler,
  ) {
    this.handlers.set(this.handlerKey(integration, operation), handler);
  }

  start() {
    if (this.timer) return;
    this.logger.info('Integration queue worker started', {
      pollMs: this.config.workerPollMs,
      batchSize: this.config.workerBatchSize,
    });
    this.timer = setInterval(() => {
      void this.tick();
    }, this.config.workerPollMs);
    // Allow the process to exit even while polling (e.g. CLI scripts, tests).
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch (error) {
      this.logger.error('Integration worker tick failed safely', {
        error: toErrorMessage(error),
      });
    } finally {
      this.running = false;
    }
  }

  /** Drains one batch. Exposed for manual sync endpoints and tests. */
  async runOnce(): Promise<{ processed: number; failed: number }> {
    await this.queue.recoverStuckRequests();
    const batch = await this.queue.claimBatch(this.config.workerBatchSize);
    let processed = 0;
    let failed = 0;

    for (const item of batch) {
      const outcome = await this.processItem(item);
      if (outcome) {
        processed += 1;
      } else {
        failed += 1;
      }
    }

    return { processed, failed };
  }

  private async processItem(item: OutboundQueueItem): Promise<boolean> {
    const handler = this.handlers.get(
      this.handlerKey(item.integration, item.operation),
    );

    if (!handler) {
      await this.queue.markFailed(item.id, {
        error: `No handler registered for ${item.integration}:${item.operation}`,
        permanent: true,
      });
      return false;
    }

    const startedAt = Date.now();
    try {
      await handler(item);
      await this.queue.markSucceeded(item.id);
      this.logger.info('Outbound integration request completed', {
        requestId: item.id,
        integration: item.integration,
        operation: item.operation,
        entityId: item.entityId,
        correlationId: item.correlationId,
        durationMs: Date.now() - startedAt,
        retryCount: item.attemptCount,
      });
      return true;
    } catch (error) {
      const httpStatus =
        error instanceof IntegrationHttpError ? error.httpStatus : undefined;
      await this.queue.markFailed(item.id, {
        error: toErrorMessage(error),
        httpStatus,
        permanent: isNonRetryableError(error),
      });
      return false;
    }
  }

  private handlerKey(integration: string, operation: string): string {
    return `${integration}:${operation}`;
  }
}
