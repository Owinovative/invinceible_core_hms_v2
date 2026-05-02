import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateShaClaimDto } from './dto/create-sha-claim.dto';
import { UpdateShaClaimDto } from './dto/update-sha-claim.dto';

const SHA_CLAIM_INCLUDE = {
  facility: true,
  branch: true,
  patient: true,
  invoice: true,
  createdBy: true,
} satisfies Prisma.ShaClaimInclude;

@Injectable()
export class ShaClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.shaClaim.findMany({
      where: scope,
      include: SHA_CLAIM_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });
  }

  async getSummary(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);
    const claims = await this.prisma.shaClaim.findMany({
      where: scope,
      select: {
        statusCode: true,
        claimedAmount: true,
        approvedAmount: true,
        paidAmount: true,
        rejectedAmount: true,
      },
    });

    const summary = claims.reduce(
      (acc, claim) => {
        acc.count += 1;
        acc.claimedAmount += claim.claimedAmount;
        acc.approvedAmount += claim.approvedAmount;
        acc.paidAmount += claim.paidAmount;
        acc.rejectedAmount += claim.rejectedAmount;
        acc.byStatus[claim.statusCode] = (acc.byStatus[claim.statusCode] ?? 0) + 1;
        return acc;
      },
      {
        count: 0,
        claimedAmount: 0,
        approvedAmount: 0,
        paidAmount: 0,
        rejectedAmount: 0,
        byStatus: {} as Record<string, number>,
      },
    );

    return {
      ...summary,
      outstandingAmount: Math.max(summary.approvedAmount - summary.paidAmount, 0),
    };
  }

  async create(dto: CreateShaClaimDto, user: RequestUser) {
    this.scopeService.assertBranchAccess(user, dto.facilityId, dto.branchId);

    const [facility, patient, invoice] = await Promise.all([
      this.prisma.facility.findUnique({ where: { id: dto.facilityId } }),
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
      dto.invoiceId
        ? this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } })
        : Promise.resolve(null),
    ]);

    if (!facility) throw new NotFoundException('Facility not found');
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.facilityId !== dto.facilityId) {
      throw new BadRequestException('Patient does not belong to the selected facility');
    }
    if (invoice && invoice.patientId !== dto.patientId) {
      throw new BadRequestException('Invoice does not belong to the selected patient');
    }
    if (invoice && invoice.facilityId !== dto.facilityId) {
      throw new BadRequestException('Invoice does not belong to the selected facility');
    }

    const claim = await this.prisma.$transaction(async (tx) => {
      const lockedFacility = await tx.facility.findUnique({
        where: { id: dto.facilityId },
      });

      if (!lockedFacility) throw new NotFoundException('Facility not found');

      const nextNumber =
        lockedFacility.shaClaimNextNumber ||
        lockedFacility.shaClaimStartNumber ||
        1;
      const prefix = (lockedFacility.shaFidCode || lockedFacility.code || 'SHA')
        .replace(/[^a-z0-9-]/gi, '')
        .toUpperCase();
      const claimNumber = `${prefix}-${String(nextNumber).padStart(6, '0')}`;

      await tx.facility.update({
        where: { id: dto.facilityId },
        data: { shaClaimNextNumber: nextNumber + 1 },
      });

      return tx.shaClaim.create({
        data: {
          claimNumber,
          facilityId: dto.facilityId,
          branchId: dto.branchId,
          patientId: dto.patientId,
          invoiceId: dto.invoiceId,
          createdByStaffId: user.staffId ?? null,
          fidCode: lockedFacility.shaFidCode ?? null,
          memberNumber: dto.memberNumber,
          diagnosisCode: dto.diagnosisCode,
          diagnosisText: dto.diagnosisText,
          servicePeriodStart: dto.servicePeriodStart
            ? new Date(dto.servicePeriodStart)
            : null,
          servicePeriodEnd: dto.servicePeriodEnd
            ? new Date(dto.servicePeriodEnd)
            : null,
          claimedAmount: dto.claimedAmount ?? invoice?.totalAmount ?? 0,
          notes: dto.notes,
          metadata: {
            source: 'INVINCEIBLE_CORE_HMS',
            invoiceNumber: invoice?.invoiceNumber ?? null,
          },
        },
        include: SHA_CLAIM_INCLUDE,
      });
    });

    await this.auditLogService.create({
      moduleName: 'SHA',
      actionName: 'CREATE_SHA_CLAIM',
      entityType: 'SHA_CLAIM',
      entityId: String(claim.id),
      description: `Created SHA claim ${claim.claimNumber}`,
      facilityId: claim.facilityId,
      branchId: claim.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      afterData: JSON.stringify(claim),
    });

    return claim;
  }

  async update(id: number, dto: UpdateShaClaimDto, user: RequestUser) {
    const claim = await this.prisma.shaClaim.findUnique({
      where: { id },
      include: SHA_CLAIM_INCLUDE,
    });

    if (!claim) throw new NotFoundException(`SHA claim with id ${id} not found`);
    this.scopeService.assertBranchAccess(user, claim.facilityId, claim.branchId);

    const now = new Date();
    const nextStatus = dto.statusCode ?? claim.statusCode;
    const data: Prisma.ShaClaimUpdateInput = {
      statusCode: nextStatus,
      branch: dto.branchId === undefined ? undefined : dto.branchId === null ? { disconnect: true } : { connect: { id: dto.branchId } },
      invoice: dto.invoiceId === undefined ? undefined : dto.invoiceId === null ? { disconnect: true } : { connect: { id: dto.invoiceId } },
      memberNumber: dto.memberNumber,
      diagnosisCode: dto.diagnosisCode,
      diagnosisText: dto.diagnosisText,
      servicePeriodStart: dto.servicePeriodStart ? new Date(dto.servicePeriodStart) : undefined,
      servicePeriodEnd: dto.servicePeriodEnd ? new Date(dto.servicePeriodEnd) : undefined,
      claimedAmount: dto.claimedAmount,
      approvedAmount: dto.approvedAmount,
      paidAmount: dto.paidAmount,
      rejectedAmount: dto.rejectedAmount,
      rejectionReason: dto.rejectionReason,
      notes: dto.notes,
      submittedAt:
        nextStatus === 'SUBMITTED' && !claim.submittedAt ? now : undefined,
      approvedAt:
        nextStatus === 'APPROVED' && !claim.approvedAt ? now : undefined,
      paidAt: nextStatus === 'PAID' && !claim.paidAt ? now : undefined,
    };

    const updated = await this.prisma.shaClaim.update({
      where: { id },
      data,
      include: SHA_CLAIM_INCLUDE,
    });

    await this.auditLogService.create({
      moduleName: 'SHA',
      actionName: 'UPDATE_SHA_CLAIM',
      entityType: 'SHA_CLAIM',
      entityId: String(updated.id),
      description: `Updated SHA claim ${updated.claimNumber}`,
      facilityId: updated.facilityId,
      branchId: updated.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      beforeData: JSON.stringify(claim),
      afterData: JSON.stringify(updated),
    });

    return updated;
  }
}
