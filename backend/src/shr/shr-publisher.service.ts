import { Injectable, Logger } from '@nestjs/common';
import { IntegrationQueueService } from '../integration/queue/integration-queue.service';

@Injectable()
export class ShrPublisher {
  private readonly logger = new Logger(ShrPublisher.name);

  constructor(
    private readonly integrationQueue: IntegrationQueueService
  ) {}

  async publishBundle(snapshotId: number, payload: any) {
    this.logger.log(`Queueing SHR publication for snapshot ${snapshotId}`);
    return this.integrationQueue.enqueue({
      integration: 'DHA',
      operation: 'PUBLISH_SHR_BUNDLE',
      entityType: 'ShrBundleSnapshot',
      entityId: snapshotId.toString(),
      payload,
      idempotencyKey: `shr-snapshot-${snapshotId}`,
    });
  }
}
