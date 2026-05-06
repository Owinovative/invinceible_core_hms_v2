import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import {
  addDays,
  addMonths,
  computeFacilityAccessStatus,
} from '../common/facility-access';
import { PrismaService } from '../prisma/prisma.service';
import { RecordFacilitySubscriptionPaymentDto } from './dto/record-facility-subscription-payment.dto';

const MONTHLY_FEE = 5000;

@Injectable()
export class FacilitySubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private paymentNumber() {
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const entropy = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`.toUpperCase();
    return `SUB-${dateKey}-${entropy}`;
  }

  computeStatus(facility: {
    id: number;
    createdAt: Date;
    subscriptionMonthlyFee?: number | null;
    subscriptionStartedAt?: Date | null;
    subscriptionPaidThrough?: Date | null;
    subscriptionStatus?: string | null;
    subscriptionLockedAt?: Date | null;
    isActive?: boolean | null;
    updatedAt?: Date | null;
    complianceStatus?: string | null;
    complianceReason?: string | null;
    complianceDeactivatedAt?: Date | null;
    complianceGraceEndsAt?: Date | null;
  }) {
    const now = new Date();
    const startedAt = facility.subscriptionStartedAt ?? facility.createdAt;
    const paidThrough =
      facility.subscriptionPaidThrough ?? addMonths(startedAt, 1);
    const monthlyFee = Number(facility.subscriptionMonthlyFee || MONTHLY_FEE);
    const secondsRemaining = Math.floor((paidThrough.getTime() - now.getTime()) / 1000);
    const daysRemaining = secondsRemaining / 86400;
    const locked = secondsRemaining <= 0 || facility.subscriptionStatus === 'LOCKED';
    const accessStatus = computeFacilityAccessStatus(facility);
    const warningLevel = locked
      ? 'LOCKED'
      : daysRemaining <= 3
        ? 'RED'
        : daysRemaining <= 10
          ? 'YELLOW'
          : 'CLEAR';

    return {
      facilityId: facility.id,
      monthlyFee,
      startedAt,
      paidThrough,
      statusCode: locked ? 'LOCKED' : (facility.subscriptionStatus || 'ACTIVE'),
      warningLevel,
      locked,
      loginBlocked: accessStatus.subscriptionLoginBlocked,
      loginBlockedAt: accessStatus.subscriptionLoginBlockedAt,
      complianceWriteLocked: accessStatus.complianceWriteLocked,
      complianceGraceEndsAt: accessStatus.complianceGraceEndsAt,
      lockReason: accessStatus.lockReason,
      canDismiss: warningLevel === 'YELLOW',
      daysRemaining: Math.max(daysRemaining, 0),
      secondsRemaining: Math.max(secondsRemaining, 0),
    };
  }

  async getFacilityStatus(facilityId: number) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) throw new NotFoundException('Facility not found');

    return this.computeStatus(facility);
  }

  async getMyStatus(user: RequestUser) {
    if (!user.homeFacilityId) {
      return null;
    }

    return this.getFacilityStatus(user.homeFacilityId);
  }

  async findPlatform() {
    const facilities = await this.prisma.facility.findMany({
      include: {
        subscriptionPayments: {
          orderBy: { paidAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    return facilities.map((facility) => ({
      ...facility,
      subscription: this.computeStatus(facility),
    }));
  }

  async recordPayment(dto: RecordFacilitySubscriptionPaymentDto, user: RequestUser) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: dto.facilityId },
    });

    if (!facility) throw new NotFoundException('Facility not found');

    const monthlyFee = Number(facility.subscriptionMonthlyFee || MONTHLY_FEE);
    const monthsCovered = Number(dto.amount || 0) / monthlyFee;
    const daysCovered = Math.max(1, Math.round(monthsCovered * 30));
    const currentStatus = this.computeStatus(facility);
    const base =
      currentStatus.paidThrough.getTime() > Date.now()
        ? currentStatus.paidThrough
        : new Date();
    const paidThrough = addDays(base, daysCovered);
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    const payment = await this.prisma.facilitySubscriptionPayment.create({
      data: {
        paymentNumber: this.paymentNumber(),
        facilityId: facility.id,
        amount: dto.amount,
        monthlyFee,
        monthsCovered,
        paidFrom: base,
        paidThrough,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        recordedByUserId: user.userId,
        paidAt,
      },
      include: { facility: true },
    });

    const updatedFacility = await this.prisma.facility.update({
      where: { id: facility.id },
      data: {
        subscriptionStartedAt: facility.subscriptionStartedAt ?? facility.createdAt,
        subscriptionPaidThrough: paidThrough,
        subscriptionStatus: 'ACTIVE',
        subscriptionLockedAt: null,
      },
    });

    await this.auditLogService.create({
      moduleName: 'SUBSCRIPTION',
      actionName: 'RECORD_FACILITY_PAYMENT',
      entityType: 'FACILITY_SUBSCRIPTION_PAYMENT',
      entityId: String(payment.id),
      description: `Recorded subscription payment ${payment.paymentNumber} for ${facility.name}`,
      facilityId: facility.id,
      actorUserId: user.userId,
      afterData: JSON.stringify({ payment, subscription: this.computeStatus(updatedFacility) }),
    });

    return {
      payment,
      facility: updatedFacility,
      subscription: this.computeStatus(updatedFacility),
    };
  }
}
