import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateOperationalModuleRecordDto } from './dto/create-operational-module-record.dto';
import { UpdateOperationalModuleRecordDto } from './dto/update-operational-module-record.dto';
import { OperationalModuleFilterDto } from './dto/operational-module-filter.dto';

const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'];

function normalizeCode(value?: string | null, fallback = 'OPEN') {
  const cleaned = value?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return cleaned || fallback;
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function buildDateRange(filter?: OperationalModuleFilterDto) {
  if (!filter?.startDate && !filter?.endDate) return undefined;

  const range: { gte?: Date; lte?: Date } = {};

  if (filter.startDate) {
    const start = new Date(filter.startDate);
    start.setHours(0, 0, 0, 0);
    range.gte = start;
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  return range;
}

@Injectable()
export class OperationalModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateRecordNumber(moduleSlug: string, facilityId: number) {
    const year = new Date().getFullYear();
    const prefix = `OM-${moduleSlug
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()}-${facilityId}-${year}-`;

    const latest = await this.prisma.operationalModuleRecord.findFirst({
      where: { recordNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { recordNumber: true },
    });

    const lastSequence = latest?.recordNumber
      ? Number(latest.recordNumber.split('-').pop())
      : 0;
    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `${prefix}${String(nextSequence).padStart(5, '0')}`;
  }

  private buildScopedWhere(
    user: RequestUser,
    moduleSlug?: string,
    filter?: OperationalModuleFilterDto,
  ): Prisma.OperationalModuleRecordWhereInput {
    const scope = this.scopeService.buildReadScope(user);
    const where: Prisma.OperationalModuleRecordWhereInput = {
      ...(scope as Prisma.OperationalModuleRecordWhereInput),
    };

    if (moduleSlug) where.moduleSlug = normalizeSlug(moduleSlug);
    if (filter?.statusCode) where.statusCode = normalizeCode(filter.statusCode);
    if (filter?.priorityCode) {
      where.priorityCode = normalizeCode(filter.priorityCode, 'ROUTINE');
    }

    const createdAt = buildDateRange(filter);
    if (createdAt) where.createdAt = createdAt;

    return where;
  }

  private assertWritableStatus(statusCode: string) {
    if (['CLOSED', 'CANCELLED'].includes(statusCode)) {
      throw new BadRequestException(
        'Closed or cancelled module records cannot be changed.',
      );
    }
  }

  async create(
    moduleSlugParam: string,
    dto: CreateOperationalModuleRecordDto,
    user: RequestUser,
  ) {
    const moduleSlug = normalizeSlug(moduleSlugParam);
    const facilityId = dto.facilityId ?? user.homeFacilityId;

    if (!facilityId) {
      throw new ForbiddenException('A facility is required for this module');
    }

    this.scopeService.assertBranchAccess(user, facilityId, dto.branchId ?? null);

    const statusCode = normalizeCode(dto.statusCode);
    const now = new Date();

    const record = await this.prisma.operationalModuleRecord.create({
      data: {
        moduleSlug,
        moduleTitle: dto.moduleTitle?.trim() || moduleSlug,
        recordNumber: await this.generateRecordNumber(moduleSlug, facilityId),
        title: dto.title.trim(),
        description: dto.description?.trim(),
        workflowStage: dto.workflowStage?.trim() || 'Intake',
        statusCode,
        priorityCode: normalizeCode(dto.priorityCode, 'ROUTINE'),
        facilityId,
        branchId: dto.branchId ?? null,
        patientId: dto.patientId ?? null,
        assignedStaffId: dto.assignedStaffId ?? null,
        createdByUserId: user.userId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        startedAt: statusCode === 'IN_PROGRESS' ? now : null,
        completedAt: statusCode === 'COMPLETED' ? now : null,
        closedAt: ['CLOSED', 'CANCELLED'].includes(statusCode) ? now : null,
        metadata: dto.metadata
          ? (dto.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    await this.auditLogService.create({
      moduleName: 'OPERATIONS',
      actionName: 'MODULE_RECORD_CREATED',
      entityType: 'OPERATIONAL_MODULE_RECORD',
      entityId: String(record.id),
      description: `Created ${record.moduleTitle} record ${record.recordNumber}`,
      facilityId: record.facilityId,
      branchId: record.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      afterData: JSON.stringify(record),
    });

    return record;
  }

  async findModuleRecords(
    moduleSlug: string,
    filter: OperationalModuleFilterDto,
    user: RequestUser,
  ) {
    const where = this.buildScopedWhere(user, moduleSlug, filter);

    const [records, statusBreakdown, priorityBreakdown] = await Promise.all([
      this.prisma.operationalModuleRecord.findMany({
        where,
        orderBy: [{ statusCode: 'asc' }, { updatedAt: 'desc' }],
        take: 200,
      }),
      this.prisma.operationalModuleRecord.groupBy({
        by: ['statusCode'],
        where,
        _count: { _all: true },
      }),
      this.prisma.operationalModuleRecord.groupBy({
        by: ['priorityCode'],
        where,
        _count: { _all: true },
      }),
    ]);

    const now = new Date();
    const overdue = records.filter(
      (record) =>
        record.dueAt &&
        record.dueAt < now &&
        !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(record.statusCode),
    ).length;

    return {
      records,
      summary: {
        total: records.length,
        active: records.filter((record) =>
          ACTIVE_STATUSES.includes(record.statusCode),
        ).length,
        completed: records.filter((record) =>
          ['COMPLETED', 'CLOSED'].includes(record.statusCode),
        ).length,
        overdue,
      },
      statusBreakdown: statusBreakdown.map((item) => ({
        label: item.statusCode,
        value: item._count._all,
      })),
      priorityBreakdown: priorityBreakdown.map((item) => ({
        label: item.priorityCode,
        value: item._count._all,
      })),
    };
  }

  async findOne(moduleSlug: string, id: number, user: RequestUser) {
    const record = await this.prisma.operationalModuleRecord.findFirst({
      where: {
        ...this.buildScopedWhere(user, moduleSlug),
        id,
      },
    });

    if (!record) {
      throw new NotFoundException(`Module record with id ${id} not found`);
    }

    return record;
  }

  async update(
    moduleSlug: string,
    id: number,
    dto: UpdateOperationalModuleRecordDto,
    user: RequestUser,
  ) {
    const existing = await this.findOne(moduleSlug, id, user);
    this.assertWritableStatus(existing.statusCode);

    const nextStatus = dto.statusCode
      ? normalizeCode(dto.statusCode)
      : existing.statusCode;
    const now = new Date();

    const updated = await this.prisma.operationalModuleRecord.update({
      where: { id },
      data: {
        moduleTitle: dto.moduleTitle?.trim(),
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        workflowStage: dto.workflowStage?.trim(),
        statusCode: nextStatus,
        priorityCode: dto.priorityCode
          ? normalizeCode(dto.priorityCode, 'ROUTINE')
          : undefined,
        patientId: dto.patientId,
        assignedStaffId: dto.assignedStaffId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        startedAt:
          nextStatus === 'IN_PROGRESS' && !existing.startedAt
            ? now
            : undefined,
        completedAt:
          nextStatus === 'COMPLETED' && !existing.completedAt
            ? now
            : undefined,
        closedAt:
          ['CLOSED', 'CANCELLED'].includes(nextStatus) && !existing.closedAt
            ? now
            : undefined,
      },
    });

    await this.auditLogService.create({
      moduleName: 'OPERATIONS',
      actionName:
        existing.statusCode !== updated.statusCode ||
        existing.workflowStage !== updated.workflowStage
          ? 'MODULE_RECORD_TRANSITIONED'
          : 'MODULE_RECORD_CHANGED',
      entityType: 'OPERATIONAL_MODULE_RECORD',
      entityId: String(updated.id),
      description: `Updated ${updated.moduleTitle} record ${updated.recordNumber}`,
      facilityId: updated.facilityId,
      branchId: updated.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      beforeData: JSON.stringify(existing),
      afterData: JSON.stringify(updated),
    });

    return updated;
  }

  async getGlobalSummary(filter: OperationalModuleFilterDto, user: RequestUser) {
    const where = this.buildScopedWhere(user, undefined, filter);
    const [byModule, byStatus, recentRecords] = await Promise.all([
      this.prisma.operationalModuleRecord.groupBy({
        by: ['moduleSlug', 'moduleTitle'],
        where,
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.operationalModuleRecord.groupBy({
        by: ['statusCode'],
        where,
        _count: { _all: true },
      }),
      this.prisma.operationalModuleRecord.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
    ]);

    return {
      byModule: byModule.map((item) => ({
        moduleSlug: item.moduleSlug,
        moduleTitle: item.moduleTitle,
        count: item._count._all,
      })),
      byStatus: byStatus.map((item) => ({
        label: item.statusCode,
        value: item._count._all,
      })),
      recentRecords,
    };
  }
}
