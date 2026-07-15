import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowAuditService {
  private readonly logger = new Logger(WorkflowAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the complete, immutable audit trail for a workflow instance.
   */
  async getAuditTrail(instanceId: string, facilityId: number): Promise<any[]> {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { instanceId, facilityId },
    });

    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`);

    return this.prisma.workflowAudit.findMany({
      where: { workflowInstanceId: instance.id },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Returns recent audit events for a given facility (for operational monitoring).
   */
  async getRecentAuditEvents(facilityId: number, limit = 100): Promise<any[]> {
    return this.prisma.workflowAudit.findMany({
      where: {
        instance: { facilityId },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        instance: { select: { instanceId: true, patientId: true } },
      },
    });
  }
}
