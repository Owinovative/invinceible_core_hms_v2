import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { StaffService } from '../staff/staff.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { ResolveNotificationDto } from './dto/resolve-notification.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import {
  paginatedResponse,
  parsePagination,
} from '../common/pagination/pagination';
import { SafeLoggerService } from '../resilience/safe-logger.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly staffService: StaffService,
    private readonly scopeService: ScopeService,
    private readonly safeLogger: SafeLoggerService,
  ) {}

  private includeRelations() {
    return {
      facility: { select: { id: true, code: true, name: true } },
      branch: { select: { id: true, code: true, name: true } },
      targetUser: {
        select: { id: true, username: true, fullName: true, email: true },
      },
      targetStaff: {
        select: {
          id: true,
          staffCode: true,
          firstName: true,
          lastName: true,
        },
      },
      resolvedByUser: {
        select: { id: true, username: true, fullName: true, email: true },
      },
      resolvedByStaff: {
        select: {
          id: true,
          staffCode: true,
          firstName: true,
          lastName: true,
        },
      },
    };
  }

  private applyQueryFilters(where: any, query?: NotificationQueryDto) {
    if (query?.moduleName) where.moduleName = query.moduleName;
    if (query?.notificationType)
      where.notificationType = query.notificationType;
    if (query?.isRead === 'true') where.isRead = true;
    if (query?.isRead === 'false') where.isRead = false;
    if (query?.isResolved === 'true') where.isResolved = true;
    if (query?.isResolved === 'false') where.isResolved = false;

    if (query?.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
        { notificationType: { contains: search } },
        { moduleName: { contains: search } },
        { entityType: { contains: search } },
        { entityId: { contains: search } },
      ];
    }

    return where;
  }

  private buildScopedWhere(user: RequestUser, query?: NotificationQueryDto) {
    const where = this.scopeService.buildReadScope(user);
    this.applyQueryFilters(where, query);

    if (query?.facilityId) {
      this.scopeService.assertFacilityAccess(user, query.facilityId);
      where.facilityId = query.facilityId;
    }

    if (query?.branchId) {
      this.scopeService.assertBranchAccess(
        user,
        query.facilityId ?? user.homeFacilityId!,
        query.branchId,
      );
      where.branchId = query.branchId;
    }

    return where;
  }

  private buildAlertFeedResponse(items: any[]) {
    const unresolvedItems = items.filter((item) => item.isResolved === false);
    const unreadUnresolvedItems = unresolvedItems.filter(
      (item) => item.isRead === false,
    );

    const lowStockCount = unresolvedItems.filter(
      (item) => item.notificationType === 'LOW_STOCK',
    ).length;

    const outOfStockCount = unresolvedItems.filter(
      (item) => item.notificationType === 'OUT_OF_STOCK',
    ).length;

    const criticalCount = unresolvedItems.filter(
      (item) => item.severity === 'CRITICAL',
    ).length;

    const warningCount = unresolvedItems.filter(
      (item) => item.severity === 'WARNING',
    ).length;

    const infoCount = unresolvedItems.filter(
      (item) => item.severity === 'INFO',
    ).length;

    return {
      summary: {
        totalUnresolved: unresolvedItems.length,
        unreadUnresolved: unreadUnresolvedItems.length,
        criticalCount,
        warningCount,
        infoCount,
        lowStockCount,
        outOfStockCount,
      },
      items,
    };
  }

  private isFacilityAdmin(roleCode?: string | null) {
    return ['ADMIN', 'FACILITY_ADMIN'].includes(roleCode ?? '');
  }

  private sameFacility(user: RequestUser, facilityId?: number | null) {
    return (
      !!facilityId &&
      !!user.homeFacilityId &&
      facilityId === user.homeFacilityId
    );
  }

  private sameBranch(
    user: RequestUser,
    facilityId?: number | null,
    branchId?: number | null,
  ) {
    if (!this.sameFacility(user, facilityId) || !branchId) return false;
    const allowed = new Set<number>([
      ...(user.allowedBranchIds ?? []),
      ...(user.homeBranchId ? [user.homeBranchId] : []),
    ]);
    return allowed.has(branchId);
  }

  private async validateNotificationTarget(
    dto: CreateNotificationDto,
    user: RequestUser,
  ) {
    const roleCode = user.roleCode ?? '';
    const isSuperAdmin = roleCode === 'SUPER_ADMIN';
    const isFacilityAdmin = this.isFacilityAdmin(roleCode);

    let facilityId = dto.facilityId ?? user.homeFacilityId ?? undefined;
    let branchId = dto.branchId;

    if (dto.targetUserId && dto.targetStaffId) {
      throw new BadRequestException(
        'Send a notification to either a user or a staff member, not both.',
      );
    }

    if (!dto.targetUserId && !dto.targetStaffId) {
      if (isSuperAdmin) {
        return { facilityId, branchId };
      }

      if (isFacilityAdmin) {
        if (!facilityId) {
          throw new BadRequestException(
            'Facility-wide notifications need a facility scope.',
          );
        }
        this.scopeService.assertFacilityAccess(user, facilityId);
        return { facilityId, branchId: undefined };
      }

      throw new ForbiddenException(
        'Select a recipient. Only super admins can send system-wide notifications and facility admins can send facility-wide notifications.',
      );
    }

    if (dto.targetUserId) {
      const targetUser = await this.userService.findOne(dto.targetUserId);
      const targetFacilityId =
        targetUser.homeFacilityId ?? targetUser.staff?.facilityId ?? null;
      const targetBranchId =
        targetUser.homeBranchId ?? targetUser.staff?.branchId ?? null;
      const targetRole = targetUser.role?.code ?? null;

      if (!isSuperAdmin) {
        const allowed =
          targetRole === 'SUPER_ADMIN' ||
          (this.isFacilityAdmin(targetRole) &&
            this.sameFacility(user, targetFacilityId)) ||
          (isFacilityAdmin
            ? this.sameFacility(user, targetFacilityId)
            : this.sameBranch(user, targetFacilityId, targetBranchId));

        if (!allowed) {
          throw new ForbiddenException(
            'You can only notify super admin, facility admins, or members of your branch.',
          );
        }
      }

      facilityId = facilityId ?? targetFacilityId ?? undefined;
      branchId = branchId ?? targetBranchId ?? undefined;
    }

    if (dto.targetStaffId) {
      const targetStaff = await this.staffService.findOne(dto.targetStaffId);

      if (
        !isSuperAdmin &&
        !(isFacilityAdmin
          ? this.sameFacility(user, targetStaff.facilityId)
          : this.sameBranch(user, targetStaff.facilityId, targetStaff.branchId))
      ) {
        throw new ForbiddenException(
          'You can only notify staff in your branch.',
        );
      }

      facilityId = facilityId ?? targetStaff.facilityId ?? undefined;
      branchId = branchId ?? targetStaff.branchId ?? undefined;
    }

    if (facilityId) {
      this.scopeService.assertBranchAccess(user, facilityId, branchId);
    }

    return { facilityId, branchId };
  }

  async create(dto: CreateNotificationDto, user?: RequestUser) {
    const { facilityId, branchId } = user
      ? await this.validateNotificationTarget(dto, user)
      : {
          facilityId: dto.facilityId,
          branchId: dto.branchId,
        };

    return this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        notificationType: dto.notificationType,
        severity: dto.severity,
        moduleName: dto.moduleName,
        entityType: dto.entityType,
        entityId: dto.entityId,
        facilityId,
        branchId,
        targetUserId: dto.targetUserId,
        targetStaffId: dto.targetStaffId,
      },
      include: this.includeRelations(),
    });
  }

  async getRecipients(user: RequestUser) {
    const isSuperAdmin = user.roleCode === 'SUPER_ADMIN';
    const isFacilityAdmin = this.isFacilityAdmin(user.roleCode);

    const users = await this.prisma.user.findMany({
      where: isSuperAdmin
        ? {}
        : {
            OR: [
              { role: { code: 'SUPER_ADMIN' } },
              { homeFacilityId: user.homeFacilityId ?? -1 },
              { staff: { is: { facilityId: user.homeFacilityId ?? -1 } } },
            ],
          },
      select: {
        id: true,
        username: true,
        fullName: true,
        homeFacilityId: true,
        homeBranchId: true,
        role: { select: { code: true } },
        staff: {
          select: {
            facilityId: true,
            branchId: true,
            passportPhotoUrl: true,
          },
        },
      },
      orderBy: [{ username: 'asc' }],
      take: 500,
    });

    const allowedUsers = users.filter((targetUser) => {
      const targetFacilityId =
        targetUser.homeFacilityId ?? targetUser.staff?.facilityId ?? null;
      const targetBranchId =
        targetUser.homeBranchId ?? targetUser.staff?.branchId ?? null;
      const targetRole = targetUser.role?.code ?? null;

      return (
        isSuperAdmin ||
        targetRole === 'SUPER_ADMIN' ||
        (this.isFacilityAdmin(targetRole) &&
          this.sameFacility(user, targetFacilityId)) ||
        (isFacilityAdmin
          ? this.sameFacility(user, targetFacilityId)
          : this.sameBranch(user, targetFacilityId, targetBranchId))
      );
    });

    const staff = await this.prisma.staff.findMany({
      where: isSuperAdmin
        ? {}
        : isFacilityAdmin
          ? { facilityId: user.homeFacilityId ?? -1 }
          : {
              facilityId: user.homeFacilityId ?? -1,
              branchId: {
                in: [
                  ...(user.allowedBranchIds ?? []),
                  ...(user.homeBranchId ? [user.homeBranchId] : []),
                ],
              },
            },
      select: {
        id: true,
        staffCode: true,
        firstName: true,
        lastName: true,
        designation: true,
        facilityId: true,
        branchId: true,
        passportPhotoUrl: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 500,
    });

    return {
      canNotifySystem: isSuperAdmin,
      canNotifyFacility: isFacilityAdmin,
      users: allowedUsers.map((item) => ({
        id: item.id,
        username: item.username,
        fullName: item.fullName,
        roleCode: item.role?.code ?? null,
        facilityId: item.homeFacilityId ?? item.staff?.facilityId ?? null,
        branchId: item.homeBranchId ?? item.staff?.branchId ?? null,
        photoUrl: item.staff?.passportPhotoUrl ?? null,
      })),
      staff: staff.map((item) => ({
        id: item.id,
        staffCode: item.staffCode,
        firstName: item.firstName,
        lastName: item.lastName,
        designation: item.designation,
        facilityId: item.facilityId,
        branchId: item.branchId,
        photoUrl: item.passportPhotoUrl,
      })),
    };
  }

  async findAll(query?: NotificationQueryDto) {
    const where: any = {};

    if (query?.moduleName) {
      where.moduleName = query.moduleName;
    }

    if (query?.notificationType) {
      where.notificationType = query.notificationType;
    }

    if (query?.facilityId) {
      where.facilityId = query.facilityId;
    }

    if (query?.branchId) {
      where.branchId = query.branchId;
    }

    if (query?.isRead === 'true') {
      where.isRead = true;
    }

    if (query?.isRead === 'false') {
      where.isRead = false;
    }

    if (query?.isResolved === 'true') {
      where.isResolved = true;
    }

    if (query?.isResolved === 'false') {
      where.isResolved = false;
    }

    return this.prisma.notification.findMany({
      where,
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getBranchAlerts(facilityId?: number, branchId?: number) {
    const where: any = {
      isResolved: false,
    };

    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.notification.findMany({
      where,
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getPharmacyAlerts(facilityId?: number, branchId?: number) {
    const where: any = {
      isResolved: false,
      moduleName: 'PHARMACY',
    };

    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.notification.findMany({
      where,
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getUnresolvedCount(
    facilityId?: number,
    branchId?: number,
    moduleName?: string,
  ) {
    const where: any = {
      isResolved: false,
    };

    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (moduleName) {
      where.moduleName = moduleName;
    }

    const total = await this.prisma.notification.count({
      where,
    });

    const unread = await this.prisma.notification.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    const lowStock = await this.prisma.notification.count({
      where: {
        ...where,
        notificationType: 'LOW_STOCK',
      },
    });

    const outOfStock = await this.prisma.notification.count({
      where: {
        ...where,
        notificationType: 'OUT_OF_STOCK',
      },
    });

    return {
      filters: {
        facilityId: facilityId ?? null,
        branchId: branchId ?? null,
        moduleName: moduleName ?? null,
      },
      counts: {
        total,
        unread,
        lowStock,
        outOfStock,
      },
    };
  }
  async getPharmacistDashboardAlerts(staffId: number) {
    const staff = await this.staffService.findOne(staffId);

    if (!staff.branchId) {
      throw new NotFoundException(
        `Staff ${staffId} has no branch assigned for pharmacist alerts`,
      );
    }

    const items = await this.prisma.notification.findMany({
      where: {
        isResolved: false,
        moduleName: 'PHARMACY',
        facilityId: staff.facilityId,
        branchId: staff.branchId,
        OR: [
          { targetStaffId: staffId },
          { targetUserId: staff.userId ?? -1 },
          { targetStaffId: null, targetUserId: null },
        ],
      },
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });

    return this.buildAlertFeedResponse(items);
  }

  async getCashierDashboardAlerts(staffId: number) {
    const staff = await this.staffService.findOne(staffId);

    if (!staff.branchId) {
      throw new NotFoundException(
        `Staff ${staffId} has no branch assigned for cashier alerts`,
      );
    }

    const items = await this.prisma.notification.findMany({
      where: {
        isResolved: false,
        moduleName: 'BILLING',
        facilityId: staff.facilityId,
        branchId: staff.branchId,
        OR: [
          { targetStaffId: staffId },
          { targetUserId: staff.userId ?? -1 },
          { targetStaffId: null, targetUserId: null },
        ],
      },
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });

    return this.buildAlertFeedResponse(items);
  }

  async getAdminOperationsAlerts(userId: number) {
    const user = await this.userService.findOne(userId);

    const baseWhere: any = {
      isResolved: false,
      moduleName: {
        in: ['PHARMACY', 'BILLING', 'LAB', 'IPD', 'SETTINGS', 'AUDIT'],
      },
    };

    if (user.canAccessAllBranchesInFacility && user.homeFacilityId) {
      baseWhere.facilityId = user.homeFacilityId;
    } else if (user.homeBranchId) {
      baseWhere.branchId = user.homeBranchId;
      if (user.homeFacilityId) {
        baseWhere.facilityId = user.homeFacilityId;
      }
    } else if (user.homeFacilityId) {
      baseWhere.facilityId = user.homeFacilityId;
    }

    const items = await this.prisma.notification.findMany({
      where: {
        ...baseWhere,
        OR: [
          { targetUserId: userId },
          { targetUserId: null, targetStaffId: null },
          {
            targetUserId: null,
            targetStaff: {
              is: {
                facilityId: user.homeFacilityId ?? undefined,
              },
            },
          },
        ],
      },
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });

    return this.buildAlertFeedResponse(items);
  }

  async findOne(id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }

    return notification;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...this.buildScopedWhere(user),
      },
      include: this.includeRelations(),
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }

    return notification;
  }

  async findForUser(userId: number) {
    await this.userService.findOne(userId);

    return this.prisma.notification.findMany({
      where: {
        targetUserId: userId,
      },
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findForStaff(staffId: number) {
    await this.staffService.findOne(staffId);

    return this.prisma.notification.findMany({
      where: {
        targetStaffId: staffId,
      },
      include: this.includeRelations(),
      orderBy: {
        id: 'desc',
      },
    });
  }

  async markAsRead(id: number, user?: RequestUser) {
    if (user) {
      await this.findOneScoped(id, user);
    } else {
      await this.findOne(id);
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: this.includeRelations(),
    });
  }

  async resolve(id: number, dto: ResolveNotificationDto, user?: RequestUser) {
    if (user) {
      await this.findOneScoped(id, user);
    } else {
      await this.findOne(id);
    }

    const resolvedByUserId = user?.userId ?? dto.resolvedByUserId;
    const resolvedByStaffId = user?.staffId ?? dto.resolvedByStaffId;

    if (resolvedByUserId) {
      await this.userService.findOne(resolvedByUserId);
    }

    if (resolvedByStaffId) {
      await this.staffService.findOne(resolvedByStaffId);
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
        isResolved: true,
        resolvedAt: new Date(),
        resolvedByUserId,
        resolvedByStaffId,
        resolutionNote: dto.resolutionNote,
      },
      include: this.includeRelations(),
    });
  }

  async resolveManyByEntity(params: {
    entityType: string;
    entityId: string;
    facilityId?: number;
    branchId?: number;
    notificationTypes?: string[];
    resolvedByUserId?: number;
    resolvedByStaffId?: number;
    resolutionNote?: string;
  }) {
    if (params.resolvedByUserId) {
      await this.userService.findOne(params.resolvedByUserId);
    }

    if (params.resolvedByStaffId) {
      await this.staffService.findOne(params.resolvedByStaffId);
    }

    return this.prisma.notification.updateMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        facilityId: params.facilityId,
        branchId: params.branchId,
        isResolved: false,
        ...(params.notificationTypes?.length
          ? {
              notificationType: {
                in: params.notificationTypes,
              },
            }
          : {}),
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedByUserId: params.resolvedByUserId,
        resolvedByStaffId: params.resolvedByStaffId,
        resolutionNote: params.resolutionNote,
      },
    });
  }

  async markAllForStaffAsRead(staffId: number) {
    await this.staffService.findOne(staffId);

    await this.prisma.notification.updateMany({
      where: {
        targetStaffId: staffId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: `All notifications for staff ${staffId} marked as read`,
    };
  }

  async markAllForUserAsRead(userId: number) {
    await this.userService.findOne(userId);

    await this.prisma.notification.updateMany({
      where: {
        targetUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: `All notifications for user ${userId} marked as read`,
    };
  }
  async findAllScoped(user: RequestUser, query?: NotificationQueryDto) {
    const startedAt = Date.now();
    const where = this.buildScopedWhere(user, query);
    const pagination = parsePagination(query ?? {}, {
      defaultPageSize: 25,
      maxPageSize: 100,
      allowedSortFields: ['createdAt', 'id'],
      defaultSortBy: 'createdAt',
      defaultSortDirection: 'desc',
    });

    const orderBy: Prisma.NotificationOrderByWithRelationInput[] = [
      { [pagination.sortBy]: pagination.sortDirection as Prisma.SortOrder },
      { id: 'desc' },
    ];

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: this.includeRelations(),
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const result = paginatedResponse(data, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });

    const durationMs = Date.now() - startedAt;
    if (durationMs >= Number(process.env.SLOW_LIST_MS ?? 750)) {
      this.safeLogger.warn('Slow notification list request', {
        userId: user.userId,
        roleCode: user.roleCode,
        facilityId: user.homeFacilityId,
        branchId: user.homeBranchId,
        page: result.meta.page,
        pageSize: result.meta.pageSize,
        total: result.meta.total,
        durationMs,
      });
    }

    return result;
  }

  async markScopedAsRead(user: RequestUser, query?: NotificationQueryDto) {
    const where = this.buildScopedWhere(user, query);

    const result = await this.prisma.notification.updateMany({
      where: {
        ...where,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'Notifications marked as read',
      count: result.count,
    };
  }

  async getNotificationStats(user?: RequestUser, query?: NotificationQueryDto) {
    const where = user ? this.buildScopedWhere(user, query) : {};

    const total = await this.prisma.notification.count({ where });
    const unread = await this.prisma.notification.count({
      where: { ...where, isRead: false },
    });
    const read = await this.prisma.notification.count({
      where: { ...where, isRead: true },
    });
    const resolved = await this.prisma.notification.count({
      where: { ...where, isResolved: true },
    });
    const unresolved = await this.prisma.notification.count({
      where: { ...where, isResolved: false },
    });

    const info = await this.prisma.notification.count({
      where: { ...where, severity: 'INFO' },
    });

    const warning = await this.prisma.notification.count({
      where: { ...where, severity: 'WARNING' },
    });

    const critical = await this.prisma.notification.count({
      where: { ...where, severity: 'CRITICAL' },
    });

    return {
      total,
      unread,
      read,
      resolved,
      unresolved,
      severity: {
        info,
        warning,
        critical,
      },
    };
  }
}
