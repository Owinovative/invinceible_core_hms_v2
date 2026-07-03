import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BillingService } from '../billing/billing.service';
import { DhaService } from '../integration/dha/dha.service';
import { IntegrationLoggerService } from '../integration/integration-logger.service';
import { CreateShaClaimDto } from './dto/create-sha-claim.dto';
import { UpdateShaClaimDto } from './dto/update-sha-claim.dto';
import {
  addCompactDefinitionList,
  addCompactParagraph,
  addCompactTable,
  addSectionTitle,
  createHospitalPdfBuffer,
  ensureRoom,
  formatPdfDate,
  formatPdfMoney,
  loadLogoBuffer,
  patientName,
} from '../common/pdf/hospital-pdf';

const SHA_CLAIM_INCLUDE = {
  facility: true,
  branch: true,
  patient: true,
  invoice: true,
  createdBy: true,
  payments: true,
} satisfies Prisma.ShaClaimInclude;

@Injectable()
export class ShaClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly auditLogService: AuditLogService,
    private readonly billingService: BillingService,
    private readonly dhaService: DhaService,
    private readonly integrationLoggerService: IntegrationLoggerService,
  ) {}

  /**
   * Single submission pathway: the durable outbound queue owned by
   * DhaService. The former synchronous ClaimsIntegrationService call was
   * removed — running both paths submitted every claim to the SHA
   * platform twice (audit finding: CRITICAL duplicate-claim risk).
   * Delivery, retries with backoff, and dead-lettering are handled by the
   * integration queue; failures here must never break local claim work.
   */
  private async triggerDhaClaimSubmission(claimId: number, user?: RequestUser) {
    try {
      await this.dhaService.onShaClaimSubmitted(claimId, {
        actorUserId: user?.userId,
        actorStaffId: user?.staffId ?? undefined,
      });
    } catch (error) {
      this.integrationLoggerService.error(
        'Failed to queue SHA claim for DHA submission',
        {
          error,
          claimId,
          actorUserId: user?.userId,
        },
      );
      // DhaService records the failure in its own transaction/audit trail.
    }
  }

  private resolveCoverageAmount(claim: {
    claimedAmount: number;
    approvedAmount: number;
    paidAmount: number;
  }) {
    return Number(
      claim.paidAmount || claim.approvedAmount || claim.claimedAmount || 0,
    );
  }

  private async syncClaimPayment(
    claim: {
      id: number;
      claimNumber: string;
      invoiceId: number | null;
      claimedAmount: number;
      approvedAmount: number;
      paidAmount: number;
      statusCode: string;
      rejectionReason?: string | null;
      createdByStaffId?: number | null;
    },
    user?: RequestUser,
  ) {
    if (!claim.invoiceId) return null;

    return this.billingService.applyShaCoveragePayment({
      shaClaimId: claim.id,
      claimNumber: claim.claimNumber,
      invoiceId: claim.invoiceId,
      amount: this.resolveCoverageAmount(claim),
      statusCode: claim.statusCode,
      rejectionReason: claim.rejectionReason,
      receivedByStaffId: user?.staffId ?? claim.createdByStaffId ?? null,
    });
  }

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
        payments: {
          select: {
            amount: true,
            statusCode: true,
          },
        },
      },
    });

    const summary = claims.reduce(
      (acc, claim) => {
        acc.count += 1;
        acc.claimedAmount += claim.claimedAmount;
        acc.approvedAmount += claim.approvedAmount;
        acc.paidAmount += claim.paidAmount;
        acc.rejectedAmount += claim.rejectedAmount;
        acc.coveredAmount += claim.payments
          .filter((payment) => payment.statusCode === 'COMPLETED')
          .reduce((sum, payment) => sum + payment.amount, 0);
        acc.byStatus[claim.statusCode] = (acc.byStatus[claim.statusCode] ?? 0) + 1;
        return acc;
      },
      {
        count: 0,
        claimedAmount: 0,
        approvedAmount: 0,
        paidAmount: 0,
        rejectedAmount: 0,
        coveredAmount: 0,
        byStatus: {} as Record<string, number>,
      },
    );

    return {
      ...summary,
      outstandingAmount: Math.max(summary.approvedAmount - summary.paidAmount, 0),
      lossAmount: summary.rejectedAmount,
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
          patientSignatureUrl: dto.patientSignatureUrl,
          facilitySignatureUrl: dto.facilitySignatureUrl,
          rubberStampUrl: dto.rubberStampUrl,
          metadata: {
            source: 'INVINCEIBLE_CORE_HMS',
            invoiceNumber: invoice?.invoiceNumber ?? null,
          },
        },
        include: SHA_CLAIM_INCLUDE,
      });
    });

    await this.syncClaimPayment(claim, user);

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
    const rejectedAmount =
      nextStatus === 'REJECTED'
        ? (dto.rejectedAmount ?? dto.claimedAmount ?? claim.claimedAmount)
        : dto.rejectedAmount;
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
      rejectedAmount,
      rejectionReason: dto.rejectionReason,
      notes: dto.notes,
      patientSignatureUrl: dto.patientSignatureUrl,
      facilitySignatureUrl: dto.facilitySignatureUrl,
      rubberStampUrl: dto.rubberStampUrl,
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

    await this.syncClaimPayment(updated, user);

    if (nextStatus === 'SUBMITTED' && !claim.submittedAt) {
      await this.triggerDhaClaimSubmission(updated.id, user);
    }

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

  async getClaimPdf(id: number, user: RequestUser) {
    const claim = await this.prisma.shaClaim.findUnique({
      where: { id },
      include: SHA_CLAIM_INCLUDE,
    });

    if (!claim) throw new NotFoundException(`SHA claim with id ${id} not found`);
    this.scopeService.assertBranchAccess(user, claim.facilityId, claim.branchId);

    const [patientSignature, facilitySignature, rubberStamp] =
      await Promise.all([
        loadLogoBuffer(claim.patientSignatureUrl),
        loadLogoBuffer(claim.facilitySignatureUrl),
        loadLogoBuffer(claim.rubberStampUrl),
      ]);

    const patient = claim.patient;
    const serviceStart = claim.servicePeriodStart || claim.createdAt;
    const serviceEnd = claim.servicePeriodEnd || claim.updatedAt;
    const visitType = claim.invoice?.admissionId ? 'Inpatient' : 'Outpatient';
    const currency = claim.facility?.currency || claim.branch?.currency || 'KES';
    const providerLine =
      [claim.facility?.address, claim.facility?.town, claim.facility?.county]
        .filter(Boolean)
        .join(', ') || claim.facility?.name;

    return createHospitalPdfBuffer(
      {
        title: 'SHA Claim Form',
        subtitle: claim.claimNumber,
        reference: claim.statusCode,
        verificationCode: claim.claimNumber,
        facility: claim.facility,
        branch: claim.branch,
        compact: true,
        qrPayload: `/sha-claims/${claim.id}/pdf`,
      },
      (doc) => {
        addCompactParagraph(
          doc,
          'Claim filing reminder',
          'Complete and verify all mandatory claim details before submission. This document is generated from facility, patient, invoice, diagnosis, and claim data recorded in the HMS.',
        );

        addSectionTitle(doc, 'Provider details');
        addCompactDefinitionList(
          doc,
          [
            { label: 'FID', value: claim.fidCode || claim.facility?.shaFidCode },
            { label: 'Facility', value: claim.facility?.name },
            { label: 'Branch', value: claim.branch?.name },
            { label: 'Address', value: providerLine },
          ],
          2,
        );

        addSectionTitle(doc, 'Patient details');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Patient', value: patientName(patient) },
            { label: 'Patient No.', value: patient?.patientNumber },
            { label: 'Member No.', value: claim.memberNumber },
            { label: 'Phone', value: patient?.phonePrimary },
            { label: 'Residence', value: patient?.occupation || providerLine },
            { label: 'Relationship', value: 'Self' },
          ],
          3,
        );

        addSectionTitle(doc, 'Visit and diagnosis');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Visit Type', value: visitType },
            { label: 'Service Start', value: serviceStart },
            { label: 'Service End', value: serviceEnd },
            { label: 'OP/IP No.', value: patient?.patientNumber },
            {
              label: 'Clinician',
              value: claim.createdBy
                ? `${claim.createdBy.firstName || ''} ${claim.createdBy.lastName || ''} ${claim.createdBy.clinicianRegistrationNumber || ''}`.trim()
                : '-',
            },
            { label: 'Diagnosis Code', value: claim.diagnosisCode },
          ],
          2,
        );
        addCompactParagraph(doc, 'Diagnosis', claim.diagnosisText);

        addSectionTitle(doc, 'Claim benefit line');
        addCompactTable(
          doc,
          [
            { header: 'Admission', width: 78, render: () => formatPdfDate(serviceStart).split(',')[0] },
            { header: 'Discharge', width: 78, render: () => formatPdfDate(serviceEnd).split(',')[0] },
            { header: 'Code', width: 64, render: () => claim.diagnosisCode || 'SHA' },
            { header: 'Description', width: 170, render: () => claim.diagnosisText || 'Claimed benefit' },
            {
              header: 'Bill',
              width: 68,
              render: () => formatPdfMoney(claim.invoice?.totalAmount ?? claim.claimedAmount, currency),
            },
            {
              header: 'Claim',
              width: 68,
              render: () => formatPdfMoney(claim.claimedAmount, currency),
            },
          ],
          [claim],
          'No benefit lines recorded.',
        );

        addCompactParagraph(
          doc,
          'Additional information',
          claim.notes ||
            'No additional information was recorded for this claim.',
        );

        addSectionTitle(doc, "Patient declaration");
        addCompactParagraph(
          doc,
          'Declaration',
          'I certify that I received the treatment stated above and that the claim details are correct to the best of my knowledge.',
        );
        this.drawImageSignatureLine(
          doc,
          'Patient / authorised person signature',
          patientSignature,
          patientName(patient),
        );

        addSectionTitle(doc, 'Hospital declaration');
        addCompactParagraph(
          doc,
          'Declaration',
          `The facility certifies that the information recorded is true, accurate, and complete. Claim amount requested: ${formatPdfMoney(claim.claimedAmount, currency)}.`,
        );
        this.drawImageSignatureLine(doc, 'Facility stamp', rubberStamp);
        this.drawImageSignatureLine(
          doc,
          'Facility authorised signature',
          facilitySignature,
          `Date: ${formatPdfDate(new Date()).split(',')[0]}`,
        );
      },
    );
  }

  private drawImageSignatureLine(
    doc: PDFKit.PDFDocument,
    label: string,
    image?: Buffer,
    caption?: string,
  ) {
    ensureRoom(doc, 52);
    const left = doc.page.margins.left;
    const y = doc.y + 4;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(7.8)
      .text(`${label}:`, left, y, { width: 180 });

    if (image) {
      try {
        doc.image(image, left + 184, y - 4, { fit: [120, 36] });
      } catch {
        doc
          .moveTo(left + 184, y + 24)
          .lineTo(left + 330, y + 24)
          .strokeColor('#94a3b8')
          .stroke();
      }
    } else {
      doc
        .moveTo(left + 184, y + 24)
        .lineTo(left + 330, y + 24)
        .strokeColor('#94a3b8')
        .stroke();
    }

    doc
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(7.5)
      .text(caption || '', left + 342, y + 8, { width: width - 342 });
    doc.y = y + 42;
  }
}
