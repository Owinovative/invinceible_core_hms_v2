import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';

const FEEDBACK_INCLUDE = {
  facility: true,
  branch: true,
  createdByUser: {
    include: {
      staff: true,
      role: true,
    },
  },
  createdByStaff: true,
  repliedByUser: true,
} satisfies Prisma.UserFeedbackInclude;

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
  ) {}

  private serialize(item: any, revealIdentity = false) {
    const anonymous = Boolean(item.isAnonymous);
    const creator = anonymous && !revealIdentity ? null : item.createdByUser;
    const staff = anonymous && !revealIdentity ? null : item.createdByStaff;

    return {
      ...item,
      createdByUser: creator,
      createdByStaff: staff,
      displayName: anonymous
        ? 'Anonymous user'
        : creator?.fullName || creator?.username || staff?.firstName || 'User',
      displayPhotoUrl: anonymous ? null : staff?.passportPhotoUrl || creator?.staff?.passportPhotoUrl || null,
    };
  }

  async create(dto: CreateFeedbackDto, user: RequestUser) {
    const feedback = await this.prisma.userFeedback.create({
      data: {
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        isAnonymous: dto.isAnonymous ?? false,
        facilityId: user.homeFacilityId ?? null,
        branchId: user.homeBranchId ?? null,
        createdByUserId: user.userId,
        createdByStaffId: user.staffId ?? null,
      },
      include: FEEDBACK_INCLUDE,
    });

    await this.auditLogService.create({
      moduleName: 'FEEDBACK',
      actionName: 'CREATE_FEEDBACK',
      entityType: 'USER_FEEDBACK',
      entityId: String(feedback.id),
      description: `Feedback submitted: ${feedback.subject}`,
      facilityId: feedback.facilityId ?? undefined,
      branchId: feedback.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      afterData: JSON.stringify(feedback),
    });

    return this.serialize(feedback);
  }

  async findMine(user: RequestUser) {
    const items = await this.prisma.userFeedback.findMany({
      where: { createdByUserId: user.userId },
      include: FEEDBACK_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });

    return items.map((item) => this.serialize(item, true));
  }

  async findPlatform() {
    const items = await this.prisma.userFeedback.findMany({
      include: FEEDBACK_INCLUDE,
      orderBy: [{ statusCode: 'asc' }, { createdAt: 'desc' }],
      take: 300,
    });

    return items.map((item) => this.serialize(item));
  }

  async reply(id: number, dto: ReplyFeedbackDto, user: RequestUser) {
    const existing = await this.prisma.userFeedback.findUnique({
      where: { id },
      include: FEEDBACK_INCLUDE,
    });

    if (!existing) {
      throw new NotFoundException(`Feedback with id ${id} not found`);
    }

    const updated = await this.prisma.userFeedback.update({
      where: { id },
      data: {
        replyText: dto.replyText.trim(),
        repliedAt: new Date(),
        repliedByUserId: user.userId,
        statusCode: dto.statusCode ?? 'REPLIED',
      },
      include: FEEDBACK_INCLUDE,
    });

    if (!updated.isAnonymous && updated.createdByUserId) {
      await this.notificationService.create(
        {
          title: 'Super admin replied to your feedback',
          message: dto.replyText.trim(),
          notificationType: 'FEEDBACK_REPLY',
          severity: 'INFO',
          moduleName: 'FEEDBACK',
          entityType: 'USER_FEEDBACK',
          entityId: String(updated.id),
          facilityId: updated.facilityId ?? undefined,
          branchId: updated.branchId ?? undefined,
          targetUserId: updated.createdByUserId,
        },
        user,
      );
    }

    await this.auditLogService.create({
      moduleName: 'FEEDBACK',
      actionName: 'REPLY_FEEDBACK',
      entityType: 'USER_FEEDBACK',
      entityId: String(updated.id),
      description: `Super admin replied to feedback ${updated.id}`,
      facilityId: updated.facilityId ?? undefined,
      branchId: updated.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      beforeData: JSON.stringify(existing),
      afterData: JSON.stringify(updated),
    });

    return this.serialize(updated);
  }
}
