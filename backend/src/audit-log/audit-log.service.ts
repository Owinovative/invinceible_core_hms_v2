import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { StaffService } from '../staff/staff.service';
import { NotificationService } from '../notification/notification.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly staffService: StaffService,
    private readonly notificationService: NotificationService,
  ) {}

  private getAuditSeverity(dto: CreateAuditLogDto) {
    const action = dto.actionName?.toUpperCase() ?? '';
    const module = dto.moduleName?.toUpperCase() ?? '';

    if (
      action.includes('FAILED') ||
      action.includes('DENIED') ||
      action.includes('SECURITY') ||
      action.includes('DELETE') ||
      action.includes('PURGE')
    ) {
      return 'CRITICAL';
    }

    if (
      module === 'SETTINGS' ||
      module === 'AUTH' ||
      action.includes('UPDATE') ||
      action.includes('DISABLE') ||
      action.includes('LOCK')
    ) {
      return 'WARNING';
    }

    return 'INFO';
  }

  private shouldNotify(dto: CreateAuditLogDto) {
    const action = dto.actionName?.toUpperCase() ?? '';
    const module = dto.moduleName?.toUpperCase() ?? '';

    return (
      module === 'SETTINGS' ||
      module === 'AUTH' ||
      action.includes('FAILED') ||
      action.includes('DENIED') ||
      action.includes('DELETE') ||
      action.includes('DISABLE') ||
      action.includes('LOCK')
    );
  }

  private buildScopedWhere(
    query: AuditLogQueryDto | undefined,
    user: RequestUser,
  ) {
    const where: any = {
      moduleName: query?.moduleName,
      actionName: query?.actionName,
      entityType: query?.entityType,
      entityId: query?.entityId,
    };

    if (user.roleCode === 'SUPER_ADMIN') {
      return where;
    }

    if (!user.homeFacilityId) {
      throw new ForbiddenException('User has no home facility assigned');
    }

    where.facilityId = user.homeFacilityId;

    if (!user.canAccessAllBranchesInFacility) {
      const branchIds = new Set<number>();

      if (user.homeBranchId) {
        branchIds.add(user.homeBranchId);
      }

      for (const branchId of user.allowedBranchIds ?? []) {
        branchIds.add(branchId);
      }

      if (branchIds.size > 0) {
        where.OR = [
          { branchId: null },
          { branchId: { in: Array.from(branchIds) } },
        ];
      }
    }

    return where;
  }

  private assertAuditAccess(
    user: RequestUser,
    log: { facilityId?: number | null; branchId?: number | null },
  ) {
    if (user.roleCode === 'SUPER_ADMIN') {
      return;
    }

    if (!log.facilityId || log.facilityId !== user.homeFacilityId) {
      throw new ForbiddenException('You cannot view this audit log');
    }

    if (!log.branchId || user.canAccessAllBranchesInFacility) {
      return;
    }

    const branchIds = new Set<number>([
      ...(user.allowedBranchIds ?? []),
      ...(user.homeBranchId ? [user.homeBranchId] : []),
    ]);

    if (!branchIds.has(log.branchId)) {
      throw new ForbiddenException('You cannot view this branch audit log');
    }
  }

  async create(dto: CreateAuditLogDto) {
    if (dto.actorUserId) {
      await this.userService.findOne(dto.actorUserId);
    }

    if (dto.actorStaffId) {
      await this.staffService.findOne(dto.actorStaffId);
    }

    const log = await this.prisma.auditLog.create({
      data: {
        moduleName: dto.moduleName,
        actionName: dto.actionName,
        entityType: dto.entityType,
        entityId: dto.entityId,
        description: dto.description,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        actorUserId: dto.actorUserId,
        actorStaffId: dto.actorStaffId,
        beforeData: dto.beforeData,
        afterData: dto.afterData,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
    });

    if (this.shouldNotify(dto)) {
      await this.notificationService.create({
        title: `Audit Alert: ${dto.actionName}`,
        message:
          dto.description ??
          `Audit event recorded for ${dto.moduleName}: ${dto.actionName}`,
        notificationType: 'AUDIT_ALERT',
        severity: this.getAuditSeverity(dto),
        moduleName: 'AUDIT',
        entityType: 'AUDIT_LOG',
        entityId: String(log.id),
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        targetUserId: dto.actorUserId,
        targetStaffId: dto.actorStaffId,
      });
    }

    return log;
  }

  async findAll(query?: AuditLogQueryDto) {
    return this.prisma.auditLog.findMany({
      where: {
        moduleName: query?.moduleName,
        actionName: query?.actionName,
        entityType: query?.entityType,
        entityId: query?.entityId,
      },
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findAllScoped(query: AuditLogQueryDto | undefined, user: RequestUser) {
    return this.prisma.auditLog.findMany({
      where: this.buildScopedWhere(query, user),
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
      orderBy: {
        id: 'desc',
      },
      take: 300,
    });
  }

  async findOne(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
    });

    if (!log) {
      throw new NotFoundException(`Audit log with id ${id} not found`);
    }

    return log;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const log = await this.findOne(id);
    this.assertAuditAccess(user, log);
    return log;
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findByEntityScoped(
    entityType: string,
    entityId: string,
    user: RequestUser,
  ) {
    return this.prisma.auditLog.findMany({
      where: this.buildScopedWhere({ entityType, entityId }, user),
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findByModule(moduleName: string) {
    return this.prisma.auditLog.findMany({
      where: {
        moduleName,
      },
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findByModuleScoped(moduleName: string, user: RequestUser) {
    return this.prisma.auditLog.findMany({
      where: this.buildScopedWhere({ moduleName }, user),
      include: {
        facility: true,
        branch: true,
        actorUser: true,
        actorStaff: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }
}
