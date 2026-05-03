import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BillingService } from '../billing/billing.service';
import { CreateShaClaimDto } from './dto/create-sha-claim.dto';
import { UpdateShaClaimDto } from './dto/update-sha-claim.dto';
import {
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
  ) {}

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

    const [logoBuffer, patientSignature, facilitySignature, rubberStamp] =
      await Promise.all([
        loadLogoBuffer(claim.facility?.logoUrl),
        loadLogoBuffer(claim.patientSignatureUrl),
        loadLogoBuffer(claim.facilitySignatureUrl),
        loadLogoBuffer(claim.rubberStampUrl),
      ]);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 24,
        bufferPages: true,
        info: {
          Title: `SHA Claim ${claim.claimNumber}`,
          Producer: 'Invinceible Core HMS',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const width = right - left;
      const patient = claim.patient;
      const nameParts = {
        lastName: patient?.lastName || '',
        firstName: patient?.firstName || '',
        middleName: patient?.middleName || '',
      };
      const serviceStart = claim.servicePeriodStart || claim.createdAt;
      const serviceEnd = claim.servicePeriodEnd || claim.updatedAt;
      const visitType = claim.invoice?.admissionId ? 'Inpatient' : 'Outpatient';
      const currency = claim.facility?.currency || claim.branch?.currency || 'KES';
      const providerLine = [
        claim.facility?.address,
        claim.facility?.town,
        claim.facility?.county,
      ]
        .filter(Boolean)
        .join(', ');

      const drawBox = (
        x: number,
        y: number,
        boxWidth: number,
        boxHeight: number,
        title: string,
      ) => {
        doc.rect(x, y, boxWidth, boxHeight).strokeColor('#94a3b8').stroke();
        doc
          .rect(x, y, boxWidth, 18)
          .fillAndStroke('#eaf6ff', '#94a3b8')
          .fillColor('#0b5f9e')
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(title.toUpperCase(), x + 6, y + 5, { width: boxWidth - 12 });
      };

      const line = (
        label: string,
        value: string | number | null | undefined,
        x: number,
        y: number,
        valueWidth = 210,
      ) => {
        doc
          .fillColor('#334155')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(label, x, y, { width: 145 })
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(String(value || '-').toUpperCase(), x + 145, y, {
            width: valueWidth,
          });
        doc
          .moveTo(x + 145, y + 11)
          .lineTo(x + 145 + valueWidth, y + 11)
          .lineWidth(0.5)
          .strokeColor('#cbd5e1')
          .stroke();
      };

      doc
        .fillColor('#0f172a')
        .font('Times-Bold')
        .fontSize(13)
        .text('REPUBLIC OF KENYA', left, 30, { width, align: 'center' })
        .fontSize(10)
        .text('SOCIAL HEALTH INSURANCE ACT, 2023', { align: 'center' })
        .text('SOCIAL HEALTH INSURANCE REGULATIONS, 2024', {
          align: 'center',
        })
        .fontSize(16)
        .text('CLAIMS', { align: 'center' });

      doc
        .roundedRect(left, 92, width, 58, 3)
        .fillAndStroke('#f8fafc', '#cbd5e1')
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('IMPORTANT CLAIM FILING REMINDERS', left + 10, 100)
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          'Use capital letters and tick the appropriate boxes. Submit this form with supporting documents within seven (7) days from discharge. All mandatory fields must be completed.',
          left + 10,
          114,
          { width: width - 20, lineGap: 1.2 },
        )
        .font('Helvetica-Bold')
        .text(
          'PLEASE BE COMPREHENSIVE AND ACCURATE. ERRORS OR OMISSIONS MAY DELAY CLAIM PAYMENTS.',
          left + 10,
          136,
          { width: width - 20 },
        );

      if (logoBuffer) {
        try {
          doc.image(logoBuffer, left, 34, { fit: [46, 46] });
        } catch {
          // Keep the statutory header clean if the uploaded logo cannot render.
        }
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#0f172a')
        .text(`CLAIM NO: ${claim.claimNumber}`, right - 210, 158, {
          width: 210,
          align: 'right',
        });

      let y = 180;
      drawBox(left, y, width, 74, 'Part I - Health Care Providers Details');
      line('1. Health Provider Identification Number:', claim.fidCode || claim.facility?.shaFidCode, left + 10, y + 28, width - 165);
      line('2. Name of Health Care Provider/Facility:', claim.facility?.name, left + 10, y + 47, width - 165);
      y += 86;

      drawBox(left, y, width, 128, 'Part II - Patient Details');
      line('Patient Last Name:', nameParts.lastName, left + 10, y + 28, 130);
      line('First Name:', nameParts.firstName, left + 300, y + 28, 100);
      line('Middle Name:', nameParts.middleName, left + 430, y + 28, 95);
      line('3. Social Health Authority Number:', claim.memberNumber, left + 10, y + 50, width - 165);
      line('4. Residence:', patient?.occupation || providerLine || claim.facility?.town, left + 10, y + 72, width - 165);
      line('5. Other Health Insurance:', 'NO', left + 10, y + 94, 110);
      line('6. Relationship to Principal:', 'SELF', left + 300, y + 94, 140);
      y += 140;

      drawBox(left, y, width, 190, 'Part III - Patient Visit Details');
      line('7. Referral Information:', 'NO', left + 10, y + 28, 100);
      line('Visit type:', visitType, left + 300, y + 28, 140);
      line('Visit/Admission Date:', formatPdfDate(serviceStart), left + 10, y + 50, 150);
      line('OP/IP No.:', patient?.patientNumber, left + 300, y + 50, 150);
      line('Discharge Date:', formatPdfDate(serviceEnd), left + 10, y + 72, 150);
      line(
        'Rendering Physician Name and Registration No:',
        claim.createdBy
          ? `${claim.createdBy.firstName || ''} ${claim.createdBy.lastName || ''} ${claim.createdBy.clinicianRegistrationNumber || ''}`.trim()
          : '-',
        left + 10,
        y + 94,
        width - 165,
      );
      line('Type of Accommodation:', claim.invoice?.admissionId ? 'WARD / INPATIENT' : 'N/A', left + 10, y + 116, width - 165);
      line('9. Patient Disposition upon discharge:', 'IMPROVED', left + 10, y + 138, width - 165);
      line('10. Referred Institution / Reason:', 'N/A', left + 10, y + 160, width - 165);
      y += 202;

      drawBox(left, y, width, 64, 'Diagnosis');
      line('11. Admission Diagnosis/es:', claim.diagnosisText, left + 10, y + 28, width - 165);
      line('12. ICD-11 Code/s:', claim.diagnosisCode, left + 10, y + 47, width - 165);
      y += 76;

      drawBox(left, y, width, 96, '14. SHA Health Benefits');
      const columns = [
        ['Date of Admission', 0, 78],
        ['Date of Discharge', 78, 78],
        ['Case Code', 156, 72],
        ['ICD 11 / Procedure Code', 228, 96],
        ['Description', 324, 120],
        ['Preauth No.', 444, 68],
        ['Bill Amount', 512, 76],
        ['Claim Amount', 588, 0],
      ] as const;
      const tableLeft = left + 8;
      const tableWidth = width - 16;
      const tableY = y + 26;
      doc.rect(tableLeft, tableY, tableWidth, 18).fillAndStroke('#dbeafe', '#94a3b8');
      columns.forEach(([label, offset, colWidth], index) => {
        const actualWidth = index === columns.length - 1 ? tableWidth - offset : colWidth;
        doc
          .fillColor('#0b5f9e')
          .font('Helvetica-Bold')
          .fontSize(6.8)
          .text(label, tableLeft + offset + 3, tableY + 4, {
            width: actualWidth - 6,
          });
      });
      doc.rect(tableLeft, tableY + 18, tableWidth, 30).strokeColor('#94a3b8').stroke();
      const rowValues = [
        formatPdfDate(serviceStart).split(',')[0],
        formatPdfDate(serviceEnd).split(',')[0],
        'SHA',
        claim.diagnosisCode || '-',
        claim.diagnosisText || 'Total',
        '-',
        formatPdfMoney(claim.invoice?.totalAmount ?? claim.claimedAmount, currency),
        formatPdfMoney(claim.claimedAmount, currency),
      ];
      columns.forEach(([, offset, colWidth], index) => {
        const actualWidth = index === columns.length - 1 ? tableWidth - offset : colWidth;
        doc
          .fillColor('#0f172a')
          .font(index > 5 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7)
          .text(rowValues[index], tableLeft + offset + 3, tableY + 26, {
            width: actualWidth - 6,
          });
      });
      y += 108;

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#334155')
        .text(
          'Any unforeseen circumstances or additional information that led to an increased length of stay for this admission:',
          left,
          y,
        )
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(claim.notes || '_ '.repeat(120), left, y + 13, {
          width,
          lineGap: 1,
        });
      y += 46;

      drawBox(left, y, width, 84, "Patient's / Authorised Person's Declaration");
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#0f172a')
        .text(
          'I certify that I have received the above treatment, and that the above information is correct. I understand that it is an offence to falsify information to obtain any benefit under the SHI Act 2023.',
          left + 10,
          y + 24,
          { width: width - 20 },
        );
      line('Names (Majina):', patientName(patient), left + 10, y + 50, 210);
      line('Date (Tarehe):', formatPdfDate(new Date()).split(',')[0], left + 360, y + 50, 120);
      doc.text('Signature (Sahihi):', left + 10, y + 68, { width: 120 });
      if (patientSignature) {
        try {
          doc.image(patientSignature, left + 118, y + 58, { fit: [105, 28] });
        } catch {
          doc.text('____________________', left + 118, y + 68);
        }
      } else {
        doc.text('____________________', left + 118, y + 68);
      }
      y += 96;

      drawBox(left, y, width, 104, 'E. Hospital Declaration');
      doc
        .font('Helvetica')
        .fontSize(7.4)
        .fillColor('#0f172a')
        .text(
          `This is to certify that to the best of my knowledge, the information contained above and any attachments provided is true, accurate, and complete. Please arrange to pay the hospital the sum of ${formatPdfMoney(claim.claimedAmount, currency)} being the claim amount for services rendered.`,
          left + 10,
          y + 24,
          { width: width - 20, lineGap: 1 },
        );
      doc.text('Facility stamp', left + 10, y + 62);
      if (rubberStamp) {
        try {
          doc.image(rubberStamp, left + 88, y + 50, { fit: [100, 42] });
        } catch {
          doc.rect(left + 88, y + 50, 100, 42).strokeColor('#94a3b8').stroke();
        }
      } else {
        doc.rect(left + 88, y + 50, 100, 42).strokeColor('#94a3b8').stroke();
      }
      doc.text('Signature:', left + 230, y + 69);
      if (facilitySignature) {
        try {
          doc.image(facilitySignature, left + 292, y + 57, { fit: [105, 28] });
        } catch {
          doc.text('________________________', left + 292, y + 69);
        }
      } else {
        doc.text('________________________', left + 292, y + 69);
      }
      doc.text(`Date: ${formatPdfDate(new Date()).split(',')[0]}`, left + 420, y + 69);
      y += 116;

      drawBox(left, y, width, 54, 'F. For Official Use Only');
      line('SHA Receiving Officer Name:', '', left + 10, y + 28, 170);
      line('Date:', '', left + 360, y + 28, 120);

      const range = doc.bufferedPageRange();
      for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
        doc.switchToPage(range.start + pageIndex);
        doc
          .font('Helvetica')
          .fontSize(6.8)
          .fillColor('#64748b')
          .text(
            'Notice: Any person/institution who knowingly files a false, incomplete, or misleading claim may be guilty of medical fraud punishable under law.',
            left,
            doc.page.height - 40,
            { width: width - 100 },
          )
          .text(`Page ${pageIndex + 1} of ${range.count}`, right - 80, doc.page.height - 40, {
            width: 80,
            align: 'right',
          });
      }

      doc.end();
    });
  }
}
