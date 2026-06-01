import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagService } from '../enterprise/feature-flag.service';
import { sanitizeForCompactStorage } from '../common/storage/compact-payload';

export type DataOutboxEventInput = {
  eventType: string;
  entityType: string;
  entityId: string | number;
  facilityId?: number | null;
  branchId?: number | null;
  payload?: Record<string, unknown>;
};

@Injectable()
export class DataOutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async record(event: DataOutboxEventInput) {
    if (!this.featureFlags.isEnabled('DATA_WAREHOUSE_ENABLED')) {
      return { recorded: false, reason: 'DATA_WAREHOUSE_DISABLED' };
    }

    return this.prisma.dataOutboxEvent.create({
      data: {
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: String(event.entityId),
        facilityId: event.facilityId ?? null,
        branchId: event.branchId ?? null,
        payload: event.payload
          ? (sanitizeForCompactStorage(event.payload, {
              maxStringLength: 600,
              maxArrayItems: 25,
              maxDepth: 5,
            }) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
