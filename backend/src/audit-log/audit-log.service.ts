import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { StaffService } from '../staff/staff.service';
import { NotificationService } from '../notification/notification.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

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
}
