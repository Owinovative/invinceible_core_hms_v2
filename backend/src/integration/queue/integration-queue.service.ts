import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationConfigService } from '../integration-config.service';
import { IntegrationLoggerService } from '../integration-logger.service';
import {
  INTEGRATION_NAMES,
  OUTBOUND_STATUS,
  type IntegrationName,
} from '../integration.constants';
import type { OutboundQueueItem } from '../integration.types';
import { computeBackoffDelayMs } from '../http/retry-policy';

export interface EnqueueParams {
  integration: IntegrationName;
  operation: string;
  entityType: string;
  entityId: string;
  payload?: unknown;
  idempotencyKey: string;
  correlationId?: string;
  maxAttempts?: number;
  facilityId?: number;
  branchId?: number;
}

export type EnqueueResult =
  | { queued: true; requestId: number }
  | { queued: false; reason: 'DUPLICATE'; requestId?: number };

/**
 * Durable, database-backed outbound queue for government integrations.
 * Rows survive process restarts (offline queue), are retried with
 * exponential backoff, and move to DEAD_LETTER once the retry budget is
 * exhausted. Claiming uses a guarded update so concurrent web/worker
 * processes never double-process a request.
 */
@Injectable()
export class IntegrationQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: IntegrationConfigService,
    private readonly logger: IntegrationLoggerService,
  ) {}

  async enqueue(params: EnqueueParams): Promise<EnqueueResult> {
    try {
      const created = await this.prisma.integrationOutboundRequest.create({
        data: {
          integration: params.integration,
          operation: params.operation,
          entityType: params.entityType,
          entityId: params.entityId,
          payload:
            params.payload === undefined
              ? Prisma.JsonNull
              : (params.payload as Prisma.InputJsonValue),
          status: OUTBOUND_STATUS.PENDING,
          maxAttempts: params.maxAttempts ?? this.defaultMaxAttempts(params),
          nextAttemptAt: new Date(),
          correlationId: params.correlationId ?? null,
          idempotencyKey: params.idempotencyKey,
          facilityId: params.facilityId ?? null,
          branchId: params.branchId ?? null,
        },
      });

      this.logger.info('Queued outbound integration request', {
        requestId: created.id,
        integration: params.integration,
        operation: params.operation,
        entityType: params.entityType,
        entityId: params.entityId,
        correlationId: params.correlationId,
      });

      return { queued: true, requestId: created.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing =
          await this.prisma.integrationOutboundRequest.findUnique({
            where: { idempotencyKey: params.idempotencyKey },
            select: { id: true },
          });
        return { queued: false, reason: 'DUPLICATE', requestId: existing?.id };
      }
      throw error;
    }
  }

  private defaultMaxAttempts(params: EnqueueParams): number {
    return params.integration === INTEGRATION_NAMES.ETIMS
      ? this.config.etimsMaxAttempts
      : this.config.dhaMaxAttempts;
  }

  /**
   * Claims up to `limit` due requests. Each row is claimed with a guarded
   * updateMany (PENDING -> PROCESSING), so a row lost to a concurrent worker
   * is simply skipped.
   */
  async claimBatch(limit: number): Promise<OutboundQueueItem[]> {
    const candidates = await this.prisma.integrationOutboundRequest.findMany({
      where: {
        status: OUTBOUND_STATUS.PENDING,
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
      take: Math.max(1, limit),
    });

    const claimed: OutboundQueueItem[] = [];
    for (const candidate of candidates) {
      const result = await this.prisma.integrationOutboundRequest.updateMany({
        where: { id: candidate.id, status: OUTBOUND_STATUS.PENDING },
        data: { status: OUTBOUND_STATUS.PROCESSING },
      });
      if (result.count === 1) {
        claimed.push({
          id: candidate.id,
          integration: candidate.integration,
          operation: candidate.operation,
          entityType: candidate.entityType,
          entityId: candidate.entityId,
          payload: candidate.payload,
          status: OUTBOUND_STATUS.PROCESSING,
          attemptCount: candidate.attemptCount,
          maxAttempts: candidate.maxAttempts,
          correlationId: candidate.correlationId,
          idempotencyKey: candidate.idempotencyKey,
          facilityId: candidate.facilityId,
          branchId: candidate.branchId,
        });
      }
    }
    return claimed;
  }

  async markSucceeded(id: number): Promise<void> {
    await this.prisma.integrationOutboundRequest.update({
      where: { id },
      data: {
        status: OUTBOUND_STATUS.SUCCEEDED,
        completedAt: new Date(),
        lastError: null,
      },
    });
  }

  /**
   * Records a failed attempt. Retryable failures go back to PENDING with an
   * exponentially backed-off nextAttemptAt; exhausted or permanent failures
   * move to DEAD_LETTER for operator-driven recovery.
   */
  async markFailed(
    id: number,
    params: {
      error: string;
      httpStatus?: number;
      permanent?: boolean;
    },
  ): Promise<{ status: string; attemptCount: number }> {
    const request = await this.prisma.integrationOutboundRequest.findUnique({
      where: { id },
    });
    if (!request) {
      return { status: 'MISSING', attemptCount: 0 };
    }

    const attemptCount = request.attemptCount + 1;
    const exhausted = attemptCount >= request.maxAttempts;
    const dead = params.permanent === true || exhausted;
    const status = dead ? OUTBOUND_STATUS.DEAD_LETTER : OUTBOUND_STATUS.PENDING;
    const delayMs = computeBackoffDelayMs(attemptCount, {
      baseDelayMs: this.config.retryBaseDelayMs,
      maxDelayMs: this.config.retryMaxDelayMs,
    });

    await this.prisma.integrationOutboundRequest.update({
      where: { id },
      data: {
        status,
        attemptCount,
        lastError: params.error.slice(0, 4_000),
        lastHttpStatus: params.httpStatus ?? null,
        nextAttemptAt: dead
          ? request.nextAttemptAt
          : new Date(Date.now() + delayMs),
      },
    });

    if (dead) {
      this.logger.error('Outbound integration request dead-lettered', {
        requestId: id,
        integration: request.integration,
        operation: request.operation,
        attemptCount,
        maxAttempts: request.maxAttempts,
        permanent: params.permanent === true,
        error: params.error,
      });
    } else {
      this.logger.warn('Outbound integration request will retry', {
        requestId: id,
        integration: request.integration,
        operation: request.operation,
        attemptCount,
        maxAttempts: request.maxAttempts,
        nextRetryInMs: delayMs,
      });
    }

    return { status, attemptCount };
  }

  /** Returns crashed PROCESSING rows (stuck longer than the threshold) to PENDING. */
  async recoverStuckRequests(): Promise<number> {
    const threshold = new Date(Date.now() - this.config.stuckRequestMs);
    const result = await this.prisma.integrationOutboundRequest.updateMany({
      where: {
        status: OUTBOUND_STATUS.PROCESSING,
        updatedAt: { lt: threshold },
      },
      data: { status: OUTBOUND_STATUS.PENDING, nextAttemptAt: new Date() },
    });
    if (result.count > 0) {
      this.logger.warn('Recovered stuck integration requests', {
        count: result.count,
      });
    }
    return result.count;
  }

  /** Manual recovery: puts a DEAD_LETTER row back in the queue with a fresh budget. */
  async requeueDeadLetter(id: number): Promise<boolean> {
    const result = await this.prisma.integrationOutboundRequest.updateMany({
      where: { id, status: OUTBOUND_STATUS.DEAD_LETTER },
      data: {
        status: OUTBOUND_STATUS.PENDING,
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lastError: null,
      },
    });
    return result.count === 1;
  }

  async getStats(): Promise<
    Array<{ integration: string; status: string; count: number }>
  > {
    const groups = await this.prisma.integrationOutboundRequest.groupBy({
      by: ['integration', 'status'],
      _count: { _all: true },
    });
    return groups.map((group) => ({
      integration: group.integration,
      status: group.status,
      count: group._count._all,
    }));
  }

  async listDeadLetters(limit = 50) {
    return this.prisma.integrationOutboundRequest.findMany({
      where: { status: OUTBOUND_STATUS.DEAD_LETTER },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }
}
