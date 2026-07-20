import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DHA_CLIENT,
  DHA_OPERATIONS,
  INTEGRATION_NAMES,
} from '../integration/integration.constants';
import type { DhaClientPort } from '../integration/dha/dha.types';
import type { OutboundQueueItem } from '../integration/integration.types';
import { IntegrationQueueService } from '../integration/queue/integration-queue.service';
import { IntegrationQueueWorker } from '../integration/queue/integration-queue.worker';
import { toErrorMessage } from '../integration/http/retry-policy';

@Injectable()
export class ShrPublisher implements OnModuleInit {
  private readonly logger = new Logger(ShrPublisher.name);

  constructor(
    private readonly integrationQueue: IntegrationQueueService,
    private readonly worker: IntegrationQueueWorker,
    private readonly prisma: PrismaService,
    @Inject(DHA_CLIENT) private readonly dhaClient: DhaClientPort,
  ) {}

  onModuleInit() {
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.PUBLISH_SHR_BUNDLE,
      (item) => this.handleQueuedPublication(item),
    );
  }

  async publishBundle(publicationId: number, snapshotId: number) {
    this.logger.log(`Queueing SHR publication for snapshot ${snapshotId}`);
    const activeAttempt = await this.prisma.shrPublicationAttempt.findFirst({
      where: {
        publicationId,
        snapshotId,
        status: { in: ['QUEUED', 'TRANSMITTING', 'SUCCESS'] },
      },
      orderBy: { id: 'desc' },
    });
    if (activeAttempt) return activeAttempt;

    const correlationId = randomUUID();
    const attempt = await this.prisma.shrPublicationAttempt.create({
      data: {
        publicationId,
        snapshotId,
        status: 'QUEUED',
        correlationId,
      },
    });
    const queued = await this.integrationQueue.enqueue({
      integration: 'DHA',
      operation: DHA_OPERATIONS.PUBLISH_SHR_BUNDLE,
      entityType: 'ShrBundleSnapshot',
      entityId: snapshotId.toString(),
      payload: { attemptId: attempt.id },
      idempotencyKey: `shr-snapshot-${snapshotId}-attempt-${attempt.id}`,
      correlationId,
    });
    await this.prisma.shrPublicationAttempt.update({
      where: { id: attempt.id },
      data: { queueJobId: String(queued.requestId) },
    });
    return attempt;
  }

  private async handleQueuedPublication(item: OutboundQueueItem) {
    const attemptId = Number(
      (item.payload as { attemptId?: unknown } | null)?.attemptId,
    );
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      throw new Error('SHR queue payload is missing a valid attemptId');
    }
    const attempt = await this.prisma.shrPublicationAttempt.findUnique({
      where: { id: attemptId },
      include: {
        snapshot: true,
        publication: { include: { patient: { select: { facilityId: true } } } },
      },
    });
    if (!attempt) throw new Error(`SHR attempt ${attemptId} not found`);
    if (attempt.status === 'SUCCESS') return;

    await this.prisma.$transaction([
      this.prisma.shrPublicationAttempt.update({
        where: { id: attempt.id },
        data: { status: 'TRANSMITTING', startedAt: new Date() },
      }),
      this.prisma.shrPublication.update({
        where: { id: attempt.publicationId },
        data: { state: 'PUBLISHING' },
      }),
    ]);

    try {
      const result = await this.dhaClient.executeApiOperation(
        'PUBLISH_SHR_BUNDLE',
        attempt.snapshot.payload as Record<string, unknown>,
        {
          correlationId: attempt.correlationId ?? undefined,
          facilityId: attempt.publication.patient.facilityId,
        },
      );
      await this.prisma.$transaction([
        this.prisma.shrAcknowledgement.upsert({
          where: { attemptId: attempt.id },
          create: {
            attemptId: attempt.id,
            dhaReceiptId: result.externalRef,
            status: result.status === 'FAILED' ? 'REJECTED' : 'ACCEPTED',
            payload: (result.raw ?? {}) as Prisma.InputJsonValue,
          },
          update: {
            dhaReceiptId: result.externalRef,
            status: result.status === 'FAILED' ? 'REJECTED' : 'ACCEPTED',
            payload: (result.raw ?? {}) as Prisma.InputJsonValue,
          },
        }),
        this.prisma.shrPublicationAttempt.update({
          where: { id: attempt.id },
          data: { status: 'SUCCESS', completedAt: new Date() },
        }),
        this.prisma.shrPublication.update({
          where: { id: attempt.publicationId },
          data: { state: 'COMPLETED' },
        }),
      ]);
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.shrPublicationError.create({
          data: {
            attemptId: attempt.id,
            errorType: 'NETWORK',
            message: toErrorMessage(error).slice(0, 4_000),
          },
        }),
        this.prisma.shrPublicationAttempt.update({
          where: { id: attempt.id },
          data: { status: 'FAILED', completedAt: new Date() },
        }),
        this.prisma.shrPublication.update({
          where: { id: attempt.publicationId },
          data: { state: 'RETRY_PENDING' },
        }),
      ]);
      throw error;
    }
  }
}
