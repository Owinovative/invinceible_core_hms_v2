import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IntegrationLoggerService } from './integration-logger.service';
import type { ApiCallLogEntry } from './integration.types';

/**
 * Persistent audit trail for the integration layer:
 * - one IntegrationApiLog row per external HTTP attempt (never bodies/secrets)
 * - business audit events (fiscalization, cancellation, DHA submissions)
 *   recorded through the existing AuditLogService.
 * Audit persistence must never break the calling flow, so failures are
 * swallowed after being logged.
 */
@Injectable()
export class IntegrationAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly logger: IntegrationLoggerService,
  ) {}

  async recordApiCall(entry: ApiCallLogEntry): Promise<void> {
    try {
      await this.prisma.integrationApiLog.create({
        data: {
          integration: entry.integration,
          endpoint: entry.endpoint.slice(0, 255),
          method: entry.method,
          requestId: entry.requestId,
          correlationId: entry.correlationId ?? null,
          httpStatus: entry.httpStatus ?? null,
          outcome: entry.outcome,
          latencyMs: Math.max(0, Math.round(entry.latencyMs)),
          retryCount: entry.retryCount,
          errorMessage: entry.errorMessage ?? null,
          facilityId: entry.facilityId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to persist integration API log', {
        error: error instanceof Error ? error.message : String(error),
        requestId: entry.requestId,
      });
    }
  }

  async recordEvent(params: {
    moduleName: 'ETIMS' | 'DHA' | 'INTEGRATION';
    actionName: string;
    entityType: string;
    entityId: string;
    description: string;
    facilityId?: number;
    branchId?: number;
    actorUserId?: number;
    actorStaffId?: number;
    afterData?: unknown;
  }): Promise<void> {
    try {
      await this.auditLogService.create({
        moduleName: params.moduleName,
        actionName: params.actionName,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        facilityId: params.facilityId,
        branchId: params.branchId,
        actorUserId: params.actorUserId,
        actorStaffId: params.actorStaffId,
        afterData:
          params.afterData === undefined
            ? undefined
            : JSON.stringify(params.afterData),
      });
    } catch (error) {
      this.logger.warn('Failed to persist integration audit event', {
        error: error instanceof Error ? error.message : String(error),
        actionName: params.actionName,
        entityId: params.entityId,
      });
    }
  }
}
