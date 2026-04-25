import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { AppointmentService } from '../appointment/appointment.service';
import { ConsultationService } from '../consultation/consultation.service';
import { StaffService } from '../staff/staff.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationService } from '../notification/notification.service';
import { CreateBillingServiceDto } from './dto/create-billing-service.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateCashPaymentDto } from './dto/create-cash-payment.dto';
import { CreateMpesaPaymentRequestDto } from './dto/create-mpesa-payment-request.dto';
import { ConfirmMpesaPaymentDto } from './dto/confirm-mpesa-payment.dto';
import { ScopeService } from '../auth/scope.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { RemoveInvoiceItemDto } from './dto/remove-invoice-item.dto';
import { CreateServiceTariffDto } from './dto/create-service-tariff.dto';
import { UpdateServiceTariffDto } from './dto/update-service-tariff.dto';
import { ImportServiceTariffsCsvDto } from './dto/import-service-tariffs-csv.dto';
import { OpenPatientInvoiceDto } from './dto/open-patient-invoice.dto';
import {
  addKeyValueGrid,
  addParagraph,
  addSectionTitle,
  addTable,
  createHospitalPdfBuffer,
  formatPdfDate,
  formatPdfMoney,
  patientName,
  staffName,
} from '../common/pdf/hospital-pdf';

type TariffCsvRow = Record<string, string>;
type InvoiceChargeType = 'SERVICE' | 'LAB_TEST' | 'MEDICINE' | 'MANUAL';

const SERVICE_TARIFF_COLUMNS = [
  'tariffType',
  'code',
  'name',
  'category',
  'linkedId',
  'unitPrice',
  'isActive',
  'notes',
];

const CORE_CLINICAL_TARIFFS = [
  [
    'MANUAL',
    'CONSULTATION',
    'Consultation',
    'SERVICE',
    '',
    0,
    true,
    'Core outpatient consultation charge',
  ],
  [
    'MANUAL',
    'DOCTOR_REVIEW',
    'Doctor review',
    'SERVICE',
    '',
    0,
    true,
    'Clinical review after consultation or ward round',
  ],
  [
    'MANUAL',
    'NURSING_CHARGE',
    'Nursing charge',
    'SERVICE',
    '',
    0,
    true,
    'Nursing procedure or daily nursing care',
  ],
  [
    'MANUAL',
    'TRIAGE_CHARGE',
    'Triage charge',
    'SERVICE',
    '',
    0,
    true,
    'Front-door clinical triage charge',
  ],
  [
    'MANUAL',
    'EMERGENCY_REVIEW',
    'Emergency review',
    'SERVICE',
    '',
    0,
    true,
    'Emergency unit clinical review',
  ],
  [
    'MANUAL',
    'DRESSING',
    'Dressing',
    'PROCEDURE',
    '',
    0,
    true,
    'Wound dressing or minor procedure',
  ],
  [
    'MANUAL',
    'INJECTION',
    'Injection administration',
    'PROCEDURE',
    '',
    0,
    true,
    'Drug administration service charge',
  ],
  [
    'MANUAL',
    'OXYGEN_HOUR',
    'Oxygen per hour',
    'SERVICE',
    '',
    0,
    true,
    'Oxygen therapy hourly charge',
  ],
  [
    'MANUAL',
    'PROCEDURE_ROOM',
    'Procedure room',
    'PROCEDURE',
    '',
    0,
    true,
    'Procedure room usage charge',
  ],
  [
    'MANUAL',
    'NURSING_OBSERVATION',
    'Nursing observation',
    'SERVICE',
    '',
    0,
    true,
    'Observation and monitoring charge',
  ],
];

function normalizeTariffHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function escapeTariffCsvCell(value: unknown) {
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

function toTariffCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(escapeTariffCsvCell).join(',')).join('\r\n');
}

