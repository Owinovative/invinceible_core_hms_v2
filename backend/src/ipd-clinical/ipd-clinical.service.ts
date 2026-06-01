import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IpdService } from '../ipd/ipd.service';
import { StaffService } from '../staff/staff.service';
import { CreateIpdProgressNoteDto } from './dto/create-ipd-progress-note.dto';
import { CreateTreatmentChartEntryDto } from './dto/create-treatment-chart-entry.dto';
import { CreateIpdVitalRecordDto } from './dto/create-ipd-vital-record.dto';
import { CreateIpdDoctorReviewDto } from './dto/create-ipd-doctor-review.dto';
import { CreateIpdDischargeSummaryDto } from './dto/create-ipd-discharge-summary.dto';
import { AdministerIpdMedicineDto } from './dto/administer-ipd-medicine.dto';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { SafeLoggerService } from '../resilience/safe-logger.service';
import {
  addKeyValueGrid,
  addCompactParagraph,
  addCompactTable,
  addSectionTitle,
  addSignatureBlock,
  createHospitalPdfBuffer,
  formatPdfDate,
  patientName,
  staffName,
  textOrDash,
} from '../common/pdf/hospital-pdf';

@Injectable()
export class IpdClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ipdService: IpdService,
    private readonly staffService: StaffService,
    private readonly safeLogger: SafeLoggerService,
  ) {}

  async createProgressNote(dto: CreateIpdProgressNoteDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.recordedByStaffId) {
      await this.staffService.findOne(dto.recordedByStaffId);
    }

    return this.prisma.ipdProgressNote.create({
      data: {
        admissionId: dto.admissionId,
        recordedByStaffId: dto.recordedByStaffId,
        noteType: dto.noteType,
        noteText: dto.noteText,
      },
      include: {
        admission: true,
        recordedBy: true,
      },
    });
  }

  async getProgressNotesByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdProgressNote.findMany({
      where: { admissionId },
      include: {
        recordedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVitalRecord(dto: CreateIpdVitalRecordDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.recordedByStaffId) {
      await this.staffService.findOne(dto.recordedByStaffId);
    }

    return this.prisma.ipdVitalRecord.create({
      data: {
        admissionId: dto.admissionId,
        recordedByStaffId: dto.recordedByStaffId,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
        temperatureC: dto.temperatureC,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        pulseRate: dto.pulseRate,
        respiratoryRate: dto.respiratoryRate,
        oxygenSaturation: dto.oxygenSaturation,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bmi: dto.bmi,
        painScore: dto.painScore,
        notes: dto.notes,
      },
      include: {
        admission: true,
        recordedBy: true,
      },
    });
  }

  async getVitalRecordsByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdVitalRecord.findMany({
      where: { admissionId },
      include: {
        recordedBy: true,
      },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async createDoctorReview(dto: CreateIpdDoctorReviewDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.reviewedByStaffId) {
      await this.staffService.findOne(dto.reviewedByStaffId);
    }

    return this.prisma.ipdDoctorReview.create({
      data: {
        admissionId: dto.admissionId,
        reviewedByStaffId: dto.reviewedByStaffId,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        chiefComplaint: dto.chiefComplaint,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        reviewNotes: dto.reviewNotes,
      },
      include: {
        admission: true,
        reviewedBy: true,
      },
    });
  }

  async getDoctorReviewsByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdDoctorReview.findMany({
      where: { admissionId },
      include: {
        reviewedBy: true,
      },
      orderBy: { reviewDate: 'desc' },
    });
  }

  async createTreatmentEntry(dto: CreateTreatmentChartEntryDto) {
    await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.orderedByStaffId) {
      await this.staffService.findOne(dto.orderedByStaffId);
    }

    if (dto.administeredByStaffId) {
      await this.staffService.findOne(dto.administeredByStaffId);
    }

    return this.prisma.treatmentChartEntry.create({
      data: {
        admissionId: dto.admissionId,
        orderedByStaffId: dto.orderedByStaffId,
        administeredByStaffId: dto.administeredByStaffId,
        treatmentType: dto.treatmentType,
        treatmentName: dto.treatmentName,
        dosage: dto.dosage,
        route: dto.route,
        frequency: dto.frequency,
        statusCode: dto.statusCode ?? 'PLANNED',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        administeredAt: dto.administeredAt
          ? new Date(dto.administeredAt)
          : undefined,
        notes: dto.notes,
      },
      include: {
        admission: true,
        orderedBy: true,
        administeredBy: true,
      },
    });
  }

  async getTreatmentChartByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.treatmentChartEntry.findMany({
      where: { admissionId },
      include: {
        orderedBy: true,
        administeredBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async administerTreatment(entryId: number, administeredByStaffId?: number) {
    const entry = await this.prisma.treatmentChartEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(
        `Treatment chart entry with id ${entryId} not found`,
      );
    }

    if (administeredByStaffId) {
      await this.staffService.findOne(administeredByStaffId);
    }

    return this.prisma.treatmentChartEntry.update({
      where: { id: entryId },
      data: {
        statusCode: 'ADMINISTERED',
        administeredAt: new Date(),
        administeredByStaffId,
      },
      include: {
        admission: true,
        orderedBy: true,
        administeredBy: true,
      },
    });
  }

  async administerAdmissionMedicine(
    admissionId: number,
    dto: AdministerIpdMedicineDto,
    user: RequestUser,
  ) {
    const admission = await this.ipdService.getAdmissionByIdScoped(
      admissionId,
      user,
    );

    if (!admission.branchId) {
      throw new BadRequestException(
        'Admission has no branch assigned. IPD medicine administration requires branch stock.',
      );
    }

    const staff = await this.prisma.staff.findFirst({
      where: { userId: user.userId, isActive: true },
    });

    if (!staff) {
      throw new BadRequestException(
        'Logged in user is not linked to an active staff profile.',
      );
    }

    const stock = await this.prisma.branchMedicineStock.findFirst({
      where: {
        facilityId: admission.facilityId,
        branchId: admission.branchId,
        medicineId: dto.medicineId,
        isActive: true,
      },
      include: { medicine: true, branch: true },
    });

    if (!stock) {
      throw new NotFoundException(
        `No branch stock found for medicine ${dto.medicineId} in this IPD branch.`,
      );
    }

    if (stock.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient IPD stock for ${stock.medicine.name}. Available: ${stock.stockQuantity}, required: ${dto.quantity}`,
      );
    }

    const startedAt = Date.now();
    const treatmentEntry = await this.prisma.$transaction(async (tx) => {
      const reservedStock = await tx.branchMedicineStock.updateMany({
        where: {
          id: stock.id,
          stockQuantity: { gte: dto.quantity },
        },
        data: { stockQuantity: { decrement: dto.quantity } },
      });

      if (reservedStock.count !== 1) {
        throw new BadRequestException(
          `Insufficient IPD stock for ${stock.medicine.name}. Another action may have used the stock first.`,
        );
      }

      const entry = await tx.treatmentChartEntry.create({
        data: {
          admissionId,
          treatmentType: 'MEDICINE',
          treatmentName: stock.medicine.name,
          dosage: dto.dosage,
          route: dto.route,
          frequency: dto.frequency,
          statusCode: 'ADMINISTERED',
          administeredAt: new Date(),
          administeredByStaffId: staff.id,
          notes: [
            dto.notes,
            `Quantity administered from IPD/ward stock: ${dto.quantity}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
        include: {
          admission: true,
          orderedBy: true,
          administeredBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          moduleName: 'IPD',
          actionName: 'IPD_MEDICINE_ADMINISTERED',
          entityType: 'TREATMENT_CHART_ENTRY',
          entityId: String(entry.id),
          facilityId: admission.facilityId,
          branchId: admission.branchId ?? undefined,
          actorUserId: user.userId,
          actorStaffId: staff.id,
          afterData: JSON.stringify({
            admissionId,
            medicineId: dto.medicineId,
            quantity: dto.quantity,
            stockId: stock.id,
          }),
        },
      });

      return entry;
    });

    this.safeLogger.info('IPD medicine administration completed', {
      admissionId,
      treatmentEntryId: treatmentEntry.id,
      medicineId: dto.medicineId,
      quantity: dto.quantity,
      facilityId: admission.facilityId,
      branchId: admission.branchId,
      actorUserId: user.userId,
      actorStaffId: staff.id,
      durationMs: Date.now() - startedAt,
    });

    return treatmentEntry;
  }

  async createOrUpdateDischargeSummary(dto: CreateIpdDischargeSummaryDto) {
    const admission = await this.ipdService.getAdmissionById(dto.admissionId);

    if (dto.dischargedByStaffId) {
      await this.staffService.findOne(dto.dischargedByStaffId);
    }

    const saved = await this.prisma.ipdDischargeSummary.upsert({
      where: {
        admissionId: dto.admissionId,
      },
      update: {
        dischargeDiagnosis: dto.dischargeDiagnosis,
        hospitalCourse: dto.hospitalCourse,
        conditionOnDischarge: dto.conditionOnDischarge,
        dischargeMedications: dto.dischargeMedications,
        followUpInstructions: dto.followUpInstructions,
        dischargedByStaffId: dto.dischargedByStaffId,
        dischargeDate: dto.dischargeDate
          ? new Date(dto.dischargeDate)
          : undefined,
      },
      create: {
        admissionId: dto.admissionId,
        dischargeDiagnosis: dto.dischargeDiagnosis,
        hospitalCourse: dto.hospitalCourse,
        conditionOnDischarge: dto.conditionOnDischarge,
        dischargeMedications: dto.dischargeMedications,
        followUpInstructions: dto.followUpInstructions,
        dischargedByStaffId: dto.dischargedByStaffId,
        dischargeDate: dto.dischargeDate
          ? new Date(dto.dischargeDate)
          : undefined,
      },
      include: {
        admission: true,
        dischargedBy: true,
      },
    });

    if ((admission.statusCode || '').toUpperCase() === 'DISCHARGED') {
      await this.prisma.admission.update({
        where: { id: dto.admissionId },
        data: {
          dischargedAt: saved.dischargeDate,
        },
      });
    }

    return saved;
  }

  async getDischargeSummaryByAdmission(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.ipdDischargeSummary.findUnique({
      where: { admissionId },
      include: {
        dischargedBy: true,
      },
    });
  }

  async getAdmissionLabOrders(admissionId: number) {
    await this.ipdService.getAdmissionById(admissionId);

    return this.prisma.labOrder.findMany({
      where: { admissionId },
      include: {
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdmissionClinicalDashboard(admissionId: number) {
    const admission = await this.ipdService.getAdmissionById(admissionId);

    const progressNotes = await this.prisma.ipdProgressNote.findMany({
      where: { admissionId },
      include: { recordedBy: true },
      orderBy: { createdAt: 'desc' },
    });

    const vitalRecords = await this.prisma.ipdVitalRecord.findMany({
      where: { admissionId },
      include: { recordedBy: true },
      orderBy: { recordedAt: 'desc' },
    });

    const doctorReviews = await this.prisma.ipdDoctorReview.findMany({
      where: { admissionId },
      include: { reviewedBy: true },
      orderBy: { reviewDate: 'desc' },
    });

    const treatmentChart = await this.prisma.treatmentChartEntry.findMany({
      where: { admissionId },
      include: {
        orderedBy: true,
        administeredBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const dischargeSummary = await this.prisma.ipdDischargeSummary.findUnique({
      where: { admissionId },
      include: {
        dischargedBy: true,
      },
    });

    const labOrders = await this.prisma.labOrder.findMany({
      where: { admissionId },
      include: {
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      admission,
      doctorReviews,
      vitalRecords,
      progressNotes,
      treatmentChart,
      dischargeSummary,
      labOrders,
    };
  }

  async getMedicalSummaryPdf(admissionId: number, user: RequestUser) {
    const bundle = await this.getAdmissionDocumentBundle(admissionId, user);
    const latestReview = bundle.doctorReviews[0];
    const latestVital = bundle.vitalRecords[0];
    const labRows = bundle.labOrders.flatMap((order) =>
      (order.items ?? []).map((item) => ({
        orderNumber: order.orderNumber,
        testName: item.test?.testName,
        status: item.status,
        result:
          item.results?.[0]?.resultValue || item.results?.[0]?.remarks || null,
        recordedAt: item.results?.[0]?.recordedAt ?? null,
      })),
    );

    return createHospitalPdfBuffer(
      {
        title: 'Medical Summary',
        subtitle: bundle.admission.admissionNumber,
        reference: bundle.admission.statusCode,
        facility: bundle.admission.facility,
        branch: bundle.admission.branch,
        compact: true,
        qrPayload: `/ipd-clinical/documents/admissions/${admissionId}/medical-summary.pdf`,
      },
      (doc) => {
        this.addAdmissionIdentity(doc, bundle.admission);

        addSectionTitle(doc, 'Clinical overview');
        addCompactParagraph(doc, 'Admission reason', bundle.admission.admissionReason);
        addCompactParagraph(
          doc,
          'Consultation summary',
          [
            `Chief complaint: ${textOrDash(bundle.admission.consultation?.chiefComplaint)}`,
            `History: ${textOrDash(bundle.admission.consultation?.historyOfPresenting)}`,
            `Examination: ${textOrDash(bundle.admission.consultation?.examinationFindings)}`,
            `Diagnosis: ${textOrDash(bundle.admission.consultation?.diagnosis)}`,
            `Treatment plan: ${textOrDash(bundle.admission.consultation?.treatmentPlan)}`,
          ].join('\n'),
        );

        addKeyValueGrid(doc, [
          {
            label: 'Latest review date',
            value: formatPdfDate(latestReview?.reviewDate),
          },
          { label: 'Reviewed by', value: staffName(latestReview?.reviewedBy) },
          { label: 'Latest temperature', value: latestVital?.temperatureC },
          {
            label: 'Latest BP',
            value:
              latestVital?.systolicBp || latestVital?.diastolicBp
                ? `${textOrDash(latestVital?.systolicBp)}/${textOrDash(
                    latestVital?.diastolicBp,
                  )}`
                : null,
          },
        ]);
        addCompactParagraph(doc, 'Latest assessment', latestReview?.assessment);
        addCompactParagraph(doc, 'Latest plan', latestReview?.plan);

        addSectionTitle(doc, 'Recent progress notes');
        addCompactTable(
          doc,
          [
            {
              header: 'Recorded',
              width: 110,
              render: (item) => formatPdfDate(item.createdAt),
            },
            { header: 'Type', width: 85, render: (item) => item.noteType },
            { header: 'Note', width: 210, render: (item) => item.noteText },
            {
              header: 'Staff',
              width: 90,
              render: (item) => staffName(item.recordedBy),
            },
          ],
          bundle.progressNotes.slice(0, 8),
          'No progress notes recorded.',
        );

        addSectionTitle(doc, 'Laboratory summary');
        addCompactTable(
          doc,
          [
            { header: 'Order', width: 88, render: (item) => item.orderNumber },
            { header: 'Test', width: 132, render: (item) => item.testName },
            { header: 'Status', width: 64, render: (item) => item.status },
            { header: 'Result', width: 146, render: (item) => item.result },
            {
              header: 'Recorded',
              width: 65,
              render: (item) => formatPdfDate(item.recordedAt),
            },
          ],
          labRows,
          'No lab results recorded.',
        );
        addSignatureBlock(doc, [
          {
            label: 'Prepared by',
            value: staffName(latestReview?.reviewedBy ?? bundle.admission.admittedBy),
          },
          { label: 'Designation', value: 'Clinical team' },
          { label: 'Generated', value: new Date() },
        ]);
      },
    );
  }

  async getDischargeSummaryPdf(admissionId: number, user: RequestUser) {
    const bundle = await this.getAdmissionDocumentBundle(admissionId, user);
    const summary = bundle.dischargeSummary;

    return createHospitalPdfBuffer(
      {
        title: 'Discharge Summary',
        subtitle: bundle.admission.admissionNumber,
        reference: bundle.admission.statusCode,
        facility: bundle.admission.facility,
        branch: bundle.admission.branch,
        compact: true,
        qrPayload: `/ipd-clinical/documents/admissions/${admissionId}/discharge-summary.pdf`,
      },
      (doc) => {
        this.addAdmissionIdentity(doc, bundle.admission);

        addSectionTitle(doc, 'Discharge details');
        addKeyValueGrid(doc, [
          {
            label: 'Discharge date',
            value: formatPdfDate(
              summary?.dischargeDate ?? bundle.admission.dischargedAt,
            ),
          },
          { label: 'Discharged by', value: staffName(summary?.dischargedBy) },
          {
            label: 'Condition on discharge',
            value: summary?.conditionOnDischarge,
          },
          { label: 'Status', value: bundle.admission.statusCode },
        ]);
        addCompactParagraph(doc, 'Discharge diagnosis', summary?.dischargeDiagnosis);
        addCompactParagraph(doc, 'Hospital course', summary?.hospitalCourse);
        addCompactParagraph(
          doc,
          'Discharge medications',
          summary?.dischargeMedications,
        );
        addCompactParagraph(
          doc,
          'Follow-up instructions',
          summary?.followUpInstructions,
        );
        addSignatureBlock(doc, [
          {
            label: 'Prepared by',
            value: staffName(summary?.dischargedBy ?? bundle.admission.admittedBy),
          },
          { label: 'Designation', value: 'Discharging clinician' },
          { label: 'Generated', value: new Date() },
        ]);
      },
    );
  }

  async getTreatmentChartPdf(admissionId: number, user: RequestUser) {
    const bundle = await this.getAdmissionDocumentBundle(admissionId, user);

    return createHospitalPdfBuffer(
      {
        title: 'Inpatient Treatment Chart',
        subtitle: bundle.admission.admissionNumber,
        reference: bundle.admission.statusCode,
        facility: bundle.admission.facility,
        branch: bundle.admission.branch,
        compact: true,
        qrPayload: `/ipd-clinical/documents/admissions/${admissionId}/treatment-chart.pdf`,
      },
      (doc) => {
        this.addAdmissionIdentity(doc, bundle.admission);

        addSectionTitle(doc, 'Treatment chart');
        addCompactTable(
          doc,
          [
            {
              header: 'Treatment',
              width: 135,
              render: (item) => item.treatmentName,
            },
            { header: 'Dosage', width: 60, render: (item) => item.dosage },
            { header: 'Route', width: 55, render: (item) => item.route },
            {
              header: 'Frequency',
              width: 65,
              render: (item) => item.frequency,
            },
            { header: 'Status', width: 75, render: (item) => item.statusCode },
            {
              header: 'Scheduled/Admin',
              width: 105,
              render: (item) =>
                `${formatPdfDate(item.scheduledAt)}\n${formatPdfDate(
                  item.administeredAt,
                )}`,
            },
          ],
          bundle.treatmentChart,
          'No treatment chart entries recorded.',
        );

        addSectionTitle(doc, 'Vital chart');
        addCompactTable(
          doc,
          [
            {
              header: 'Recorded',
              width: 115,
              render: (item) => formatPdfDate(item.recordedAt),
            },
            { header: 'Temp', width: 55, render: (item) => item.temperatureC },
            {
              header: 'BP',
              width: 65,
              render: (item) =>
                item.systolicBp || item.diastolicBp
                  ? `${textOrDash(item.systolicBp)}/${textOrDash(
                      item.diastolicBp,
                    )}`
                  : null,
            },
            { header: 'Pulse', width: 55, render: (item) => item.pulseRate },
            { header: 'RR', width: 45, render: (item) => item.respiratoryRate },
            {
              header: 'SpO2',
              width: 55,
              render: (item) => item.oxygenSaturation,
            },
            { header: 'Notes', width: 105, render: (item) => item.notes },
          ],
          bundle.vitalRecords,
          'No vital records recorded.',
        );
        addSignatureBlock(doc, [
          { label: 'Prepared by', value: staffName(bundle.admission.admittedBy) },
          { label: 'Designation', value: 'Ward clinical team' },
          { label: 'Generated', value: new Date() },
        ]);
      },
    );
  }

  private async getAdmissionDocumentBundle(
    admissionId: number,
    user: RequestUser,
  ) {
    const admission = await this.ipdService.getAdmissionByIdScoped(
      admissionId,
      user,
    );

    const [
      progressNotes,
      vitalRecords,
      doctorReviews,
      treatmentChart,
      dischargeSummary,
      labOrders,
    ] = await Promise.all([
      this.prisma.ipdProgressNote.findMany({
        where: { admissionId },
        include: { recordedBy: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ipdVitalRecord.findMany({
        where: { admissionId },
        include: { recordedBy: true },
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.ipdDoctorReview.findMany({
        where: { admissionId },
        include: { reviewedBy: true },
        orderBy: { reviewDate: 'desc' },
      }),
      this.prisma.treatmentChartEntry.findMany({
        where: { admissionId },
        include: {
          orderedBy: true,
          administeredBy: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ipdDischargeSummary.findUnique({
        where: { admissionId },
        include: { dischargedBy: true },
      }),
      this.prisma.labOrder.findMany({
        where: { admissionId },
        include: {
          requestedBy: true,
          items: {
            include: {
              test: true,
              results: {
                orderBy: { recordedAt: 'desc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      admission,
      progressNotes,
      vitalRecords,
      doctorReviews,
      treatmentChart,
      dischargeSummary,
      labOrders,
    };
  }

  private addAdmissionIdentity(
    doc: PDFKit.PDFDocument,
    admission: Awaited<ReturnType<IpdService['getAdmissionById']>>,
  ) {
    addSectionTitle(doc, 'Patient and admission details');
    addKeyValueGrid(doc, [
      { label: 'Patient', value: patientName(admission.patient) },
      { label: 'Patient number', value: admission.patient?.patientNumber },
      { label: 'Phone', value: admission.patient?.phonePrimary },
      { label: 'Gender', value: admission.patient?.gender },
      { label: 'Admission number', value: admission.admissionNumber },
      { label: 'Status', value: admission.statusCode },
      { label: 'Admitted at', value: formatPdfDate(admission.admittedAt) },
      { label: 'Discharged at', value: formatPdfDate(admission.dischargedAt) },
      { label: 'Ward', value: admission.ward?.name },
      { label: 'Bed', value: admission.bed?.bedNumber },
      { label: 'Admitted by', value: staffName(admission.admittedBy) },
      { label: 'Branch', value: admission.branch?.name },
    ]);
  }
}
