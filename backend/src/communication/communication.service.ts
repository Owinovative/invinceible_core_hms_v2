import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { JobQueueService } from '../resilience/job-queue.service';
import { FeatureFlagService } from '../enterprise/feature-flag.service';
import type {
  NotificationChannel,
  NotificationMessage,
} from './notification-provider';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly jobQueue: JobQueueService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async queueMessage(message: NotificationMessage) {
    this.assertChannelEnabled(message.channel);

    if (!message.recipient?.trim()) {
      throw new BadRequestException('Notification recipient is required');
    }

    if (!message.templateKey?.trim()) {
      throw new BadRequestException('Notification template key is required');
    }

    return this.jobQueue.enqueue({
      type: 'NOTIFICATION_DELIVERY',
      idempotencyKey: [
        message.channel,
        message.recipient,
        message.templateKey,
        message.patientId ?? 'no-patient',
        createHash('sha256')
          .update(JSON.stringify(message.variables ?? {}))
          .digest('hex')
          .slice(0, 16),
        new Date().toISOString().slice(0, 10),
      ].join(':'),
      payload: {
        channel: message.channel,
        recipient: message.recipient,
        templateKey: message.templateKey,
        variables: message.variables ?? {},
        facilityId: message.facilityId ?? null,
        branchId: message.branchId ?? null,
        patientId: message.patientId ?? null,
      },
    });
  }

  async queueBulk(messages: NotificationMessage[]) {
    const results: Array<{ queued: boolean }> = [];
    for (const message of messages) {
      results.push(await this.queueMessage(message));
    }
    return {
      requested: messages.length,
      queued: results.filter((result) => result.queued).length,
      results,
    };
  }

  private assertChannelEnabled(channel: NotificationChannel) {
    const flagByChannel: Record<
      NotificationChannel,
      Parameters<FeatureFlagService['isEnabled']>[0]
    > = {
      sms: 'SMS_ENABLED',
      whatsapp: 'WHATSAPP_ENABLED',
      email: 'SMS_ENABLED',
    };

    if (!this.featureFlags.isEnabled(flagByChannel[channel])) {
      throw new BadRequestException(
        `${channel.toUpperCase()} notifications are disabled by feature flag`,
      );
    }
  }
}
