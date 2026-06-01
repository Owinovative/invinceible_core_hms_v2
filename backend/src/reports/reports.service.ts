import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../resilience/cache.service';
import {
  addCompactParagraph,
  addCompactTable,
  addMiniKeyValueGrid,
  addSectionTitle,
  addSignatureBlock,
  createHospitalPdfBuffer,
  formatPdfDate,
  patientName,
  staffName,
} from '../common/pdf/hospital-pdf';

function escapeCsvCell(value: unknown) {
  const text =
    value === null || value === undefined
      ? ''
      : typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ? String(value)
        : (JSON.stringify(value) ?? '');

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}
  public applyUserScopeToFilter(
    user: RequestUser,
    filter?: ReportFilterDto,
  ): ReportFilterDto {
    const next: ReportFilterDto = { ...(filter ?? {}) };

    if (user.roleCode === 'SUPER_ADMIN') {
      return next;
    }

    if (!user.homeFacilityId) {
      throw new ForbiddenException('User has no home facility');
    }

    if (!next.facilityId) {
      next.facilityId = user.homeFacilityId;
    }

    if (next.facilityId !== user.homeFacilityId) {
      throw new ForbiddenException('You cannot query another facility');
    }

    if (!user.canAccessAllBranchesInFacility) {
      const allowedBranchIds = new Set<number>([
        ...(user.allowedBranchIds ?? []),
        ...(user.homeBranchId ? [user.homeBranchId] : []),
      ]);

      if (next.branchId) {
        if (!allowedBranchIds.has(next.branchId)) {
          throw new ForbiddenException('You cannot query another branch');
        }
      } else if (user.homeBranchId) {
        next.branchId = user.homeBranchId;
      }
    }

    return next;
  }

  private assertRecordScope(
    user: RequestUser,
    record: { facilityId?: number | null; branchId?: number | null },
  ) {
    if (user.roleCode === 'SUPER_ADMIN') return;

    if (!user.homeFacilityId || record.facilityId !== user.homeFacilityId) {
      throw new ForbiddenException('You cannot access another facility');
    }

    if (user.canAccessAllBranchesInFacility || !record.branchId) return;

    const allowedBranchIds = new Set<number>([
      ...(user.allowedBranchIds ?? []),
      ...(user.homeBranchId ? [user.homeBranchId] : []),
    ]);

    if (!allowedBranchIds.has(record.branchId)) {
      throw new ForbiddenException('You cannot access another branch');
    }
  }

  async getConsultationMedicalReportPdf(id: number, user: RequestUser) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        appointment: {
          include: {
            triages: {
              orderBy: { arrivedAt: 'desc' },
              take: 1,
            },
          },
        },
        prescriptions: {
          include: {
            prescribedBy: true,
            items: {
              include: {
                medicine: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { prescribedAt: 'desc' },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    this.assertRecordScope(user, consultation);

    const labOrders = await this.prisma.labOrder.findMany({
      where: {
        OR: [
          { appointmentId: consultation.appointmentId },
          { encounterRef: consultation.consultationNumber },
        ],
        facilityId: consultation.facilityId,
        ...(consultation.branchId ? { branchId: consultation.branchId } : {}),
      },
      include: {
        requestedBy: true,
        items: {
          include: {
            test: true,
            results: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const latestTriage = consultation.appointment.triages[0];
    const reference = consultation.consultationNumber;

    const buffer = await createHospitalPdfBuffer(
      {
        title: 'Medical Report',
        subtitle: 'Consultation clinical summary',
        reference,
        verificationCode: `MR-${reference}`,
        facility: consultation.facility,
        branch: consultation.branch,
        compact: true,
        qrPayload: `/reports/medical/consultations/${consultation.id}.pdf`,
      },
      (doc) => {
        addMiniKeyValueGrid(
          doc,
          [
            {
              label: 'Patient',
              value: patientName(consultation.patient),
            },
            { label: 'Patient No.', value: consultation.patient.patientNumber },
            { label: 'Phone', value: consultation.patient.phonePrimary },
            { label: 'Gender', value: consultation.patient.gender },
            {
              label: 'Consultation',
              value: consultation.consultationNumber,
            },
            {
              label: 'Appointment',
              value: consultation.appointment.appointmentNumber,
            },
            { label: 'Doctor', value: staffName(consultation.doctor) },
            { label: 'Started', value: consultation.startedAt },
            { label: 'Status', value: consultation.statusCode },
            {
              label: 'Reason',
              value: consultation.appointment.visitReason,
            },
          ],
          4,
        );

        if (latestTriage) {
          addSectionTitle(doc, 'Triage snapshot');
          addMiniKeyValueGrid(
            doc,
            [
              { label: 'Priority', value: latestTriage.triagePriority },
              { label: 'Temperature', value: latestTriage.temperatureC },
              {
                label: 'Blood pressure',
                value:
                  latestTriage.systolicBp || latestTriage.diastolicBp
                    ? `${latestTriage.systolicBp ?? '-'}/${latestTriage.diastolicBp ?? '-'}`
                    : '-',
              },
              { label: 'Pulse', value: latestTriage.pulseRate },
              { label: 'SPO2', value: latestTriage.oxygenSaturation },
              { label: 'Pain score', value: latestTriage.painScore },
            ],
            6,
          );
        }

        addSectionTitle(doc, 'Clinical notes');
        addCompactParagraph(doc, 'Chief complaint', consultation.chiefComplaint);
        addCompactParagraph(
          doc,
          'History of presenting illness',
          consultation.historyOfPresenting,
        );
        addCompactParagraph(
          doc,
          'Examination findings',
          consultation.examinationFindings,
        );
        addCompactParagraph(doc, 'Diagnosis', consultation.diagnosis);
        addCompactParagraph(doc, 'Treatment plan', consultation.treatmentPlan);
        addCompactParagraph(doc, 'Additional notes', consultation.notes);

        addSectionTitle(doc, 'Prescriptions');
        const prescriptionRows: Array<{
          date: string;
          medicine: string;
          dose: string;
          quantity: number;
          status: string;
        }> = consultation.prescriptions.flatMap((rx) =>
          rx.items.map((item) => ({
            date: formatPdfDate(rx.prescribedAt),
            medicine:
              item.medicineNameSnapshot ||
              item.medicine?.name ||
              `Medicine #${item.medicineId}`,
            dose: [item.dosage, item.route, item.frequency, item.duration]
              .filter(Boolean)
              .join(' / '),
            quantity: item.quantity,
            status: item.statusCode,
          })),
        );
        addCompactTable(
          doc,
          [
            { header: 'Date', width: 70, render: (row) => row.date },
            { header: 'Medicine', width: 180, render: (row) => row.medicine },
            { header: 'Dose / Route / Frequency', width: 160, render: (row) => row.dose },
            { header: 'Qty', width: 45, render: (row) => row.quantity },
            { header: 'Status', width: 72, render: (row) => row.status },
          ],
          prescriptionRows,
          'No prescription items recorded for this consultation.',
        );

        addSectionTitle(doc, 'Lab orders and results');
        const labRows: Array<{
          order: string;
          test: string;
          status: string;
          result?: string | null;
          recordedAt?: Date | null;
        }> = labOrders.flatMap((order) =>
          order.items.map((item) => {
            const result = item.results[0];
            return {
              order: order.orderNumber,
              test: item.test.testName,
              status: item.status,
              result: result?.resultValue,
              recordedAt: result?.recordedAt,
            };
          }),
        );
        addCompactTable(
          doc,
          [
            { header: 'Order', width: 88, render: (row) => row.order },
            { header: 'Test', width: 170, render: (row) => row.test },
            { header: 'Status', width: 75, render: (row) => row.status },
            { header: 'Result', width: 126, render: (row) => row.result },
            { header: 'Recorded', width: 68, render: (row) => row.recordedAt },
          ],
          labRows,
          'No lab orders/results recorded for this consultation.',
        );

        addSignatureBlock(
          doc,
          [
            { label: 'Prepared by', value: staffName(consultation.doctor) },
            {
              label: 'Designation',
              value: consultation.doctor.designation || 'Clinician',
            },
            { label: 'Generated', value: new Date() },
          ],
          'Clinician sign off',
        );
      },
    );

    await this.prisma.auditLog.create({
      data: {
        moduleName: 'REPORTS',
        actionName: 'MEDICAL_REPORT_PDF_DOWNLOADED',
        entityType: 'Consultation',
        entityId: String(consultation.id),
        description: `Medical report PDF downloaded for ${consultation.consultationNumber}`,
        facilityId: consultation.facilityId,
        branchId: consultation.branchId ?? undefined,
        actorUserId: user.userId,
        actorStaffId: user.staffId ?? undefined,
      },
    });

    return {
      fileName: `${consultation.consultationNumber}-medical-report.pdf`,
      buffer,
    };
  }

  private getTodayRange() {
    const today = new Date();

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private buildDateRange(filter?: ReportFilterDto) {
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

  private facilityBranchWhere(filter?: ReportFilterDto) {
    const where: any = {};

    if (filter?.facilityId) where.facilityId = filter.facilityId;
    if (filter?.branchId) where.branchId = filter.branchId;

    return where;
  }

  private withCreatedAtScope(filter?: ReportFilterDto) {
    const where = this.facilityBranchWhere(filter);
    const createdAt = this.buildDateRange(filter);

    if (createdAt) where.createdAt = createdAt;
    return where;
  }

  private withAppointmentDateScope(filter?: ReportFilterDto) {
    const where = this.facilityBranchWhere(filter);
    const appointmentDate = this.buildDateRange(filter);

    if (appointmentDate) where.appointmentDate = appointmentDate;
    return where;
  }

  private withAdmittedAtScope(filter?: ReportFilterDto) {
    const where = this.facilityBranchWhere(filter);
    const admittedAt = this.buildDateRange(filter);

    if (admittedAt) where.admittedAt = admittedAt;
    return where;
  }

  async getDashboardSummary(filter?: ReportFilterDto) {
    return this.cacheService.getOrSet(
      this.cacheService.makeKey(['reports', 'dashboard-summary', filter ?? {}]),
      Number(process.env.CACHE_DASHBOARD_TTL_SECONDS ?? 30),
      () => this.getDashboardSummaryUncached(filter),
    );
  }

  private async getDashboardSummaryUncached(filter?: ReportFilterDto) {
    const patientWhere = {
      ...(filter?.facilityId ? { facilityId: filter.facilityId } : {}),
      ...(this.buildDateRange(filter)
        ? { createdAt: this.buildDateRange(filter) }
        : {}),
    };

    const staffWhere = {
      ...(filter?.facilityId ? { facilityId: filter.facilityId } : {}),
      ...(filter?.branchId ? { branchId: filter.branchId } : {}),
      ...(this.buildDateRange(filter)
        ? { createdAt: this.buildDateRange(filter) }
        : {}),
    };

    const appointmentWhere = this.withAppointmentDateScope(filter);
    const admissionWhere = this.withCreatedAtScope(filter);
    const labWhere = this.withCreatedAtScope(filter);
    const prescriptionWhere = this.withCreatedAtScope(filter);
    const invoiceWhere = this.withCreatedAtScope(filter);

    const totalPatients = await this.prisma.patient.count({
      where: patientWhere,
    });

    const totalStaff = await this.prisma.staff.count({
      where: staffWhere,
    });

    const totalAppointments = await this.prisma.appointment.count({
      where: appointmentWhere,
    });

    const totalAdmissions = await this.prisma.admission.count({
      where: admissionWhere,
    });

    const today = this.getTodayRange();
    const todayAppointments = await this.prisma.appointment.count({
      where: {
        ...this.facilityBranchWhere(filter),
        appointmentDate: {
          gte: today.start,
          lte: today.end,
        },
      },
    });

    const activeAdmissions = await this.prisma.admission.count({
      where: {
        ...this.facilityBranchWhere(filter),
        statusCode: 'ADMITTED',
      },
    });

    const pendingLabOrders = await this.prisma.labOrder.count({
      where: {
        ...labWhere,
        status: {
          in: ['REQUESTED', 'IN_PROGRESS'],
        },
      },
    });

    const pendingPrescriptions = await this.prisma.prescription.count({
      where: {
        ...prescriptionWhere,
        statusCode: {
          in: ['PRESCRIBED', 'PARTIALLY_DISPENSED'],
        },
      },
    });

    const billingAggregates = await this.prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
      },
      where: invoiceWhere,
    });

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      totals: {
        patients: totalPatients,
        staff: totalStaff,
        appointments: totalAppointments,
        admissions: totalAdmissions,
      },
      today: {
        appointments: todayAppointments,
      },
      operations: {
        activeAdmissions,
        pendingLabOrders,
        pendingPrescriptions,
      },
      billing: {
        totalInvoiced: billingAggregates._sum.totalAmount ?? 0,
        totalPaid: billingAggregates._sum.paidAmount ?? 0,
        totalOutstanding: billingAggregates._sum.balanceAmount ?? 0,
      },
    };
  }

  private displayPatientName(
    patient?: {
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
    } | null,
  ) {
    if (!patient) return 'Unknown patient';

    return [patient.firstName, patient.middleName, patient.lastName]
      .filter(Boolean)
      .join(' ');
  }

  async getReportsDashboard(filter?: ReportFilterDto) {
    const patientWhere = {
      ...(filter?.facilityId ? { facilityId: filter.facilityId } : {}),
      ...(this.buildDateRange(filter)
        ? { createdAt: this.buildDateRange(filter) }
        : {}),
    };
    const appointmentWhere = this.withAppointmentDateScope(filter);
    const admissionWhere = this.withCreatedAtScope(filter);
    const labWhere = this.withCreatedAtScope(filter);
    const prescriptionWhere = this.withCreatedAtScope(filter);
    const invoiceWhere = this.withCreatedAtScope(filter);
    const paymentWhere = this.withCreatedAtScope(filter);
    const scope = this.facilityBranchWhere(filter);

    const [
      patients,
      appointments,
      admissions,
      activeAdmissions,
      labOrders,
      pendingLabOrders,
      prescriptions,
      dispensedPrescriptions,
      invoices,
      paidInvoices,
      pendingInvoices,
      invoiceMoney,
      paymentMoney,
      totalBeds,
      occupiedBeds,
      availableBeds,
      appointmentsByStatus,
      invoicesByStatus,
      paymentsByMethod,
      stockRecords,
      recentInvoices,
      moduleRecords,
      activeModuleRecords,
      completedModuleRecords,
      moduleRecordsByStatus,
      moduleRecordsByModule,
      recentModuleRecords,
    ] = await Promise.all([
      this.prisma.patient.count({ where: patientWhere }),
      this.prisma.appointment.count({ where: appointmentWhere }),
      this.prisma.admission.count({ where: admissionWhere }),
      this.prisma.admission.count({
        where: { ...scope, statusCode: 'ADMITTED' },
      }),
      this.prisma.labOrder.count({ where: labWhere }),
      this.prisma.labOrder.count({
        where: {
          ...labWhere,
          status: { in: ['REQUESTED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.prescription.count({ where: prescriptionWhere }),
      this.prisma.prescription.count({
        where: {
          ...prescriptionWhere,
          statusCode: { in: ['DISPENSED', 'FULLY_DISPENSED'] },
        },
      }),
      this.prisma.invoice.count({ where: invoiceWhere }),
      this.prisma.invoice.count({
        where: { ...invoiceWhere, statusCode: { in: ['PAID', 'CLOSED'] } },
      }),
      this.prisma.invoice.count({
        where: { ...invoiceWhere, statusCode: 'PENDING' },
      }),
      this.prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: {
          totalAmount: true,
          balanceAmount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
      }),
      this.prisma.bed.count({ where: { ...scope, isActive: true } }),
      this.prisma.bed.count({
        where: { ...scope, isActive: true, statusCode: 'OCCUPIED' },
      }),
      this.prisma.bed.count({
        where: { ...scope, isActive: true, statusCode: 'AVAILABLE' },
      }),
      this.prisma.appointment.groupBy({
        by: ['statusCode'],
        where: appointmentWhere,
        _count: { _all: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['statusCode'],
        where: invoiceWhere,
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: paymentWhere,
        _sum: { amount: true },
      }),
      this.prisma.branchMedicineStock.findMany({
        where: { ...scope, isActive: true },
        include: {
          branch: true,
          medicine: true,
        },
        orderBy: { stockQuantity: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        include: { patient: true },
        orderBy: { issuedAt: 'desc' },
        take: 8,
      }),
      this.prisma.operationalModuleRecord.count({ where: invoiceWhere }),
      this.prisma.operationalModuleRecord.count({
        where: {
          ...invoiceWhere,
          statusCode: { in: ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'] },
        },
      }),
      this.prisma.operationalModuleRecord.count({
        where: { ...invoiceWhere, statusCode: { in: ['COMPLETED', 'CLOSED'] } },
      }),
      this.prisma.operationalModuleRecord.groupBy({
        by: ['statusCode'],
        where: invoiceWhere,
        _count: { _all: true },
      }),
      this.prisma.operationalModuleRecord.groupBy({
        by: ['moduleSlug', 'moduleTitle'],
        where: invoiceWhere,
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      }),
      this.prisma.operationalModuleRecord.findMany({
        where: invoiceWhere,
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
    ]);

    const lowStockList = stockRecords
      .filter((item) => item.stockQuantity <= item.reorderLevel)
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        medicineName: item.medicine?.name ?? `Medicine ${item.medicineId}`,
        branchName: item.branch?.name ?? 'No branch',
        stockQuantity: item.stockQuantity,
        reorderLevel: item.reorderLevel,
        isOutOfStock: item.stockQuantity <= 0,
      }));

    return {
      filters: {
        dateFrom: filter?.startDate ?? null,
        dateTo: filter?.endDate ?? null,
      },
      counts: {
        patients,
        appointments,
        admissions,
        activeAdmissions,
        labOrders,
        pendingLabOrders,
        prescriptions,
        dispensedPrescriptions,
        invoices,
        paidInvoices,
        pendingInvoices,
        lowStockItems: lowStockList.length,
        outOfStockItems: lowStockList.filter((item) => item.isOutOfStock)
          .length,
        moduleRecords,
        activeModuleRecords,
        completedModuleRecords,
      },
      money: {
        totalInvoiced: invoiceMoney._sum.totalAmount ?? 0,
        totalCollected: paymentMoney._sum.amount ?? 0,
        outstandingBalance: invoiceMoney._sum.balanceAmount ?? 0,
      },
      beds: {
        totalBeds,
        occupiedBeds,
        availableBeds,
      },
      charts: {
        appointmentsByStatus: appointmentsByStatus.map((item) => ({
          label: item.statusCode,
          value: item._count._all,
        })),
        invoicesByStatus: invoicesByStatus.map((item) => ({
          label: item.statusCode,
          value: item._count._all,
        })),
        paymentsByMethod: paymentsByMethod.map((item) => ({
          label: item.paymentMethod,
          value: item._sum.amount ?? 0,
        })),
        moduleRecordsByStatus: moduleRecordsByStatus.map((item) => ({
          label: item.statusCode,
          value: item._count._all,
        })),
        moduleRecordsByModule: moduleRecordsByModule.map((item) => ({
          label: item.moduleTitle,
          moduleSlug: item.moduleSlug,
          value: item._count._all,
        })),
      },
      lowStockList,
      recentInvoices: recentInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        statusCode: invoice.statusCode,
        totalAmount: invoice.totalAmount,
        balanceAmount: invoice.balanceAmount,
        issuedAt: invoice.issuedAt,
        patientName: this.displayPatientName(invoice.patient),
      })),
      recentModuleRecords: recentModuleRecords.map((record) => ({
        id: record.id,
        moduleSlug: record.moduleSlug,
        moduleTitle: record.moduleTitle,
        recordNumber: record.recordNumber,
        title: record.title,
        workflowStage: record.workflowStage,
        statusCode: record.statusCode,
        priorityCode: record.priorityCode,
        dueAt: record.dueAt,
        updatedAt: record.updatedAt,
      })),
    };
  }

  async getReportsDashboardExport(filter?: ReportFilterDto) {
    const dashboard = await this.getReportsDashboard(filter);
    const rows: unknown[][] = [
      ['section', 'label', 'value'],
      ...Object.entries(dashboard.counts).map(([label, value]) => [
        'counts',
        label,
        value,
      ]),
      ...Object.entries(dashboard.money).map(([label, value]) => [
        'money',
        label,
        value,
      ]),
      ...Object.entries(dashboard.beds).map(([label, value]) => [
        'beds',
        label,
        value,
      ]),
      ...dashboard.charts.appointmentsByStatus.map((item) => [
        'appointmentsByStatus',
        item.label,
        item.value,
      ]),
      ...dashboard.charts.invoicesByStatus.map((item) => [
        'invoicesByStatus',
        item.label,
        item.value,
      ]),
      ...dashboard.charts.paymentsByMethod.map((item) => [
        'paymentsByMethod',
        item.label,
        item.value,
      ]),
      ...dashboard.charts.moduleRecordsByStatus.map((item) => [
        'moduleRecordsByStatus',
        item.label,
        item.value,
      ]),
      ...dashboard.charts.moduleRecordsByModule.map((item) => [
        'moduleRecordsByModule',
        item.label,
        item.value,
      ]),
    ];

    return {
      fileName: `reports-dashboard-${new Date().toISOString().slice(0, 10)}.csv`,
      rowCount: rows.length - 1,
      csvText: toCsv(rows),
    };
  }

  async getModuleOperationsReport(filter?: ReportFilterDto) {
    const where = this.withCreatedAtScope(filter);
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
        take: 50,
      }),
    ]);
    const now = new Date();
    const activeStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'];
    const completedStatuses = ['COMPLETED', 'CLOSED'];
    const total = byStatus.reduce((sum, item) => sum + item._count._all, 0);
    const active = byStatus
      .filter((item) => activeStatuses.includes(item.statusCode))
      .reduce((sum, item) => sum + item._count._all, 0);
    const completed = byStatus
      .filter((item) => completedStatuses.includes(item.statusCode))
      .reduce((sum, item) => sum + item._count._all, 0);
    const overdue = await this.prisma.operationalModuleRecord.count({
      where: {
        ...where,
        dueAt: { lt: now },
        statusCode: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
      },
    });

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      summary: {
        total,
        active,
        completed,
        overdue,
      },
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

  async getModuleOperationsExport(filter?: ReportFilterDto) {
    const where = this.withCreatedAtScope(filter);
    const records = await this.prisma.operationalModuleRecord.findMany({
      where,
      orderBy: [{ moduleTitle: 'asc' }, { updatedAt: 'desc' }],
      take: 5000,
    });
    const rows: unknown[][] = [
      [
        'module',
        'recordNumber',
        'title',
        'workflowStage',
        'status',
        'priority',
        'facilityId',
        'branchId',
        'patientId',
        'assignedStaffId',
        'dueAt',
        'updatedAt',
      ],
      ...records.map((record) => [
        record.moduleTitle,
        record.recordNumber,
        record.title,
        record.workflowStage,
        record.statusCode,
        record.priorityCode,
        record.facilityId,
        record.branchId,
        record.patientId,
        record.assignedStaffId,
        record.dueAt?.toISOString() ?? '',
        record.updatedAt.toISOString(),
      ]),
    ];

    return {
      fileName: `module-operations-${new Date().toISOString().slice(0, 10)}.csv`,
      rowCount: records.length,
      csvText: toCsv(rows),
    };
  }

  async getOpdAnalytics(filter?: ReportFilterDto) {
    const where = this.withAppointmentDateScope(filter);

    const totalAppointments = await this.prisma.appointment.count({ where });

    const booked = await this.prisma.appointment.count({
      where: { ...where, statusCode: 'BOOKED' },
    });

    const checkedIn = await this.prisma.appointment.count({
      where: { ...where, statusCode: 'CHECKED_IN' },
    });

    const inConsultation = await this.prisma.appointment.count({
      where: { ...where, statusCode: 'IN_CONSULTATION' },
    });

    const completed = await this.prisma.appointment.count({
      where: { ...where, statusCode: 'COMPLETED' },
    });

    const admitted = await this.prisma.appointment.count({
      where: { ...where, statusCode: 'ADMITTED' },
    });

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      totalAppointments,
      statusBreakdown: {
        booked,
        checkedIn,
        inConsultation,
        completed,
        admitted,
      },
    };
  }

  async getBillingAnalytics(filter?: ReportFilterDto) {
    const where = this.withCreatedAtScope(filter);

    const totalInvoices = await this.prisma.invoice.count({ where });

    const pendingInvoices = await this.prisma.invoice.count({
      where: { ...where, statusCode: 'PENDING' },
    });

    const partiallyPaidInvoices = await this.prisma.invoice.count({
      where: { ...where, statusCode: 'PARTIALLY_PAID' },
    });

    const paidInvoices = await this.prisma.invoice.count({
      where: { ...where, statusCode: { in: ['PAID', 'CLOSED'] } },
    });

    const totals = await this.prisma.invoice.aggregate({
      _sum: {
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
      },
      where,
    });

    const totalPayments = await this.prisma.payment.count({ where });

    const cashPayments = await this.prisma.payment.count({
      where: { ...where, paymentMethod: 'CASH' },
    });

    const mpesaPayments = await this.prisma.payment.count({
      where: { ...where, paymentMethod: 'MPESA' },
    });

    const completedPayments = await this.prisma.payment.count({
      where: { ...where, statusCode: 'COMPLETED' },
    });

    const pendingPayments = await this.prisma.payment.count({
      where: { ...where, statusCode: 'PENDING' },
    });

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      invoices: {
        totalInvoices,
        pendingInvoices,
        partiallyPaidInvoices,
        paidInvoices,
      },
      payments: {
        totalPayments,
        cashPayments,
        mpesaPayments,
        completedPayments,
        pendingPayments,
      },
      amounts: {
        subtotal: totals._sum.subtotal ?? 0,
        discountAmount: totals._sum.discountAmount ?? 0,
        taxAmount: totals._sum.taxAmount ?? 0,
        totalAmount: totals._sum.totalAmount ?? 0,
        paidAmount: totals._sum.paidAmount ?? 0,
        balanceAmount: totals._sum.balanceAmount ?? 0,
      },
    };
  }

  async getLabAnalytics(filter?: ReportFilterDto) {
    const where = this.withCreatedAtScope(filter);

    const totalOrders = await this.prisma.labOrder.count({ where });

    const requested = await this.prisma.labOrder.count({
      where: { ...where, status: 'REQUESTED' },
    });

    const inProgress = await this.prisma.labOrder.count({
      where: { ...where, status: 'IN_PROGRESS' },
    });

    const resulted = await this.prisma.labOrder.count({
      where: { ...where, status: 'RESULTED' },
    });

    const resultWhere: any = {};
    if (filter?.facilityId)
      resultWhere.orderItem = { order: { facilityId: filter.facilityId } };
    if (filter?.branchId) {
      resultWhere.orderItem = {
        ...(resultWhere.orderItem ?? {}),
        order: {
          ...((resultWhere.orderItem && resultWhere.orderItem.order) || {}),
          branchId: filter.branchId,
        },
      };
    }

    const recordedAt = this.buildDateRange(filter);
    if (recordedAt) resultWhere.recordedAt = recordedAt;

    const totalResults = await this.prisma.labResult.count({
      where: resultWhere,
    });

    const totalTestsCatalog = await this.prisma.labTestCatalog.count();

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      orders: {
        totalOrders,
        requested,
        inProgress,
        resulted,
      },
      results: {
        totalResults,
      },
      catalog: {
        totalTestsCatalog,
      },
    };
  }

  async getPharmacyAnalytics(filter?: ReportFilterDto) {
    const where = this.withCreatedAtScope(filter);

    const stockWhere: any = {
      isActive: true,
    };

    if (filter?.facilityId) {
      stockWhere.facilityId = filter.facilityId;
    }

    if (filter?.branchId) {
      stockWhere.branchId = filter.branchId;
    }

    const totalBranchStockRecords = await this.prisma.branchMedicineStock.count(
      {
        where: stockWhere,
      },
    );

    const branchStockItems = await this.prisma.branchMedicineStock.findMany({
      where: stockWhere,
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const lowStockItems = branchStockItems.filter(
      (item) => item.stockQuantity <= item.reorderLevel,
    );

    const outOfStockItems = branchStockItems.filter(
      (item) => item.stockQuantity <= 0,
    );

    const totalPrescriptions = await this.prisma.prescription.count({ where });

    const prescribed = await this.prisma.prescription.count({
      where: { ...where, statusCode: 'PRESCRIBED' },
    });

    const partiallyDispensed = await this.prisma.prescription.count({
      where: { ...where, statusCode: 'PARTIALLY_DISPENSED' },
    });

    const dispensed = await this.prisma.prescription.count({
      where: { ...where, statusCode: 'DISPENSED' },
    });

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      stock: {
        totalBranchStockRecords,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        lowStockItems: lowStockItems.map((item) => ({
          id: item.id,
          facilityId: item.facilityId,
          facilityName: item.facility?.name ?? null,
          branchId: item.branchId,
          branchName: item.branch?.name ?? null,
          medicineId: item.medicineId,
          medicineCode: item.medicine?.code ?? null,
          medicineName: item.medicine?.name ?? null,
          stockQuantity: item.stockQuantity,
          reorderLevel: item.reorderLevel,
          unitPrice: item.unitPrice,
        })),
        outOfStockItems: outOfStockItems.map((item) => ({
          id: item.id,
          facilityId: item.facilityId,
          facilityName: item.facility?.name ?? null,
          branchId: item.branchId,
          branchName: item.branch?.name ?? null,
          medicineId: item.medicineId,
          medicineCode: item.medicine?.code ?? null,
          medicineName: item.medicine?.name ?? null,
          stockQuantity: item.stockQuantity,
          reorderLevel: item.reorderLevel,
          unitPrice: item.unitPrice,
        })),
      },
      prescriptions: {
        totalPrescriptions,
        prescribed,
        partiallyDispensed,
        dispensed,
      },
    };
  }

  async getOtcSalesReport(filter?: ReportFilterDto) {
    const dateRange = this.buildDateRange(filter);
    const saleWhere: any = {
      ...this.facilityBranchWhere(filter),
    };

    if (dateRange) {
      saleWhere.createdAt = dateRange;
    }

    const paymentWhere = {
      sale: saleWhere,
    };

    const [
      totalSales,
      paidSales,
      pendingInsuranceSales,
      cancelledSales,
      saleMoney,
      paymentsByMethod,
      insuranceByStatus,
      itemRows,
      recentSales,
    ] = await Promise.all([
      this.prisma.otcSale.count({ where: saleWhere }),
      this.prisma.otcSale.count({
        where: { ...saleWhere, paymentStatus: 'PAID' },
      }),
      this.prisma.otcSale.count({
        where: { ...saleWhere, paymentStatus: 'PENDING_INSURANCE' },
      }),
      this.prisma.otcSale.count({
        where: { ...saleWhere, status: 'CANCELLED' },
      }),
      this.prisma.otcSale.aggregate({
        where: saleWhere,
        _sum: {
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
      this.prisma.otcSalePayment.groupBy({
        by: ['paymentMethod'],
        where: paymentWhere,
        _sum: {
          amount: true,
          insuranceCoveredAmount: true,
          patientCoPayAmount: true,
        },
        _count: { _all: true },
      }),
      this.prisma.otcSalePayment.groupBy({
        by: ['insuranceClaimStatus'],
        where: {
          ...paymentWhere,
          paymentMethod: 'INSURANCE',
        },
        _sum: {
          insuranceCoveredAmount: true,
          patientCoPayAmount: true,
        },
        _count: { _all: true },
      }),
      this.prisma.otcSaleItem.findMany({
        where: {
          sale: saleWhere,
        },
        select: {
          id: true,
          medicineId: true,
          medicineNameSnapshot: true,
          quantity: true,
          lineTotal: true,
          medicine: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          sale: {
            select: {
              branchId: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 10000,
      }),
      this.prisma.otcSale.findMany({
        where: saleWhere,
        select: {
          id: true,
          saleNumber: true,
          customerName: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          soldAt: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              staffCode: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { items: true, payments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ]);

    const byMedicine = new Map<
      string,
      {
        medicineId: number;
        medicineCode: string | null;
        medicineName: string;
        branchId: number | null;
        branchName: string | null;
        quantity: number;
        revenue: number;
      }
    >();

    for (const item of itemRows) {
      const branchId = item.sale.branchId ?? null;
      const key = `${branchId ?? 'facility'}:${item.medicineId}`;
      const current = byMedicine.get(key) ?? {
        medicineId: item.medicineId,
        medicineCode: item.medicine?.code ?? null,
        medicineName:
          item.medicineNameSnapshot ||
          item.medicine?.name ||
          `Medicine #${item.medicineId}`,
        branchId,
        branchName: item.sale.branch?.name ?? null,
        quantity: 0,
        revenue: 0,
      };

      current.quantity += item.quantity;
      current.revenue += item.lineTotal;
      byMedicine.set(key, current);
    }

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      summary: {
        totalSales,
        paidSales,
        pendingInsuranceSales,
        cancelledSales,
        subtotal: saleMoney._sum.subtotal ?? 0,
        discountAmount: saleMoney._sum.discountAmount ?? 0,
        taxAmount: saleMoney._sum.taxAmount ?? 0,
        totalAmount: saleMoney._sum.totalAmount ?? 0,
        paidAmount: saleMoney._sum.paidAmount ?? 0,
        balanceAmount: saleMoney._sum.balanceAmount ?? 0,
        grossSales: saleMoney._sum.subtotal ?? 0,
        discounts: saleMoney._sum.discountAmount ?? 0,
        taxes: saleMoney._sum.taxAmount ?? 0,
        netSales: saleMoney._sum.totalAmount ?? 0,
        outstandingBalance: saleMoney._sum.balanceAmount ?? 0,
        itemsSold: itemRows.reduce((sum, item) => sum + item.quantity, 0),
      },
      paymentsByMethod: paymentsByMethod.map((item) => ({
        paymentMethod: item.paymentMethod,
        method: item.paymentMethod,
        count: item._count._all,
        amount: item._sum.amount ?? 0,
        insuranceCoveredAmount: item._sum.insuranceCoveredAmount ?? 0,
        patientCoPayAmount: item._sum.patientCoPayAmount ?? 0,
      })),
      insuranceByStatus: insuranceByStatus.map((item) => ({
        status: item.insuranceClaimStatus ?? 'UNSPECIFIED',
        count: item._count._all,
        coveredAmount: item._sum.insuranceCoveredAmount ?? 0,
        coPayAmount: item._sum.patientCoPayAmount ?? 0,
        patientCoPayAmount: item._sum.patientCoPayAmount ?? 0,
      })),
      topMedicines: Array.from(byMedicine.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 30),
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        saleNumber: sale.saleNumber,
        customerName: sale.patient
          ? this.displayPatientName(sale.patient)
          : sale.customerName || 'Walk-in customer',
        branchName: sale.branch?.name ?? null,
        status: sale.status,
        paymentStatus: sale.paymentStatus,
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        balanceAmount: sale.balanceAmount,
        soldAt: sale.soldAt,
        createdAt: sale.createdAt,
        createdBy: sale.createdBy
          ? [sale.createdBy.firstName, sale.createdBy.lastName]
              .filter(Boolean)
              .join(' ') || sale.createdBy.staffCode
          : null,
        itemCount: sale._count.items,
        paymentCount: sale._count.payments,
      })),
    };
  }

  async getOtcSalesReportExport(filter?: ReportFilterDto) {
    const report = await this.getOtcSalesReport(filter);
    const rows: unknown[][] = [
      ['section', 'label', 'value'],
      ...Object.entries(report.summary).map(([label, value]) => [
        'summary',
        label,
        value,
      ]),
      ...report.paymentsByMethod.map((item) => [
        'paymentsByMethod',
        item.paymentMethod,
        item.amount,
      ]),
      ...report.insuranceByStatus.map((item) => [
        'insuranceByStatus',
        item.status,
        item.coveredAmount,
      ]),
      ...report.topMedicines.map((item) => [
        'topMedicines',
        `${item.branchName ?? 'Facility'} / ${item.medicineName}`,
        item.revenue,
      ]),
    ];

    return {
      fileName: `otc-sales-${new Date().toISOString().slice(0, 10)}.csv`,
      rowCount: rows.length - 1,
      csvText: toCsv(rows),
    };
  }

  async getProfitAnalytics(filter?: ReportFilterDto) {
    const dateRange = this.buildDateRange(filter);
    const dispenseWhere: any = {
      ...this.facilityBranchWhere(filter),
    };

    if (dateRange) {
      dispenseWhere.dispensedAt = dateRange;
    }

    const items = await this.prisma.dispenseItem.findMany({
      where: {
        dispense: dispenseWhere,
      },
      include: {
        medicine: true,
        dispense: {
          include: {
            facility: true,
            branch: true,
            patient: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 10000,
    });

    const medicineIds = Array.from(
      new Set(items.map((item) => item.medicineId)),
    );
    const stockRows = medicineIds.length
      ? await this.prisma.branchMedicineStock.findMany({
          where: {
            medicineId: { in: medicineIds },
            ...(filter?.facilityId ? { facilityId: filter.facilityId } : {}),
            ...(filter?.branchId ? { branchId: filter.branchId } : {}),
          },
        })
      : [];

    const stockByKey = new Map(
      stockRows.map((stock) => [
        `${stock.branchId}:${stock.medicineId}`,
        stock,
      ]),
    );
    const byMedicine = new Map<
      string,
      {
        medicineId: number;
        medicineCode: string | null;
        medicineName: string;
        branchId: number | null;
        branchName: string | null;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();

    for (const item of items) {
      const branchId = item.dispense.branchId ?? null;
      const stock = branchId
        ? stockByKey.get(`${branchId}:${item.medicineId}`)
        : undefined;
      const quantity = item.quantityDispensed ?? 0;
      const revenue = item.lineTotal ?? quantity * (item.unitPrice ?? 0);
      const cost = quantity * (stock?.buyingPrice ?? 0);
      const key = `${branchId ?? 'facility'}:${item.medicineId}`;
      const current = byMedicine.get(key) ?? {
        medicineId: item.medicineId,
        medicineCode: item.medicine?.code ?? null,
        medicineName: item.medicine?.name ?? `Medicine #${item.medicineId}`,
        branchId,
        branchName: item.dispense.branch?.name ?? null,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };

      current.quantity += quantity;
      current.revenue += revenue;
      current.cost += cost;
      current.profit += revenue - cost;
      byMedicine.set(key, current);
    }

    const rows = Array.from(byMedicine.values()).sort(
      (a, b) => b.profit - a.profit,
    );
    const revenue = rows.reduce((sum, item) => sum + item.revenue, 0);
    const cost = rows.reduce((sum, item) => sum + item.cost, 0);
    const profit = revenue - cost;

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      summary: {
        dispensedLines: items.length,
        quantityDispensed: rows.reduce((sum, item) => sum + item.quantity, 0),
        revenue,
        cost,
        grossProfit: profit,
        marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
      },
      byMedicine: rows,
      recentLines: items.slice(0, 80).map((item) => {
        const branchId = item.dispense.branchId ?? null;
        const stock = branchId
          ? stockByKey.get(`${branchId}:${item.medicineId}`)
          : undefined;
        const quantity = item.quantityDispensed ?? 0;
        const revenue = item.lineTotal ?? quantity * (item.unitPrice ?? 0);
        const cost = quantity * (stock?.buyingPrice ?? 0);

        return {
          id: item.id,
          dispensedAt: item.dispense.dispensedAt,
          dispenseNumber: item.dispense.dispenseNumber,
          patientName: item.dispense.patient
            ? [
                item.dispense.patient.firstName,
                item.dispense.patient.middleName,
                item.dispense.patient.lastName,
              ]
                .filter(Boolean)
                .join(' ')
            : null,
          medicineId: item.medicineId,
          medicineCode: item.medicine?.code ?? null,
          medicineName: item.medicine?.name ?? null,
          branchName: item.dispense.branch?.name ?? null,
          quantity,
          sellingPrice: item.unitPrice,
          buyingPrice: stock?.buyingPrice ?? 0,
          revenue,
          cost,
          profit: revenue - cost,
        };
      }),
    };
  }

  async getProfitAnalyticsExport(filter?: ReportFilterDto) {
    const report = await this.getProfitAnalytics(filter);
    const rows: unknown[][] = [
      [
        'branch',
        'medicineCode',
        'medicineName',
        'quantity',
        'revenue',
        'cost',
        'grossProfit',
        'marginPercent',
      ],
      ...report.byMedicine.map((item) => [
        item.branchName ?? 'Facility-wide',
        item.medicineCode,
        item.medicineName,
        item.quantity,
        item.revenue,
        item.cost,
        item.profit,
        item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
      ]),
    ];

    return {
      fileName: `pharmacy-profit-${new Date().toISOString().slice(0, 10)}.csv`,
      rowCount: rows.length - 1,
      csvText: toCsv(rows),
    };
  }

  async getIpdAnalytics(filter?: ReportFilterDto) {
    const where = this.withCreatedAtScope(filter);

    const totalAdmissions = await this.prisma.admission.count({ where });

    const activeAdmissions = await this.prisma.admission.count({
      where: { ...this.facilityBranchWhere(filter), statusCode: 'ADMITTED' },
    });

    const dischargedAdmissions = await this.prisma.admission.count({
      where: { ...where, statusCode: 'DISCHARGED' },
    });

    const wardWhere = this.facilityBranchWhere(filter);
    const bedWhere = this.facilityBranchWhere(filter);

    const totalWards = await this.prisma.ward.count({
      where: {
        ...wardWhere,
        isActive: true,
      },
    });

    const totalBeds = await this.prisma.bed.count({
      where: {
        ...bedWhere,
        isActive: true,
      },
    });

    const occupiedBeds = await this.prisma.bed.count({
      where: {
        ...bedWhere,
        statusCode: 'OCCUPIED',
      },
    });

    const availableBeds = await this.prisma.bed.count({
      where: {
        ...bedWhere,
        statusCode: 'AVAILABLE',
      },
    });

    return {
      filters: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
      },
      admissions: {
        totalAdmissions,
        activeAdmissions,
        dischargedAdmissions,
      },
      capacity: {
        totalWards,
        totalBeds,
        occupiedBeds,
        availableBeds,
      },
    };
  }

  async getDoctorWorkload(filter?: ReportFilterDto) {
    const doctorWhere: any = {
      OR: [{ role: { code: 'DOCTOR' } }, { isClinician: true }],
    };

    if (filter?.facilityId) doctorWhere.facilityId = filter.facilityId;
    if (filter?.branchId) doctorWhere.branchId = filter.branchId;

    const doctors = await this.prisma.staff.findMany({
      where: doctorWhere,
      include: {
        role: true,
      },
      orderBy: { id: 'asc' },
    });

    const dateRange = this.buildDateRange(filter);

    return Promise.all(
      doctors.map(async (doctor) => {
        const appointments = await this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            ...(dateRange ? { appointmentDate: dateRange } : {}),
            ...this.facilityBranchWhere(filter),
          },
        });

        const consultations = await this.prisma.consultation.count({
          where: {
            doctorId: doctor.id,
            ...(dateRange ? { createdAt: dateRange } : {}),
            ...this.facilityBranchWhere(filter),
          },
        });

        const admissions = await this.prisma.admission.count({
          where: {
            admittedByStaffId: doctor.id,
            ...(dateRange ? { admittedAt: dateRange } : {}),
            ...this.facilityBranchWhere(filter),
          },
        });

        const labRequests = await this.prisma.labOrder.count({
          where: {
            requestedByStaffId: doctor.id,
            ...(dateRange ? { createdAt: dateRange } : {}),
            ...this.facilityBranchWhere(filter),
          },
        });

        const prescriptions = await this.prisma.prescription.count({
          where: {
            prescribedByStaffId: doctor.id,
            ...(dateRange ? { createdAt: dateRange } : {}),
            ...this.facilityBranchWhere(filter),
          },
        });

        return {
          doctorId: doctor.id,
          staffCode: doctor.staffCode,
          fullName: `${doctor.firstName} ${doctor.lastName}`,
          role: doctor.role?.name ?? null,
          filters: {
            startDate: filter?.startDate ?? null,
            endDate: filter?.endDate ?? null,
            facilityId: filter?.facilityId ?? null,
            branchId: filter?.branchId ?? null,
          },
          workload: {
            appointments,
            consultations,
            admissions,
            labRequests,
            prescriptions,
          },
        };
      }),
    );
  }
  async getSystemHealthSummary(filter?: ReportFilterDto) {
    const scope = this.facilityBranchWhere(filter);

    const unresolvedCriticalAlerts = await this.prisma.notification.count({
      where: {
        ...scope,
        isResolved: false,
        severity: 'CRITICAL',
      },
    });

    const unresolvedWarnings = await this.prisma.notification.count({
      where: {
        ...scope,
        isResolved: false,
        severity: 'WARNING',
      },
    });

    const billingFailures = await this.prisma.notification.count({
      where: {
        ...scope,
        isResolved: false,
        moduleName: 'BILLING',
        notificationType: 'PAYMENT_FAILED',
      },
    });

    const allScopedStock = await this.prisma.branchMedicineStock.findMany({
      where: {
        ...scope,
        isActive: true,
      },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
      orderBy: { id: 'desc' },
    });

    const filteredLowStock = allScopedStock.filter(
      (item) => item.stockQuantity <= item.reorderLevel,
    );

    const lowStock = filteredLowStock.length;

    const lowStockItems = filteredLowStock.slice(0, 10).map((item) => ({
      id: item.id,
      facilityId: item.facilityId,
      facilityName: item.facility?.name ?? null,
      branchId: item.branchId,
      branchName: item.branch?.name ?? null,
      medicineId: item.medicineId,
      medicineName: item.medicine?.name ?? null,
      stockQuantity: item.stockQuantity,
      reorderLevel: item.reorderLevel,
    }));

    const activeAdmissions = await this.prisma.admission.count({
      where: {
        ...scope,
        statusCode: 'ADMITTED',
      },
    });

    const pendingLabQueue = await this.prisma.labOrder.count({
      where: {
        ...scope,
        status: {
          in: ['REQUESTED', 'IN_PROGRESS'],
        },
      },
    });

    const recentCriticalAlerts = await this.prisma.notification.findMany({
      where: {
        ...scope,
        isResolved: false,
        severity: 'CRITICAL',
      },
      include: {
        facility: true,
        branch: true,
        targetUser: true,
        targetStaff: true,
      },
      orderBy: { id: 'desc' },
      take: 10,
    });

    const recentWarnings = await this.prisma.notification.findMany({
      where: {
        ...scope,
        isResolved: false,
        severity: 'WARNING',
      },
      include: {
        facility: true,
        branch: true,
        targetUser: true,
        targetStaff: true,
      },
      orderBy: { id: 'desc' },
      take: 10,
    });

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (unresolvedCriticalAlerts > 0) {
      status = 'critical';
    } else if (
      unresolvedWarnings > 0 ||
      billingFailures > 0 ||
      lowStock > 0 ||
      pendingLabQueue > 0
    ) {
      status = 'warning';
    }

    const rawScore =
      100 -
      unresolvedCriticalAlerts * 25 -
      unresolvedWarnings * 8 -
      billingFailures * 10 -
      lowStock * 4 -
      pendingLabQueue * 3 -
      activeAdmissions * 1;

    const healthScore = Math.max(0, Math.min(100, rawScore));

    return {
      filters: {
        facilityId: filter?.facilityId ?? null,
        branchId: filter?.branchId ?? null,
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
      },
      status,
      healthScore,
      summary: {
        unresolvedCriticalAlerts,
        unresolvedWarnings,
        billingFailures,
        lowStock,
        activeAdmissions,
        pendingLabQueue,
      },
      panels: {
        recentCriticalAlerts,
        recentWarnings,
        lowStockItems,
      },
    };
  }
}
