import { BadRequestException, Injectable } from '@nestjs/common';
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