function parseTariffCsvRecords(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];

    if (char === '"') {
      if (inQuotes && csvText[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[index + 1] === '\n') {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function mapTariffCsvRow(headers: string[], cells: string[]): TariffCsvRow {
  return headers.reduce<TariffCsvRow>((row, header, index) => {
    row[header] = cells[index]?.trim() ?? '';
    return row;
  }, {});
}

function readTariffText(row: TariffCsvRow, aliases: string[]) {
  for (const alias of aliases.map(normalizeTariffHeader)) {
    const value = row[alias];
    if (value !== undefined && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

function readTariffNumber(row: TariffCsvRow, aliases: string[]) {
  const raw = readTariffText(row, aliases);
  if (!raw) return undefined;

  const number = Number(raw.replace(/,/g, ''));
  return Number.isFinite(number) ? number : undefined;
}

function readTariffBoolean(row: TariffCsvRow, aliases: string[]) {
  const raw = readTariffText(row, aliases);
  if (!raw) return undefined;

  return ['true', 'yes', 'y', '1', 'active'].includes(raw.toLowerCase());
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientService: PatientService,
    private readonly appointmentService: AppointmentService,
    private readonly consultationService: ConsultationService,
    private readonly staffService: StaffService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
    private readonly scopeService: ScopeService,
  ) {}

  private async generateInvoiceNumber() {
    const latestInvoice = await this.prisma.invoice.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const nextNumber = (latestInvoice?.id ?? 0) + 1;
    return `INV-${String(nextNumber).padStart(6, '0')}`;
  }

  private normalizeTariffCategory(category: string) {
    return category.trim().toUpperCase();
  }

  private formatChargeDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private parseChargeDate(value?: string) {
    if (!value) return new Date();

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invoice line date is invalid');
    }

    return date;
  }

  private async assertServiceTariffScope(
    facilityId: number,
    branchId: number | undefined,
    user: RequestUser,
  ) {
    if (!Number.isFinite(facilityId)) {
      throw new BadRequestException('A valid facilityId is required');
    }

    await this.assertTariffReferences({ facilityId, branchId });
    this.scopeService.assertBranchAccess(user, facilityId, branchId ?? null);
  }

  async getServiceTariffPricingTemplate(
    facilityId: number,
    branchId: number | undefined,
    user: RequestUser,
  ) {
    await this.assertServiceTariffScope(facilityId, branchId, user);

    const [billingServices, labTests, wards, beds, tariffs, branch] =
      await Promise.all([
        this.prisma.billingService.findMany({
          where: { isActive: true },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.labTestCatalog.findMany({
          where: { isActive: true },
          orderBy: [{ category: 'asc' }, { testName: 'asc' }],
        }),
        this.prisma.ward.findMany({
          where: {
            isActive: true,
            OR: [{ facilityId }, { facilityId: null }],
          },
          orderBy: [{ name: 'asc' }],
        }),
        this.prisma.bed.findMany({
          where: {
            isActive: true,
            OR: [{ facilityId }, { facilityId: null }],
          },
          orderBy: [{ bedNumber: 'asc' }],
        }),
        this.prisma.serviceTariff.findMany({
          where: {
            facilityId,
            branchId: branchId ?? null,
          },
        }),
        branchId
          ? this.prisma.branch.findUnique({ where: { id: branchId } })
          : Promise.resolve(null),
      ]);

    const tariffByKey = new Map(
      tariffs.map((tariff) => [`${tariff.category}:${tariff.code}`, tariff]),
    );
    const findTariff = (category: string, code: string) =>
      tariffByKey.get(
        `${this.normalizeTariffCategory(category)}:${code.trim().toUpperCase()}`,
      );

    const rows: unknown[][] = [
      SERVICE_TARIFF_COLUMNS,
      ...billingServices.map((service) => {
        const category = service.category ?? 'SERVICE';
        const tariff = findTariff(category, service.code);

        return [
          'BILLING_SERVICE',
          service.code,
          service.name,
          category,
          service.id,
          tariff?.unitPrice ?? service.defaultPrice,
          tariff?.isActive ?? true,
          tariff?.notes ?? '',
        ];
      }),
      ...labTests.map((test) => {
        const code = `LAB_TEST_${test.id}`;
        const tariff = findTariff('LAB', code);

        return [
          'LAB_TEST',
          code,
          test.testName,
          'LAB',
          test.id,
          tariff?.unitPrice ?? 0,
          tariff?.isActive ?? true,
          tariff?.notes ?? '',
        ];
      }),
      ...wards.map((ward) => {
        const code = `WARD_${ward.id}`;
        const tariff = findTariff('IPD_BED', code);

        return [
          'WARD',
          code,
          `${ward.name} bed-day`,
          'IPD_BED',
          ward.id,
          tariff?.unitPrice ?? 0,
          tariff?.isActive ?? true,
          tariff?.notes ?? '',
        ];
      }),
      ...beds.map((bed) => {
        const code = `BED_${bed.id}`;
        const tariff = findTariff('IPD_BED', code);

        return [
          'BED',
          code,
          `Bed ${bed.bedLabel || bed.bedNumber}`,
          'IPD_BED',
          bed.id,
          tariff?.unitPrice ?? 0,
          tariff?.isActive ?? true,
          tariff?.notes ?? '',
        ];
      }),
      ...CORE_CLINICAL_TARIFFS.map((row) => {
        const [, code, , category] = row;
        const tariff = findTariff(String(category), String(code));

        return tariff
          ? [
              row[0],
              row[1],
              row[2],
              row[3],
              row[4],
              tariff.unitPrice,
              tariff.isActive,
              tariff.notes ?? row[7],
            ]
          : row;
      }),
    ];

    return {
      fileName: `service-tariffs-${branch?.code ?? branchId ?? 'facility'}.csv`,
      facilityId,
      branchId: branchId ?? null,
      columns: SERVICE_TARIFF_COLUMNS,
      rowCount: rows.length - 1,
      csvText: toTariffCsv(rows),
    };
  }

  async importServiceTariffs(
    dto: ImportServiceTariffsCsvDto,
    user: RequestUser,
  ) {
    await this.assertServiceTariffScope(dto.facilityId, dto.branchId, user);
    const records = parseTariffCsvRecords(dto.csvText);

    if (records.length < 2) {
      throw new BadRequestException(
        'The uploaded tariff file must contain a header row and at least one tariff row.',
      );
    }

    const headers = records[0].map(normalizeTariffHeader);
    const requiredColumns = ['code', 'name', 'category', 'unitprice'];
    const missingColumn = requiredColumns.find(
      (column) => !headers.includes(column),
    );

    if (missingColumn) {
      throw new BadRequestException(
        `The tariff file is missing the ${missingColumn} column.`,
      );
    }

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; code?: string; message: string }> = [];

    for (let index = 1; index < records.length; index += 1) {
      const rowNumber = index + 1;
      const row = mapTariffCsvRow(headers, records[index]);
      const code = readTariffText(row, ['code'])?.trim().toUpperCase();
      const name = readTariffText(row, ['name']);
      const category = readTariffText(row, ['category']);
      const unitPrice = readTariffNumber(row, ['unitPrice', 'price']);

      if (!code || !name || !category || unitPrice === undefined) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          code,
          message: 'Code, name, category, and unitPrice are required.',
        });
        continue;
      }

      const tariffType = (
        readTariffText(row, ['tariffType', 'type']) ?? 'MANUAL'
      ).toUpperCase();
      const linkedId = readTariffNumber(row, ['linkedId', 'sourceId']);
      const linkedInt = linkedId ? Math.trunc(linkedId) : undefined;
      const normalizedCategory = this.normalizeTariffCategory(category);
      const payload: CreateServiceTariffDto = {
        code,
        name,
        category: normalizedCategory,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        unitPrice,
        isActive: readTariffBoolean(row, ['isActive', 'active']) ?? true,
        notes: readTariffText(row, ['notes']),
      };

      if (tariffType === 'BILLING_SERVICE') {
        payload.billingServiceId = linkedInt;
      } else if (tariffType === 'LAB_TEST') {
        payload.labTestId = linkedInt;
      } else if (tariffType === 'WARD') {
        payload.wardId = linkedInt;
      } else if (tariffType === 'BED') {
        payload.bedId = linkedInt;
      }

      const existing = await this.prisma.serviceTariff.findFirst({
        where: {
          facilityId: dto.facilityId,
          branchId: dto.branchId ?? null,
          category: normalizedCategory,
          code,
        },
        orderBy: { id: 'desc' },
      });

      try {
        if (existing) {
          await this.updateServiceTariff(existing.id, payload, user);
          updated += 1;
        } else {
          await this.createServiceTariff(payload, user);
          created += 1;
        }
        processed += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          code,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to import this tariff row.',
        });
      }
    }

    return {
      facilityId: dto.facilityId,
      branchId: dto.branchId ?? null,
      processed,
      created,
      updated,
      skipped,
      errors,
    };
  }

  private async assertTariffReferences(dto: {
    facilityId?: number;
    branchId?: number | null;
    billingServiceId?: number | null;
    labTestId?: number | null;
    wardId?: number | null;
    bedId?: number | null;
  }) {
    if (dto.facilityId) {
      const facility = await this.prisma.facility.findUnique({
        where: { id: dto.facilityId },
      });

      if (!facility) {
        throw new NotFoundException(
          `Facility with id ${dto.facilityId} not found`,
        );
      }
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });

      if (!branch) {
        throw new NotFoundException(`Branch with id ${dto.branchId} not found`);
      }

      if (dto.facilityId && branch.facilityId !== dto.facilityId) {
        throw new BadRequestException(
          'Tariff branch must belong to the selected facility',
        );
      }
    }

    if (dto.billingServiceId) {
      const service = await this.prisma.billingService.findUnique({
        where: { id: dto.billingServiceId },
      });

      if (!service) {
        throw new NotFoundException(
          `Billing service with id ${dto.billingServiceId} not found`,
        );
      }
    }

    if (dto.labTestId) {
      const labTest = await this.prisma.labTestCatalog.findUnique({
        where: { id: dto.labTestId },
      });

      if (!labTest) {
        throw new NotFoundException(
          `Lab test with id ${dto.labTestId} not found`,
        );
      }
    }

    if (dto.wardId) {
      const ward = await this.prisma.ward.findUnique({
        where: { id: dto.wardId },
      });

      if (!ward) {
        throw new NotFoundException(`Ward with id ${dto.wardId} not found`);
      }

      if (
        dto.facilityId &&
        ward.facilityId &&
        ward.facilityId !== dto.facilityId
      ) {
        throw new BadRequestException(
          'Tariff ward must belong to the selected facility',
        );
      }
    }

    if (dto.bedId) {
      const bed = await this.prisma.bed.findUnique({
        where: { id: dto.bedId },
      });

      if (!bed) {
        throw new NotFoundException(`Bed with id ${dto.bedId} not found`);
      }

      if (dto.wardId && bed.wardId !== dto.wardId) {
        throw new BadRequestException(
          'Tariff bed must belong to the selected ward',
        );
      }

      if (
        dto.facilityId &&
        bed.facilityId &&
        bed.facilityId !== dto.facilityId
      ) {
        throw new BadRequestException(
          'Tariff bed must belong to the selected facility',
        );
      }
    }
  }

  private async getOrCreateOpenInvoice(params: {
    patientId: number;
    facilityId: number;
    branchId?: number | null;
    appointmentId?: number | null;
    consultationId?: number | null;
    admissionId?: number | null;
    createdByStaffId?: number | null;
  }) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        patientId: params.patientId,
        facilityId: params.facilityId,
        branchId: params.branchId ?? null,
        appointmentId: params.appointmentId ?? null,
        consultationId: params.consultationId ?? null,
        admissionId: params.admissionId ?? null,
        statusCode: {
          in: ['PENDING', 'PARTIALLY_PAID'],
        },
      },
      orderBy: { id: 'desc' },
    });

    if (existing) {
      return existing;
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: params.patientId,
        facilityId: params.facilityId,
        branchId: params.branchId ?? null,
        appointmentId: params.appointmentId ?? null,
        consultationId: params.consultationId ?? null,
        admissionId: params.admissionId ?? null,
        createdByStaffId: params.createdByStaffId ?? undefined,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        statusCode: 'PENDING',
      },
    });
  }

  async openPatientInvoice(
    patientId: number,
    dto: OpenPatientInvoiceDto,
    user: RequestUser,
  ) {
    const patient = await this.patientService.findOneScoped(patientId, user);
    const branchId = dto.branchId ?? user.homeBranchId ?? null;

    this.scopeService.assertBranchAccess(user, patient.facilityId, branchId);

    const invoice = await this.getOrCreateOpenInvoice({
      patientId: patient.id,
      facilityId: patient.facilityId,
      branchId,
      createdByStaffId: user.staffId ?? dto.createdByStaffId ?? null,
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'OPEN_PATIENT_INVOICE_WORKSPACE',
      entityType: 'INVOICE',
      entityId: String(invoice.id),
      description: `Opened invoice workspace for ${patient.patientNumber}`,
      facilityId: patient.facilityId,
      branchId: branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? dto.createdByStaffId,
      afterData: JSON.stringify({
        patientId: patient.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      }),
    });

    return this.getInvoiceByIdScoped(invoice.id, user);
  }

  async getPatientBillingWorkspace(patientId: number, user: RequestUser) {
    const patient = await this.patientService.findOneScoped(patientId, user);
    const scope = this.scopeService.buildReadScope(user);
    const where = {
      ...scope,
      patientId: patient.id,
    };

    const [
      invoices,
      activeAdmissions,
      consultations,
      labOrders,
      prescriptions,
      dispenses,
    ] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          facility: true,
          branch: true,
          patient: true,
          appointment: true,
          consultation: true,
          admission: true,
          items: {
            include: {
              billingService: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          payments: true,
        },
        orderBy: { id: 'desc' },
        take: 20,
      }),
      this.prisma.admission.findMany({
        where: {
          ...where,
          statusCode: { in: ['ADMITTED', 'ACTIVE', 'IN_PROGRESS'] },
        },
        include: {
          ward: true,
          bed: true,
          branch: true,
        },
        orderBy: { id: 'desc' },
        take: 10,
      }),
      this.prisma.consultation.findMany({
        where,
        include: {
          doctor: true,
          appointment: true,
          branch: true,
        },
        orderBy: { id: 'desc' },
        take: 10,
      }),
      this.prisma.labOrder.findMany({
        where,
        include: {
          branch: true,
          requestedBy: true,
          items: {
            include: {
              test: true,
              results: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 10,
      }),
      this.prisma.prescription.findMany({
        where,
        include: {
          branch: true,
          prescribedBy: true,
          items: {
            include: {
              medicine: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 10,
      }),
      this.prisma.dispense.findMany({
        where,
        include: {
          branch: true,
          dispensedBy: true,
          items: {
            include: {
              medicine: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 10,
      }),
    ]);

    const openInvoice =
      invoices.find((invoice) =>
        ['PENDING', 'PARTIALLY_PAID'].includes(invoice.statusCode),
      ) ?? null;

    return {
      patient,
      openInvoice,
      invoices,
      activeAdmissions,
      consultations,
      labOrders,
      prescriptions,
      dispenses,
      summary: {
        invoiceCount: invoices.length,
        openBalance: invoices.reduce(
          (sum, invoice) => sum + invoice.balanceAmount,
          0,
        ),
        activeAdmissions: activeAdmissions.length,
        activeConsultations: consultations.filter(
          (consultation) => consultation.statusCode === 'IN_PROGRESS',
        ).length,
        pendingLabOrders: labOrders.filter((order) =>
          ['REQUESTED', 'IN_PROGRESS'].includes(order.status),
        ).length,
        openPrescriptions: prescriptions.filter((prescription) =>
          ['PRESCRIBED', 'PARTIALLY_DISPENSED'].includes(
            prescription.statusCode,
          ),
        ).length,
      },
    };
  }

  private async recalculateInvoiceTotalsFromItems(invoiceId: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          where: {
            isRemoved: false,
          },
        },
        payments: {
          where: {
            statusCode: 'COMPLETED',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${invoiceId} not found`);
    }

    const subtotal = invoice.items.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    const totalAmount = subtotal - invoice.discountAmount + invoice.taxAmount;
    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const balanceAmount = totalAmount - paidAmount;

    let statusCode = 'PENDING';
    let settledAt: Date | null = null;

    if (paidAmount > 0 && balanceAmount > 0) {
      statusCode = 'PARTIALLY_PAID';
    }

    if (balanceAmount <= 0 && totalAmount > 0) {
      statusCode = 'PAID';
      settledAt = new Date();
    }

    if (totalAmount <= 0) {
      statusCode = 'PENDING';
      settledAt = null;
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal,
        totalAmount,
        paidAmount,
        balanceAmount,
        statusCode,
        settledAt,
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admission: true,
        createdBy: true,
        items: {
          include: {
            billingService: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
        payments: true,
      },
    });
  }

  async addAutoInvoiceItem(params: {
    patientId: number;
    facilityId: number;
    branchId?: number | null;
    appointmentId?: number | null;
    consultationId?: number | null;
    admissionId?: number | null;
    createdByStaffId?: number | null;
    description: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    sourceModule: string;
    sourceEntityType: string;
    sourceEntityId: string;
    billingServiceId?: number;
    chargedAt?: Date;
  }) {
    const invoice = await this.getOrCreateOpenInvoice({
      patientId: params.patientId,
      facilityId: params.facilityId,
      branchId: params.branchId ?? null,
      appointmentId: params.appointmentId ?? null,
      consultationId: params.consultationId ?? null,
      admissionId: params.admissionId ?? null,
      createdByStaffId: params.createdByStaffId ?? null,
    });

    const existingItem = await this.prisma.invoiceItem.findFirst({
      where: {
        invoiceId: invoice.id,
        sourceModule: params.sourceModule,
        sourceEntityType: params.sourceEntityType,
        sourceEntityId: params.sourceEntityId,
        isRemoved: false,
      },
    });

    if (existingItem) {
      return this.getInvoiceById(invoice.id);
    }

    await this.prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        billingServiceId: params.billingServiceId,
        description: params.description,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        lineTotal: params.quantity * params.unitPrice,
        statusCode: 'BILLED',
        notes: params.notes,
        sourceModule: params.sourceModule,
        sourceEntityType: params.sourceEntityType,
        sourceEntityId: params.sourceEntityId,
        isAutoGenerated: true,
        isRemoved: false,
        createdAt: params.chargedAt,
      },
    });

    return this.recalculateInvoiceTotalsFromItems(invoice.id);
  }

  async addInvoiceItem(
    invoiceId: number,
    dto: AddInvoiceItemDto,
    user: RequestUser,
  ) {
    const invoice = await this.getInvoiceByIdScoped(invoiceId, user);

    if (['CANCELLED', 'VOID'].includes(invoice.statusCode?.toUpperCase())) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} is ${invoice.statusCode} and cannot receive new lines.`,
      );
    }

    const quantity = dto.quantity ?? 1;
    if (quantity <= 0) {
      throw new BadRequestException('Invoice line quantity must be positive');
    }

    const chargeType: InvoiceChargeType =
      dto.chargeType ??
      (dto.labTestId
        ? 'LAB_TEST'
        : dto.branchMedicineStockId || dto.medicineId
          ? 'MEDICINE'
          : dto.billingServiceId
            ? 'SERVICE'
            : 'MANUAL');
    const chargedAt = this.parseChargeDate(dto.chargedAt);
    let description = dto.description?.trim() ?? '';
    let resolvedUnitPrice = dto.unitPrice ?? 0;
    let billingService: {
      id: number;
      code: string;
      name: string;
      category: string | null;
      defaultPrice: number;
    } | null = null;
    let sourceModule = 'BILLING';
    let sourceEntityType = 'MANUAL_LINE';
    let sourceEntityId = `invoice-${invoice.id}-${Date.now()}`;

    if (chargeType === 'SERVICE') {
      if (!dto.billingServiceId) {
        throw new BadRequestException('Select a billing service for this line');
      }

      billingService = await this.prisma.billingService.findUnique({
        where: { id: dto.billingServiceId },
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          defaultPrice: true,
        },
      });

      if (!billingService) {
        throw new NotFoundException(
          `Billing service with id ${dto.billingServiceId} not found`,
        );
      }

      description = description || billingService.name;

      if (dto.unitPrice == null) {
        resolvedUnitPrice = await this.resolveChargePrice({
          facilityId: invoice.facilityId,
          branchId: invoice.branchId,
          category: billingService.category ?? 'SERVICE',
          code: billingService.code,
          billingServiceId: billingService.id,
          fallbackPrice: billingService.defaultPrice,
        });
      }

      sourceEntityType = 'BILLING_SERVICE';
      sourceEntityId = `billing-service-${billingService.id}-${chargedAt.toISOString()}`;
    }

    if (chargeType === 'LAB_TEST') {
      if (!dto.labTestId) {
        throw new BadRequestException('Select a lab test for this line');
      }

      const labTest = await this.prisma.labTestCatalog.findUnique({
        where: { id: dto.labTestId },
      });

      if (!labTest) {
        throw new NotFoundException(
          `Lab test with id ${dto.labTestId} not found`,
        );
      }

      description = description || `Lab Test: ${labTest.testName}`;

      if (dto.unitPrice == null) {
        resolvedUnitPrice = await this.resolveChargePrice({
          facilityId: invoice.facilityId,
          branchId: invoice.branchId,
          category: 'LAB',
          code: `LAB_TEST_${labTest.id}`,
          labTestId: labTest.id,
          fallbackPrice: 0,
        });
      }

      sourceModule = 'LAB';
      sourceEntityType = 'LAB_TEST';
      sourceEntityId = `lab-test-${labTest.id}-${chargedAt.toISOString()}`;
    }

    if (chargeType === 'MEDICINE') {
      if (!invoice.branchId) {
        throw new BadRequestException(
          'Medicine charges require a branch invoice so stock and prices stay separated.',
        );
      }

      let stock = dto.branchMedicineStockId
        ? await this.prisma.branchMedicineStock.findUnique({
            where: { id: dto.branchMedicineStockId },
            include: { medicine: true },
          })
        : null;

      if (!stock && dto.medicineId) {
        stock = await this.prisma.branchMedicineStock.findFirst({
          where: {
            facilityId: invoice.facilityId,
            branchId: invoice.branchId ?? undefined,
            medicineId: dto.medicineId,
            isActive: true,
          },
          include: { medicine: true },
          orderBy: { id: 'desc' },
        });
      }

      if (!stock) {
        throw new BadRequestException(
          'Select a branch medicine stock item before billing a medicine',
        );
      }

      this.scopeService.assertBranchAccess(
        user,
        stock.facilityId,
        stock.branchId,
      );

      if (
        stock.facilityId !== invoice.facilityId ||
        (invoice.branchId && stock.branchId !== invoice.branchId)
      ) {
        throw new BadRequestException(
          'Medicine stock must belong to the invoice facility and branch',
        );
      }

      description = description || `Medicine: ${stock.medicine.name}`;
      resolvedUnitPrice = dto.unitPrice ?? stock.unitPrice;
      sourceModule = 'PHARMACY';
      sourceEntityType = 'BRANCH_MEDICINE_STOCK';
      sourceEntityId = `branch-stock-${stock.id}-${chargedAt.toISOString()}`;
    }

    if (!description) {
      throw new BadRequestException('Invoice line description is required');
    }

    if (resolvedUnitPrice < 0) {
      throw new BadRequestException('Invoice line price cannot be negative');
    }

    const item = await this.prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        billingServiceId: billingService?.id,
        description,
        quantity,
        unitPrice: resolvedUnitPrice,
        lineTotal: quantity * resolvedUnitPrice,
        statusCode: dto.statusCode ?? 'BILLED',
        notes: dto.notes,
        sourceModule,
        sourceEntityType,
        sourceEntityId,
        isAutoGenerated: false,
        isRemoved: false,
        updatedByStaffId: user.staffId ?? dto.updatedByStaffId,
        createdAt: chargedAt,
      },
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'ADD_INVOICE_ITEM',
      entityType: 'INVOICE_ITEM',
      entityId: String(item.id),
      description: `Added invoice line to ${invoice.invoiceNumber}`,
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? dto.updatedByStaffId,
      afterData: JSON.stringify(item),
    });

    return this.recalculateInvoiceTotalsFromItems(invoice.id);
  }

  async updateInvoiceItem(
    id: number,
    dto: UpdateInvoiceItemDto,
    user: RequestUser,
  ) {
    const item = await this.prisma.invoiceItem.findUnique({
      where: { id },
      include: {
        invoice: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Invoice item with id ${id} not found`);
    }

    this.scopeService.assertBranchAccess(
      user,
      item.invoice.facilityId,
      item.invoice.branchId,
    );

    if (item.isRemoved) {
      throw new BadRequestException('Removed invoice item cannot be updated');
    }

    const quantity = dto.quantity ?? item.quantity;
    const unitPrice = dto.unitPrice ?? item.unitPrice;

    await this.prisma.invoiceItem.update({
      where: { id },
      data: {
        description: dto.description ?? item.description,
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
        notes: dto.notes ?? item.notes,
        statusCode: dto.statusCode ?? item.statusCode,
        updatedByStaffId: user.staffId ?? undefined,
      },
    });

    return this.recalculateInvoiceTotalsFromItems(item.invoiceId);
  }

  async removeInvoiceItem(
    id: number,
    dto: RemoveInvoiceItemDto,
    user?: RequestUser,
  ) {
    const item = await this.prisma.invoiceItem.findUnique({
      where: { id },
      include: {
        invoice: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Invoice item with id ${id} not found`);
    }

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        item.invoice.facilityId,
        item.invoice.branchId,
      );
    }

    if (item.isRemoved) {
      throw new BadRequestException('Invoice item already removed');
    }

    await this.prisma.invoiceItem.update({
      where: { id },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removedReason: dto.reason,
        updatedByStaffId: user?.staffId ?? dto.updatedByStaffId,
        statusCode: 'REMOVED',
      },
    });

    return this.recalculateInvoiceTotalsFromItems(item.invoiceId);
  }

  async createBillingService(dto: CreateBillingServiceDto) {
    const existing = await this.prisma.billingService.findFirst({
      where: {
        OR: [{ code: dto.code }, { name: dto.name }],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Billing service code or name already exists',
      );
    }

    const billingService = await this.prisma.billingService.create({
      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category,
        defaultPrice: dto.defaultPrice ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'CREATE_BILLING_SERVICE',
      entityType: 'BILLING_SERVICE',
      entityId: String(billingService.id),
      description: `Created billing service ${billingService.name}`,
      afterData: JSON.stringify(billingService),
    });

    return billingService;
  }

  getAllBillingServices() {
    return this.prisma.billingService.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async createServiceTariff(dto: CreateServiceTariffDto, user?: RequestUser) {
    await this.assertTariffReferences(dto);

    const duplicate = await this.prisma.serviceTariff.findFirst({
      where: {
        facilityId: dto.facilityId,
        branchId: dto.branchId ?? null,
        category: this.normalizeTariffCategory(dto.category),
        code: dto.code.trim().toUpperCase(),
        isActive: true,
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        'An active tariff with this code already exists for this facility and branch',
      );
    }

    const tariff = await this.prisma.serviceTariff.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        category: this.normalizeTariffCategory(dto.category),
        facilityId: dto.facilityId,
        branchId: dto.branchId ?? null,
        billingServiceId: dto.billingServiceId ?? null,
        labTestId: dto.labTestId ?? null,
        wardId: dto.wardId ?? null,
        bedId: dto.bedId ?? null,
        unitPrice: dto.unitPrice,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
      },
      include: {
        facility: true,
        branch: true,
        billingService: true,
        labTest: true,
        ward: true,
        bed: true,
      },
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'CREATE_SERVICE_TARIFF',
      entityType: 'SERVICE_TARIFF',
      entityId: String(tariff.id),
      description: `Created tariff ${tariff.name}`,
      facilityId: tariff.facilityId,
      branchId: tariff.branchId ?? undefined,
      actorUserId: user?.userId,
      actorStaffId: user?.staffId ?? undefined,
      afterData: JSON.stringify(tariff),
    });

    return tariff;
  }

  getServiceTariffs(user?: RequestUser) {
    const where: Prisma.ServiceTariffWhereInput = {};

    if (user?.roleCode && user.roleCode !== 'SUPER_ADMIN') {
      if (!user.homeFacilityId) {
        throw new BadRequestException('User has no home facility assigned');
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

        where.OR = [
          { branchId: null },
          { branchId: { in: Array.from(branchIds) } },
        ];
      }
    }

    return this.prisma.serviceTariff.findMany({
      where,
      include: {
        facility: true,
        branch: true,
        billingService: true,
        labTest: true,
        ward: true,
        bed: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async updateServiceTariff(
    id: number,
    dto: UpdateServiceTariffDto,
    user?: RequestUser,
  ) {
    const existing = await this.prisma.serviceTariff.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Service tariff with id ${id} not found`);
    }

    await this.assertTariffReferences({
      facilityId: dto.facilityId ?? existing.facilityId,
      branchId: dto.branchId === undefined ? existing.branchId : dto.branchId,
      billingServiceId:
        dto.billingServiceId === undefined
          ? existing.billingServiceId
          : dto.billingServiceId,
      labTestId:
        dto.labTestId === undefined ? existing.labTestId : dto.labTestId,
      wardId: dto.wardId === undefined ? existing.wardId : dto.wardId,
      bedId: dto.bedId === undefined ? existing.bedId : dto.bedId,
    });

    const updated = await this.prisma.serviceTariff.update({
      where: { id },
      data: {
        code: dto.code ? dto.code.trim().toUpperCase() : undefined,
        name: dto.name ? dto.name.trim() : undefined,
        category: dto.category
          ? this.normalizeTariffCategory(dto.category)
          : undefined,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        billingServiceId: dto.billingServiceId,
        labTestId: dto.labTestId,
        wardId: dto.wardId,
        bedId: dto.bedId,
        unitPrice: dto.unitPrice,
        isActive: dto.isActive,
        notes: dto.notes,
      },
      include: {
        facility: true,
        branch: true,
        billingService: true,
        labTest: true,
        ward: true,
        bed: true,
      },
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'UPDATE_SERVICE_TARIFF',
      entityType: 'SERVICE_TARIFF',
      entityId: String(updated.id),
      description: `Updated tariff ${updated.name}`,
      facilityId: updated.facilityId,
      branchId: updated.branchId ?? undefined,
      actorUserId: user?.userId,
      actorStaffId: user?.staffId ?? undefined,
      beforeData: JSON.stringify(existing),
      afterData: JSON.stringify(updated),
    });

    return updated;
  }

  async resolveChargePrice(params: {
    facilityId: number;
    branchId?: number | null;
    category: string;
    code?: string | null;
    billingServiceId?: number | null;
    labTestId?: number | null;
    wardId?: number | null;
    bedId?: number | null;
    fallbackPrice?: number | null;
  }) {
    const normalizedCategory = this.normalizeTariffCategory(params.category);
    let fallbackPrice = params.fallbackPrice ?? 0;

    if (params.billingServiceId && params.fallbackPrice == null) {
      const billingService = await this.prisma.billingService.findUnique({
        where: { id: params.billingServiceId },
        select: { defaultPrice: true },
      });

      fallbackPrice = billingService?.defaultPrice ?? 0;
    }

    const identityFilters: any[] = [];

    if (params.bedId) {
      identityFilters.push({ bedId: params.bedId });
    }

    if (params.wardId) {
      identityFilters.push({ wardId: params.wardId });
    }

    if (params.labTestId) {
      identityFilters.push({ labTestId: params.labTestId });
    }

    if (params.billingServiceId) {
      identityFilters.push({ billingServiceId: params.billingServiceId });
    }

    if (params.code) {
      identityFilters.push({ code: params.code.trim().toUpperCase() });
    }

    if (identityFilters.length === 0) {
      return fallbackPrice;
    }

    const branchFilters = params.branchId
      ? [{ branchId: params.branchId }, { branchId: null }]
      : [{ branchId: null }];

    const candidates = await this.prisma.serviceTariff.findMany({
      where: {
        facilityId: params.facilityId,
        category: normalizedCategory,
        isActive: true,
        AND: [{ OR: branchFilters }, { OR: identityFilters }],
      },
    });

    if (candidates.length === 0) {
      return fallbackPrice;
    }

    const ranked = candidates.sort((a, b) => {
      const score = (tariff: (typeof candidates)[number]) => {
        let value = tariff.branchId === params.branchId ? 100 : 0;
        if (params.bedId && tariff.bedId === params.bedId) value += 70;
        if (params.wardId && tariff.wardId === params.wardId) value += 55;
        if (params.labTestId && tariff.labTestId === params.labTestId) {
          value += 60;
        }
        if (
          params.billingServiceId &&
          tariff.billingServiceId === params.billingServiceId
        ) {
          value += 45;
        }
        if (params.code && tariff.code === params.code.trim().toUpperCase()) {
          value += 35;
        }

        return value;
      };

      return score(b) - score(a);
    });

    return ranked[0]?.unitPrice ?? fallbackPrice;
  }

  async billAdmissionBedDay(
    admissionId: number,
    params?: {
      chargedDate?: Date;
      quantity?: number;
      unitPrice?: number;
      notes?: string;
      createdByStaffId?: number | null;
    },
  ) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: true,
        ward: true,
        bed: true,
      },
    });

    if (!admission) {
      throw new NotFoundException(`Admission with id ${admissionId} not found`);
    }

    const chargedDate = params?.chargedDate ?? new Date();
    const dayKey = this.formatChargeDate(chargedDate);
    const unitPrice =
      params?.unitPrice ??
      (await this.resolveChargePrice({
        facilityId: admission.facilityId,
        branchId: admission.branchId,
        category: 'IPD_BED',
        code: admission.bedId
          ? `BED_${admission.bedId}`
          : `WARD_${admission.wardId}`,
        wardId: admission.wardId,
        bedId: admission.bedId,
        fallbackPrice: 0,
      }));

    const wardName = admission.ward?.name ?? `Ward #${admission.wardId}`;
    const bedLabel = admission.bed
      ? `, bed ${admission.bed.bedLabel || admission.bed.bedNumber}`
      : '';

    return this.addAutoInvoiceItem({
      patientId: admission.patientId,
      facilityId: admission.facilityId,
      branchId: admission.branchId,
      appointmentId: admission.appointmentId,
      consultationId: admission.consultationId,
      admissionId: admission.id,
      createdByStaffId:
        params?.createdByStaffId ?? admission.admittedByStaffId ?? null,
      description: `IPD Bed Charge: ${wardName}${bedLabel} (${dayKey})`,
      quantity: params?.quantity ?? 1,
      unitPrice,
      notes:
        params?.notes ??
        'Automatically posted from the active admission bed-day charge.',
      sourceModule: 'IPD',
      sourceEntityType: 'BED_DAY',
      sourceEntityId: `${admission.id}:${dayKey}`,
      chargedAt: chargedDate,
    });
  }

  async createInvoice(dto: CreateInvoiceDto) {
    let invoiceNumber = dto.invoiceNumber;

    if (invoiceNumber) {
      const existing = await this.prisma.invoice.findFirst({
        where: { invoiceNumber },
      });

      if (existing) {
        throw new BadRequestException('Invoice number already exists');
      }
    } else {
      invoiceNumber = await this.generateInvoiceNumber();
    }

    const patient = await this.patientService.findOne(dto.patientId);

    let appointment: { facilityId: number; branchId?: number | null } | null =
      null;
    if (dto.appointmentId) {
      appointment = await this.appointmentService.findOne(dto.appointmentId);
    }

    let consultation: { facilityId: number; branchId?: number | null } | null =
      null;
    if (dto.consultationId) {
      consultation = await this.consultationService.findOne(dto.consultationId);
    }

    let admission: { facilityId: number; branchId?: number | null } | null =
      null;
    if (dto.admissionId) {
      admission = await this.prisma.admission.findUnique({
        where: { id: dto.admissionId },
        include: {
          facility: true,
          branch: true,
          patient: true,
          ward: true,
          bed: true,
        },
      });

      if (!admission) {
        throw new NotFoundException(
          `Admission with id ${dto.admissionId} not found`,
        );
      }
    }

    let createdByStaff: { branchId?: number | null } | null = null;
    if (dto.createdByStaffId) {
      createdByStaff = await this.staffService.findOne(dto.createdByStaffId);
    }

    let subtotal = 0;
    const preparedItems: Array<{
      billingServiceId?: number;
      description: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      statusCode: string;
      notes?: string;
    }> = [];

    for (const item of dto.items) {
      let resolvedUnitPrice = item.unitPrice ?? 0;

      if (item.billingServiceId) {
        const service = await this.prisma.billingService.findUnique({
          where: { id: item.billingServiceId },
        });

        if (!service) {
          throw new NotFoundException(
            `Billing service with id ${item.billingServiceId} not found`,
          );
        }

        if (item.unitPrice == null) {
          resolvedUnitPrice = service.defaultPrice;
        }
      }

      const quantity = item.quantity ?? 1;
      const lineTotal = quantity * resolvedUnitPrice;
      subtotal += lineTotal;

      preparedItems.push({
        billingServiceId: item.billingServiceId,
        description: item.description,
        quantity,
        unitPrice: resolvedUnitPrice,
        lineTotal,
        statusCode: 'BILLED',
        notes: item.notes,
      });
    }

    const discountAmount = dto.discountAmount ?? 0;
    const taxAmount = dto.taxAmount ?? 0;
    const totalAmount = subtotal - discountAmount + taxAmount;
    const balanceAmount = totalAmount;

    const facilityId =
      admission?.facilityId ??
      consultation?.facilityId ??
      appointment?.facilityId ??
      patient.facilityId;

    const branchId =
      admission?.branchId ??
      consultation?.branchId ??
      appointment?.branchId ??
      createdByStaff?.branchId ??
      null;

    const invoice = await this.prisma.invoice.create({
      data: {
        facilityId,
        branchId,
        invoiceNumber,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        consultationId: dto.consultationId,
        admissionId: dto.admissionId,
        createdByStaffId: dto.createdByStaffId,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        balanceAmount,
        notes: dto.notes,
        statusCode: 'PENDING',
        items: {
          create: preparedItems,
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admission: true,
        createdBy: true,
        items: {
          include: {
            billingService: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
        payments: true,
      },
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'CREATE_INVOICE',
      entityType: 'INVOICE',
      entityId: String(invoice.id),
      description: `Created invoice ${invoice.invoiceNumber} for patient ${invoice.patientId}`,
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
      actorStaffId: dto.createdByStaffId,
      afterData: JSON.stringify(invoice),
    });

    await this.notificationService.create({
      title: 'Invoice Created',
      message: `Invoice ${invoice.invoiceNumber} has been created for patient ${invoice.patientId}.`,
      notificationType: 'INVOICE_CREATED',
      severity: 'INFO',
      moduleName: 'BILLING',
      entityType: 'INVOICE',
      entityId: String(invoice.id),
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
      targetStaffId: dto.createdByStaffId,
    });

    return invoice;
  }

  getAllInvoices() {
    return this.prisma.invoice.findMany({
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admission: true,
        createdBy: true,
        items: {
          include: {
            billingService: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
        payments: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getInvoiceById(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admission: true,
        createdBy: true,
        items: {
          include: {
            billingService: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    return invoice;
  }

  async getPatientBillingByPatientNumber(patientNumber: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { patientNumber },
      include: {
        facility: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with number ${patientNumber} not found`,
      );
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        facility: true,
        branch: true,
        appointment: true,
        consultation: true,
        admission: true,
        items: {
          include: {
            billingService: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
        payments: true,
      },
      orderBy: { id: 'desc' },
    });

    const totalInvoiced = invoices.reduce(
      (sum, invoice) => sum + invoice.totalAmount,
      0,
    );
    const totalPaid = invoices.reduce(
      (sum, invoice) => sum + invoice.paidAmount,
      0,
    );
    const totalBalance = invoices.reduce(
      (sum, invoice) => sum + invoice.balanceAmount,
      0,
    );

    return {
      patient,
      summary: {
        totalInvoices: invoices.length,
        totalInvoiced,
        totalPaid,
        totalBalance,
      },
      invoices,
    };
  }

  getAllInvoicesScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.invoice.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admission: true,
        createdBy: true,
        items: {
          include: {
            billingService: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
        payments: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getInvoiceByIdScoped(id: number, user: RequestUser) {
    const invoice = await this.getInvoiceById(id);

    this.scopeService.assertBranchAccess(
      user,
      invoice.facilityId,
      invoice.branchId,
    );

    return invoice;
  }

  async getInvoicePdf(id: number, user: RequestUser) {
    const invoice = await this.getInvoiceByIdScoped(id, user);
    const currency =
      invoice.facility?.currency || invoice.branch?.currency || 'KES';
    const printableItems = (invoice.items ?? []).filter(
      (item) => item.isRemoved !== true,
    );
    const payments = invoice.payments ?? [];

    return createHospitalPdfBuffer(
      {
        title: 'Patient Invoice',
        subtitle: invoice.invoiceNumber,
        reference: invoice.statusCode,
        facility: invoice.facility,
        branch: invoice.branch,
      },
      (doc) => {
        addSectionTitle(doc, 'Patient and invoice details');
        addKeyValueGrid(doc, [
          { label: 'Patient', value: patientName(invoice.patient) },
          { label: 'Patient number', value: invoice.patient?.patientNumber },
          { label: 'Phone', value: invoice.patient?.phonePrimary },
          { label: 'Gender', value: invoice.patient?.gender },
          { label: 'Invoice number', value: invoice.invoiceNumber },
          { label: 'Issued at', value: formatPdfDate(invoice.issuedAt) },
          { label: 'Branch', value: invoice.branch?.name },
          { label: 'Created by', value: staffName(invoice.createdBy) },
          { label: 'Appointment ID', value: invoice.appointmentId },
          { label: 'Consultation ID', value: invoice.consultationId },
          { label: 'Admission ID', value: invoice.admissionId },
          { label: 'Status', value: invoice.statusCode },
        ]);

        addSectionTitle(doc, 'Invoice lines');
        addTable(
          doc,
          [
            {
              header: 'Date',
              width: 70,
              render: (item) => formatPdfDate(item.createdAt),
            },
            {
              header: 'Description',
              width: 165,
              render: (item) => item.description,
            },
            { header: 'Qty', width: 40, render: (item) => item.quantity },
            {
              header: 'Unit',
              width: 80,
              render: (item) => formatPdfMoney(item.unitPrice, currency),
            },
            {
              header: 'Total',
              width: 85,
              render: (item) => formatPdfMoney(item.lineTotal, currency),
            },
            {
              header: 'Source',
              width: 80,
              render: (item) =>
                item.isAutoGenerated
                  ? item.sourceModule || item.sourceEntityType || 'Auto'
                  : 'Manual',
            },
          ],
          printableItems,
          'No active invoice lines found.',
        );

        addSectionTitle(doc, 'Totals');
        addKeyValueGrid(doc, [
          {
            label: 'Subtotal',
            value: formatPdfMoney(invoice.subtotal, currency),
          },
          {
            label: 'Discount',
            value: formatPdfMoney(invoice.discountAmount, currency),
          },
          { label: 'Tax', value: formatPdfMoney(invoice.taxAmount, currency) },
          {
            label: 'Total',
            value: formatPdfMoney(invoice.totalAmount, currency),
          },
          {
            label: 'Paid',
            value: formatPdfMoney(invoice.paidAmount, currency),
          },
          {
            label: 'Balance',
            value: formatPdfMoney(invoice.balanceAmount, currency),
          },
        ]);

        addSectionTitle(doc, 'Payment history');
        addTable(
          doc,
          [
            {
              header: 'Receipt',
              width: 125,
              render: (item) => item.receiptNumber,
            },
            {
              header: 'Method',
              width: 82,
              render: (item) => item.paymentMethod,
            },
            {
              header: 'Amount',
              width: 88,
              render: (item) => formatPdfMoney(item.amount, currency),
            },
            { header: 'Status', width: 80, render: (item) => item.statusCode },
            {
              header: 'Paid at',
              width: 122,
              render: (item) => formatPdfDate(item.paidAt),
            },
          ],
          payments,
          'No payments recorded yet.',
        );

        addSectionTitle(doc, 'Notes and payment details');
        addParagraph(
          doc,
          'Invoice notes',
          invoice.notes || 'No extra invoice notes.',
        );
        addKeyValueGrid(doc, [
          { label: 'M-PESA Paybill', value: invoice.facility?.mpesaPaybill },
          { label: 'M-PESA Till', value: invoice.facility?.mpesaTillNumber },
          {
            label: 'M-PESA Shortcode',
            value: invoice.facility?.mpesaShortcode,
          },
          {
            label: 'Balance due',
            value: formatPdfMoney(invoice.balanceAmount, currency),
          },
        ]);
      },
    );
  }

  async createCashPayment(dto: CreateCashPaymentDto) {
    const existing = await this.prisma.payment.findFirst({
      where: { receiptNumber: dto.receiptNumber },
    });

    if (existing) {
      throw new BadRequestException('Receipt number already exists');
    }

    const invoice = await this.getInvoiceById(dto.invoiceId);

    if (dto.receivedByStaffId) {
      await this.staffService.findOne(dto.receivedByStaffId);
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (dto.amount > invoice.balanceAmount) {
      throw new BadRequestException(
        `Payment exceeds outstanding balance of ${invoice.balanceAmount}`,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        facilityId: invoice.facilityId,
        branchId: invoice.branchId,
        receiptNumber: dto.receiptNumber,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        paymentMethod: 'CASH',
        statusCode: 'COMPLETED',
        paidAt: new Date(),
        confirmedAt: new Date(),
        receivedByStaffId: dto.receivedByStaffId,
        notes: dto.notes,
      },
      include: {
        facility: true,
        branch: true,
        invoice: true,
        receivedBy: true,
      },
    });

    await this.recalculateInvoice(dto.invoiceId);

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'CREATE_CASH_PAYMENT',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `Cash payment received for invoice ${dto.invoiceId}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      actorStaffId: dto.receivedByStaffId,
      afterData: JSON.stringify(payment),
    });

    await this.notificationService.create({
      title: 'Cash Payment Received',
      message: `Cash payment of ${payment.amount} received for invoice ${payment.invoiceId}.`,
      notificationType: 'PAYMENT_RECEIVED',
      severity: 'INFO',
      moduleName: 'BILLING',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      targetStaffId: dto.receivedByStaffId,
    });

    return payment;
  }

  async createMpesaPaymentRequest(dto: CreateMpesaPaymentRequestDto) {
    const existing = await this.prisma.payment.findFirst({
      where: { receiptNumber: dto.receiptNumber },
    });

    if (existing) {
      throw new BadRequestException('Receipt number already exists');
    }

    const invoice = await this.getInvoiceById(dto.invoiceId);

    if (dto.receivedByStaffId) {
      await this.staffService.findOne(dto.receivedByStaffId);
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (dto.amount > invoice.balanceAmount) {
      throw new BadRequestException(
        `Payment exceeds outstanding balance of ${invoice.balanceAmount}`,
      );
    }

    const checkoutRequestId = `CHK-${Date.now()}`;
    const merchantRequestId = `MRC-${Date.now()}`;

    const payment = await this.prisma.payment.create({
      data: {
        facilityId: invoice.facilityId,
        branchId: invoice.branchId,
        receiptNumber: dto.receiptNumber,
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        paymentMethod: 'MPESA',
        statusCode: 'PENDING',
        phoneNumber: dto.phoneNumber,
        checkoutRequestId,
        merchantRequestId,
        receivedByStaffId: dto.receivedByStaffId,
        notes: dto.notes,
      },
      include: {
        facility: true,
        branch: true,
        invoice: true,
        receivedBy: true,
      },
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'CREATE_MPESA_PAYMENT_REQUEST',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `M-PESA payment request initiated for invoice ${dto.invoiceId}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      actorStaffId: dto.receivedByStaffId,
      afterData: JSON.stringify(payment),
    });

    await this.notificationService.create({
      title: 'M-PESA Payment Request Created',
      message: `M-PESA payment request initiated for invoice ${dto.invoiceId}.`,
      notificationType: 'PAYMENT_REQUESTED',
      severity: 'INFO',
      moduleName: 'BILLING',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      targetStaffId: dto.receivedByStaffId,
    });

    return {
      message:
        'M-PESA payment request created. In production this is where STK push is initiated.',
      payment,
      stkSimulation: {
        phoneNumber: dto.phoneNumber,
        amount: dto.amount,
        checkoutRequestId,
        merchantRequestId,
      },
    };
  }

  async confirmMpesaPayment(dto: ConfirmMpesaPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        checkoutRequestId: dto.checkoutRequestId,
        paymentMethod: 'MPESA',
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `M-PESA payment with checkoutRequestId ${dto.checkoutRequestId} not found`,
      );
    }

    if (payment.statusCode === 'COMPLETED') {
      return {
        message: 'Payment already confirmed',
        payment,
      };
    }

    const beforeData = JSON.stringify(payment);

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        statusCode: 'COMPLETED',
        confirmedAt: new Date(),
        paidAt: new Date(),
        merchantRequestId: dto.merchantRequestId ?? payment.merchantRequestId,
        mpesaReceiptNumber: dto.mpesaReceiptNumber,
        transactionRef: dto.transactionRef,
        callbackPayload: dto.callbackPayload,
      },
    });

    await this.recalculateInvoice(payment.invoiceId);

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'CONFIRM_MPESA_PAYMENT',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `M-PESA payment confirmed for invoice ${payment.invoiceId}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      beforeData,
      afterData: JSON.stringify(updatedPayment),
    });

    await this.notificationService.create({
      title: 'M-PESA Payment Confirmed',
      message: `M-PESA payment confirmed for invoice ${payment.invoiceId}.`,
      notificationType: 'PAYMENT_CONFIRMED',
      severity: 'INFO',
      moduleName: 'BILLING',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
    });

    return this.getInvoiceById(payment.invoiceId);
  }

  async failMpesaPayment(checkoutRequestId: string, callbackPayload?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        checkoutRequestId,
        paymentMethod: 'MPESA',
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `M-PESA payment with checkoutRequestId ${checkoutRequestId} not found`,
      );
    }

    const beforeData = JSON.stringify(payment);

    const failedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        statusCode: 'FAILED',
        callbackPayload,
      },
    });

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'FAIL_MPESA_PAYMENT',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `M-PESA payment failed for invoice ${payment.invoiceId}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      beforeData,
      afterData: JSON.stringify(failedPayment),
    });

    await this.notificationService.create({
      title: 'M-PESA Payment Failed',
      message: `M-PESA payment failed for invoice ${payment.invoiceId}.`,
      notificationType: 'PAYMENT_FAILED',
      severity: 'CRITICAL',
      moduleName: 'BILLING',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
    });

    return failedPayment;
  }

  async getRevenueIntegrity(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    const exceptionItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: scope,
        OR: [
          {
            isRemoved: true,
          },
          {
            isAutoGenerated: true,
            isRemoved: false,
            OR: [{ unitPrice: 0 }, { lineTotal: 0 }],
          },
        ],
      },
      include: {
        billingService: true,
        updatedBy: true,
        invoice: {
          include: {
            facility: true,
            branch: true,
            patient: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const missingPriceItems = exceptionItems.filter(
      (item) =>
        item.isAutoGenerated &&
        !item.isRemoved &&
        (item.unitPrice <= 0 || item.lineTotal <= 0),
    );
    const removedItems = exceptionItems.filter((item) => item.isRemoved);
    const autoGeneratedItems = await this.prisma.invoiceItem.count({
      where: {
        invoice: scope,
        isAutoGenerated: true,
      },
    });

    return {
      summary: {
        exceptionCount: exceptionItems.length,
        missingPriceCount: missingPriceItems.length,
        removedLineCount: removedItems.length,
        autoGeneratedCount: autoGeneratedItems,
      },
      missingPriceItems,
      removedItems,
      exceptionItems,
    };
  }

  async getCashierClose(user: RequestUser, date?: string) {
    const scope = this.scopeService.buildReadScope(user);
    const closeDate = date ? new Date(date) : new Date();

    if (Number.isNaN(closeDate.getTime())) {
      throw new BadRequestException('Invalid close date');
    }

    const start = new Date(closeDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(closeDate);
    end.setHours(23, 59, 59, 999);

    const payments = await this.prisma.payment.findMany({
      where: {
        ...scope,
        statusCode: 'COMPLETED',
        paidAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        invoice: {
          include: {
            patient: true,
          },
        },
        receivedBy: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    const invoicesIssued = await this.prisma.invoice.findMany({
      where: {
        ...scope,
        issuedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        patient: true,
      },
      orderBy: { issuedAt: 'asc' },
    });

    const removedItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: scope,
        isRemoved: true,
        removedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        invoice: {
          include: {
            patient: true,
          },
        },
        updatedBy: true,
      },
      orderBy: { removedAt: 'asc' },
    });

    const paymentsByMethod = payments.reduce<Record<string, number>>(
      (totals, payment) => {
        const method = payment.paymentMethod || 'UNKNOWN';
        totals[method] = (totals[method] ?? 0) + payment.amount;
        return totals;
      },
      {},
    );

    return {
      date: this.formatChargeDate(start),
      summary: {
        paymentCount: payments.length,
        totalCollected: payments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        ),
        invoiceCount: invoicesIssued.length,
        invoiceTotal: invoicesIssued.reduce(
          (sum, invoice) => sum + invoice.totalAmount,
          0,
        ),
        removedLineCount: removedItems.length,
        removedLineValue: removedItems.reduce(
          (sum, item) => sum + item.lineTotal,
          0,
        ),
        paymentsByMethod,
      },
      payments,
      invoicesIssued,
      removedItems,
    };
  }

  async getBillingDashboard(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);
    const totalInvoices = await this.prisma.invoice.count({ where: scope });
    const pendingInvoices = await this.prisma.invoice.count({
      where: { ...scope, statusCode: 'PENDING' },
    });
    const partiallyPaidInvoices = await this.prisma.invoice.count({
      where: { ...scope, statusCode: 'PARTIALLY_PAID' },
    });
    const paidInvoices = await this.prisma.invoice.count({
      where: { ...scope, statusCode: 'PAID' },
    });

    const invoiceAggregates = await this.prisma.invoice.aggregate({
      where: scope,
      _sum: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
      },
    });

    return {
      counts: {
        totalInvoices,
        pendingInvoices,
        partiallyPaidInvoices,
        paidInvoices,
      },
      sums: {
        totalAmount: invoiceAggregates._sum.totalAmount ?? 0,
        paidAmount: invoiceAggregates._sum.paidAmount ?? 0,
        balanceAmount: invoiceAggregates._sum.balanceAmount ?? 0,
      },
    };
  }

  private async recalculateInvoice(invoiceId: number) {
    return this.recalculateInvoiceTotalsFromItems(invoiceId);
  }
}
