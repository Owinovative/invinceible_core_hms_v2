import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationQueueService } from '../integration/queue/integration-queue.service';
import { IntegrationQueueWorker } from '../integration/queue/integration-queue.worker';
import { DHA_OPERATIONS, INTEGRATION_NAMES } from '../integration/integration.constants';
import { NonRetryableIntegrationError, type OutboundQueueItem } from '../integration/integration.types';
import { IntegrationAuditService } from '../integration/integration-audit.service';

@Injectable()
export class ShrPublisher implements OnModuleInit {
  private readonly logger = new Logger(ShrPublisher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationQueue: IntegrationQueueService,
    private readonly worker: IntegrationQueueWorker,
    private readonly audit: IntegrationAuditService,
  ) {}

  onModuleInit() {
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.PUBLISH_SHR_BUNDLE,
      (item) => this.handlePublication(item),
    );
  }

  async publishBundle(snapshotId: number) {
    const snapshot = await this.prisma.shrBundleSnapshot.findUnique({
      where: { id: snapshotId },
      select: { id: true, publicationId: true },
    });
    if (!snapshot) throw new NonRetryableIntegrationError(`SHR snapshot ${snapshotId} not found`);
    const attempt = await this.prisma.shrPublicationAttempt.create({
      data: { publicationId: snapshot.publicationId, snapshotId, status: 'QUEUED' },
    });
    this.logger.log(`Queueing SHR publication for snapshot ${snapshotId}`);
    const queued = await this.integrationQueue.enqueue({
      integration: 'DHA',
      operation: DHA_OPERATIONS.PUBLISH_SHR_BUNDLE,
      entityType: 'ShrBundleSnapshot',
      entityId: snapshotId.toString(),
      payload: { attemptId: attempt.id },
      idempotencyKey: `shr-attempt-${attempt.id}`,
    });
    await this.prisma.shrPublicationAttempt.update({
      where: { id: attempt.id },
      data: { queueJobId: String(queued.requestId ?? '') },
    });
    await this.prisma.shrPublication.update({
      where: { id: snapshot.publicationId }, data: { state: 'QUEUED' },
    });
    return { attempt, queued };
  }

  private async handlePublication(item: OutboundQueueItem): Promise<void> {
    const attemptId = (item.payload as { attemptId?: unknown } | null)?.attemptId;
    if (!Number.isInteger(attemptId)) throw new NonRetryableIntegrationError('Invalid SHR queue payload');
    const attempt = await this.prisma.shrPublicationAttempt.findUnique({ where: { id: attemptId as number } });
    if (!attempt) throw new NonRetryableIntegrationError(`SHR attempt ${attemptId} not found`);
    await this.prisma.shrPublicationAttempt.update({ where: { id: attempt.id }, data: { status: 'DEAD_LETTER', completedAt: new Date() } });
    await this.prisma.shrPublication.update({ where: { id: attempt.publicationId }, data: { state: 'DEAD_LETTER' } });
    await this.prisma.shrPublicationError.create({
      data: { attemptId: attempt.id, errorType: 'EXTERNAL_CONTRACT_UNAVAILABLE', message: 'DHA SHR transport, acknowledgement, and callback profile have not been issued; publication was fail-closed.' },
    });
    await this.audit.recordEvent({ moduleName: 'DHA', actionName: 'SHR_PUBLICATION_BLOCKED', entityType: 'SHR_PUBLICATION_ATTEMPT', entityId: String(attempt.id), description: 'SHR publication blocked because DHA transport contract is unavailable' });
    throw new NonRetryableIntegrationError('DHA SHR transport contract is unavailable');
  }
}
