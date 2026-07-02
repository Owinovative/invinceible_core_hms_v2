import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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
  addCompactDefinitionList,
  addCompactParagraph,
  addCompactTable,
  addSectionTitle,
  addTotalsPanel,
  createHospitalPdfBuffer,
  formatPdfMoney,
  patientName,
  staffName,
} from '../common/pdf/hospital-pdf';
import {
  paginatedResponse,
  parsePagination,
  type PaginationQuery,
} from '../common/pagination/pagination';
import { CacheService } from '../resilience/cache.service';
import { SafeLoggerService } from '../resilience/safe-logger.service';
import { serializeMaybeJsonCompact } from '../common/storage/compact-payload';
import { EtimsService } from '../integration/etims/etims.service';

type TariffCsvRow = Record<string, string>;
type InvoiceChargeType = 'SERVICE' | 'LAB_TEST' | 'MEDICINE' | 'MANUAL';

type MpesaStkResponse = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  errorCode?: string;
  errorMessage?: string;
};

type MpesaQueryResponse = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  ResultCode?: string;
  ResultDesc?: string;
  errorCode?: string;
  errorMessage?: string;
};

type MpesaConfig = {
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  shortcode?: string;
  callbackUrl?: string;
  environment?: string;
  transactionType: string;
  accountReference: string;
};

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
  private readonly mpesaRequestLocks = new Map<string, Promise<void>>();
  private readonly mpesaTokenCache = new Map<
    string,
    { token: string; expiresAt: number }
  >();
  private mpesaActivePrompts = 0;
  private readonly mpesaPromptQueue: Array<() => void> = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly patientService: PatientService,
    private readonly appointmentService: AppointmentService,
    private readonly consultationService: ConsultationService,
    private readonly staffService: StaffService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
    private readonly scopeService: ScopeService,
    private readonly cacheService: CacheService,
    private readonly safeLogger: SafeLoggerService,
    private readonly etimsService: EtimsService,
  ) {}

  /**
   * Routes a finalized billing event through the eTIMS integration layer.
   * Fiscalization is queued durably and retried in the background, so a KRA
   * outage never blocks or fails the underlying billing operation.
   */
  private async triggerEtimsFiscalization(
    invoiceId: number,
    trigger: string,
    user?: RequestUser,
  ) {
    try {
      await this.etimsService.onBillingFinalized(invoiceId, {
        trigger,
        actorUserId: user?.userId,
        actorStaffId: user?.staffId ?? undefined,
      });
    } catch (error) {
      this.safeLogger.error('eTIMS fiscalization trigger failed safely', {
        invoiceId,
        trigger,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private compactPaymentPayload(value: unknown) {
    return serializeMaybeJsonCompact(value, {
      maxBytes: 3_000,
      maxStringLength: 600,
      maxArrayItems: 20,
    });
  }

  private async generateInvoiceNumber() {
    const latestInvoice = await this.prisma.invoice.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const nextNumber = (latestInvoice?.id ?? 0) + 1;
    return `INV-${String(nextNumber).padStart(6, '0')}`;
  }

  private buildInvoiceVerificationCode(invoice: {
    id: number;
    invoiceNumber: string;
    patientId: number;
    facilityId: number;
    issuedAt?: Date | string | null;
  }) {
    const seed = [
      invoice.invoiceNumber,
      invoice.id,
      invoice.patientId,
      invoice.facilityId,
      invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : '',
    ].join('|');

    let checksum = 17;
    for (const char of seed) {
      checksum = (checksum * 31 + char.charCodeAt(0)) % 1679616;
    }

    return `VAR-${String(invoice.id).padStart(6, '0')}-${checksum
      .toString(36)
      .toUpperCase()
      .padStart(4, '0')}`;
  }

  private invoiceVerificationUrl(invoice: any, verificationCode: string) {
    const baseUrl =
      process.env.FRONTEND_PUBLIC_URL ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3001';
    const url = new URL('/invoice-verify', baseUrl);
    url.searchParams.set('invoice', invoice.invoiceNumber);
    url.searchParams.set('code', verificationCode);
    url.searchParams.set('facility', invoice.facility?.name ?? '');
    url.searchParams.set('patient', patientName(invoice.patient));
    url.searchParams.set('total', String(Number(invoice.totalAmount ?? 0)));
    return url.toString();
  }

  private calculateLineTotals(
    quantity: number,
    unitPrice: number,
    discountPercent?: number | null,
  ) {
    const safeQuantity = Math.max(0, Number(quantity || 0));
    const safePrice = Math.max(0, Number(unitPrice || 0));
    const safeDiscountPercent = Math.min(
      Math.max(Number(discountPercent ?? 0), 0),
      100,
    );
    const grossTotal = safeQuantity * safePrice;
    const discountAmount = Number(
      ((grossTotal * safeDiscountPercent) / 100).toFixed(2),
    );

    return {
      discountPercent: safeDiscountPercent,
      discountAmount,
      lineTotal: Number((grossTotal - discountAmount).toFixed(2)),
    };
  }

  private normalizeTariffCategory(category: string) {
    return category.trim().toUpperCase();
  }

  private formatChargeDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private getDashboardTtlSeconds() {
    return Number(process.env.CACHE_DASHBOARD_TTL_SECONDS ?? 30);
  }

  private getReferenceTtlSeconds() {
    return Number(process.env.CACHE_REFERENCE_TTL_SECONDS ?? 300);
  }

  private invalidateTariffCache() {
    return this.cacheService.invalidatePattern(
      `${this.cacheService.makeKey(['scoped'])}*billing-service-tariffs*`,
    );
  }

  private mpesaPromptLockSeconds() {
    return Number(process.env.MPESA_PROMPT_LOCK_SECONDS ?? 90);
  }

  private mpesaRequestTimeoutMs() {
    return Number(process.env.MPESA_REQUEST_TIMEOUT_MS ?? 15_000);
  }

  private async runWithMpesaPromptCapacity<T>(loader: () => Promise<T>) {
    const maxConcurrent = Math.max(
      1,
      Number(process.env.MPESA_MAX_CONCURRENT_PROMPTS ?? 20),
    );

    if (this.mpesaActivePrompts >= maxConcurrent) {
      await new Promise<void>((resolve, reject) => {
        let queued: (() => void) | undefined;
        const timer = setTimeout(() => {
          const index = queued ? this.mpesaPromptQueue.indexOf(queued) : -1;
          if (index >= 0) this.mpesaPromptQueue.splice(index, 1);
          reject(
            new ServiceUnavailableException(
              'M-PESA is busy. Retry the prompt shortly.',
            ),
          );
        }, 5_000);

        queued = () => {
          clearTimeout(timer);
          resolve();
        };
        this.mpesaPromptQueue.push(queued);
      });
    }

    this.mpesaActivePrompts += 1;
    try {
      return await loader();
    } finally {
      this.mpesaActivePrompts -= 1;
      const next = this.mpesaPromptQueue.shift();
      if (next) next();
    }
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException(
          'External payment provider timed out. Retry shortly.',
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async assertMpesaThrottle(params: {
    facilityId: number;
    branchId?: number | null;
    phoneNumber: string;
    userId?: number;
    forceResend?: boolean;
  }) {
    if (params.forceResend) return;

    const throttleSeconds = Math.min(30, this.mpesaPromptLockSeconds());
    const phoneKey = this.cacheService.makeKey([
      'mpesa',
      'phone-throttle',
      params.facilityId,
      params.branchId ?? 'all',
      params.phoneNumber,
    ]);
    const phoneAllowed = await this.cacheService.setIfAbsent(
      phoneKey,
      { createdAt: new Date().toISOString() },
      throttleSeconds,
    );

    if (!phoneAllowed) {
      throw new ServiceUnavailableException(
        'Recent M-PESA prompt already sent to this phone for this facility. Retry shortly.',
      );
    }

    if (!params.userId) return;

    const userKey = this.cacheService.makeKey([
      'mpesa',
      'user-throttle',
      params.facilityId,
      params.userId,
    ]);
    const userAllowed = await this.cacheService.setIfAbsent(
      userKey,
      { createdAt: new Date().toISOString() },
      throttleSeconds,
    );

    if (!userAllowed) {
      throw new ServiceUnavailableException(
        'You have sent an M-PESA prompt recently. Retry shortly.',
      );
    }
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
      statusCode = 'CLOSED';
      settledAt = invoice.settledAt ?? new Date();
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

    const autoLine = this.calculateLineTotals(
      params.quantity,
      params.unitPrice,
    );

    await this.prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        billingServiceId: params.billingServiceId,
        description: params.description,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        discountPercent: autoLine.discountPercent,
        discountAmount: autoLine.discountAmount,
        lineTotal: autoLine.lineTotal,
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

    if (
      ['CLOSED', 'PAID', 'CANCELLED', 'VOID'].includes(
        invoice.statusCode?.toUpperCase(),
      )
    ) {
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

    const line = this.calculateLineTotals(
      quantity,
      resolvedUnitPrice,
      dto.discountPercent,
    );

    const item = await this.prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        billingServiceId: billingService?.id,
        description,
        quantity,
        unitPrice: resolvedUnitPrice,
        discountPercent: line.discountPercent,
        discountAmount: line.discountAmount,
        lineTotal: line.lineTotal,
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
    const line = this.calculateLineTotals(
      quantity,
      unitPrice,
      dto.discountPercent ?? item.discountPercent,
    );

    await this.prisma.invoiceItem.update({
      where: { id },
      data: {
        description: dto.description ?? item.description,
        quantity,
        unitPrice,
        discountPercent: line.discountPercent,
        discountAmount: line.discountAmount,
        lineTotal: line.lineTotal,
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

  async closeInvoice(id: number, user: RequestUser) {
    const invoice = await this.getInvoiceByIdScoped(id, user);

    if (invoice.totalAmount <= 0) {
      throw new BadRequestException('Invoice has no billable amount to close.');
    }

    if (invoice.balanceAmount > 0) {
      throw new BadRequestException(
        `Invoice cannot be closed while ${invoice.balanceAmount} remains unpaid.`,
      );
    }

    if (invoice.statusCode === 'CLOSED') {
      return invoice;
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        statusCode: 'CLOSED',
        settledAt: invoice.settledAt ?? new Date(),
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
      actionName: 'CLOSE_INVOICE',
      entityType: 'INVOICE',
      entityId: String(id),
      description: `Invoice ${invoice.invoiceNumber} closed`,
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      beforeData: JSON.stringify(invoice),
      afterData: JSON.stringify(updated),
    });

    await this.triggerEtimsFiscalization(id, 'CLOSE_INVOICE', user);

    return updated;
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

    await this.invalidateTariffCache();
    return tariff;
  }

  async getServiceTariffs(user?: RequestUser, query: PaginationQuery = {}) {
    const where: Prisma.ServiceTariffWhereInput = {};
    const params = parsePagination(query, {
      defaultPageSize: 50,
      maxPageSize: 100,
      allowedSortFields: [
        'id',
        'code',
        'name',
        'category',
        'unitPrice',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: 'name',
      defaultSortDirection: 'asc',
    });

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

    if (params.search) {
      const search = params.search;
      const searchOr: Prisma.ServiceTariffWhereInput[] = [
        { code: { contains: search } },
        { name: { contains: search } },
        { category: { contains: search } },
        { notes: { contains: search } },
        { billingService: { name: { contains: search } } },
        { billingService: { code: { contains: search } } },
        { labTest: { testName: { contains: search } } },
        { ward: { name: { contains: search } } },
        { bed: { bedNumber: { contains: search } } },
        { bed: { bedLabel: { contains: search } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    const startedAt = Date.now();
    const sortDirection = params.sortDirection as Prisma.SortOrder;
    const cacheKey = [
      'billing-service-tariffs',
      `page:${params.page}`,
      `pageSize:${params.pageSize}`,
      `search:${params.search ?? ''}`,
      `sort:${params.sortBy}:${params.sortDirection}`,
    ].join(':');

    return this.cacheService.rememberScoped(
      {
        facilityId: user?.homeFacilityId ?? 'platform',
        branchId: user?.homeBranchId ?? 'all',
        roleCode: user?.roleCode ?? 'public',
        extra: `service-tariffs:${(user?.allowedBranchIds ?? []).join(',')}:${user?.canAccessAllBranchesInFacility ? 'all' : 'limited'}`,
      },
      cacheKey,
      Math.min(this.getReferenceTtlSeconds(), 120),
      async () => {
        const [data, total] = await Promise.all([
          this.prisma.serviceTariff.findMany({
            where,
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
              facilityId: true,
              branchId: true,
              billingServiceId: true,
              labTestId: true,
              wardId: true,
              bedId: true,
              unitPrice: true,
              isActive: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              facility: { select: { id: true, code: true, name: true } },
              branch: { select: { id: true, code: true, name: true } },
              billingService: {
                select: { id: true, code: true, name: true, category: true },
              },
              labTest: { select: { id: true, testName: true, category: true } },
              ward: { select: { id: true, name: true, wardType: true } },
              bed: {
                select: {
                  id: true,
                  bedNumber: true,
                  bedLabel: true,
                  statusCode: true,
                },
              },
            },
            skip: params.skip,
            take: params.take,
            orderBy:
              params.sortBy === 'category'
                ? [
                    { category: sortDirection },
                    { name: sortDirection },
                  ]
                : [{ [params.sortBy]: sortDirection }],
          }),
          this.prisma.serviceTariff.count({ where }),
        ]);

        const durationMs = Date.now() - startedAt;
        if (durationMs >= Number(process.env.SLOW_LIST_MS ?? 750)) {
          this.safeLogger.warn('Slow service tariff list request', {
            durationMs,
            page: params.page,
            pageSize: params.pageSize,
            total,
            facilityId: user?.homeFacilityId ?? null,
            branchId: user?.homeBranchId ?? null,
            roleCode: user?.roleCode ?? null,
          });
        }

        return paginatedResponse(data, {
          page: params.page,
          pageSize: params.pageSize,
          total,
        });
      },
    );
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

    await this.invalidateTariffCache();
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

  async createInvoice(dto: CreateInvoiceDto, user?: RequestUser) {
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
      discountPercent: number;
      discountAmount: number;
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
      const line = this.calculateLineTotals(
        quantity,
        resolvedUnitPrice,
        item.discountPercent,
      );
      const lineTotal = line.lineTotal;
      subtotal += lineTotal;

      preparedItems.push({
        billingServiceId: item.billingServiceId,
        description: item.description,
        quantity,
        unitPrice: resolvedUnitPrice,
        discountPercent: line.discountPercent,
        discountAmount: line.discountAmount,
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

    if (patient.facilityId !== facilityId) {
      throw new BadRequestException(
        'Invoice patient does not belong to the resolved facility',
      );
    }

    if (user) {
      this.scopeService.assertBranchAccess(user, facilityId, branchId);
    }

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
      actorUserId: user?.userId,
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

    return {
      ...invoice,
      verificationCode: this.buildInvoiceVerificationCode(invoice),
    };
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
          take: 50,
        },
        payments: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 30,
        },
      },
      take: 200,
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

    return {
      ...invoice,
      verificationCode: this.buildInvoiceVerificationCode(invoice),
    };
  }

  async getPatientBillingByPatientNumber(
    patientNumber: string,
    user: RequestUser,
  ) {
    const scope = this.scopeService.buildReadScope(user);
    const patient = await this.prisma.patient.findFirst({
      where: {
        patientNumber,
        ...(scope.facilityId ? { facilityId: scope.facilityId } : {}),
      },
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
        ...scope,
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
          take: 50,
        },
        payments: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 30,
        },
      },
      take: 100,
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
          take: 50,
        },
        payments: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 30,
        },
      },
      take: 200,
      orderBy: { id: 'desc' },
    });
  }

  async getInvoicesPageScoped(user: RequestUser, query: PaginationQuery) {
    const scope = this.scopeService.buildReadScope(user);
    const pagination = parsePagination(query, {
      defaultPageSize: 25,
      maxPageSize: 100,
      allowedSortFields: [
        'id',
        'createdAt',
        'issuedAt',
        'updatedAt',
        'totalAmount',
      ],
      defaultSortBy: 'id',
      defaultSortDirection: 'desc',
    });
    const search = pagination.search;
    const where: Prisma.InvoiceWhereInput = {
      ...scope,
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search } },
              { patient: { patientNumber: { contains: search } } },
              { patient: { firstName: { contains: search } } },
              { patient: { lastName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy]: pagination.sortDirection },
        select: {
          id: true,
          invoiceNumber: true,
          patientId: true,
          facilityId: true,
          branchId: true,
          statusCode: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          issuedAt: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
              phonePrimary: true,
            },
          },
          facility: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginatedResponse(data, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
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
    const verificationCode = this.buildInvoiceVerificationCode(invoice);

    return this.createCollectionInvoicePdf(
      invoice,
      printableItems,
      verificationCode,
      currency,
    );
  }

  async getVerifiedInvoice(invoiceNumber: string, code: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
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
            updatedBy: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
        payments: {
          include: {
            receivedBy: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    const verificationCode = this.buildInvoiceVerificationCode(invoice);
    if (verificationCode !== code) {
      throw new BadRequestException('Invoice verification code is invalid');
    }

    return {
      ...invoice,
      verificationCode,
      publicVerifiedAt: new Date().toISOString(),
    };
  }

  async getVerifiedInvoicePdf(invoiceNumber: string, code: string) {
    const invoice = await this.getVerifiedInvoice(invoiceNumber, code);
    const currency =
      invoice.facility?.currency || invoice.branch?.currency || 'KES';
    const printableItems = (invoice.items ?? []).filter(
      (item) => item.isRemoved !== true,
    );

    return this.createCollectionInvoicePdf(
      invoice,
      printableItems,
      invoice.verificationCode,
      currency,
    );
  }

  async getPaymentReceiptPdf(id: number, user: RequestUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        invoice: {
          include: {
            patient: true,
            facility: true,
            branch: true,
          },
        },
        receivedBy: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    this.scopeService.assertBranchAccess(
      user,
      payment.facilityId,
      payment.branchId,
    );

    const currency =
      payment.facility?.currency || payment.branch?.currency || 'KES';
    const verificationCode = this.buildInvoiceVerificationCode(payment.invoice);

    return createHospitalPdfBuffer(
      {
        title: 'Payment Receipt',
        subtitle: payment.receiptNumber,
        reference: payment.invoice?.invoiceNumber,
        verificationCode,
        facility: payment.facility ?? payment.invoice?.facility,
        branch: payment.branch ?? payment.invoice?.branch,
        compact: true,
        qrPayload: this.invoiceVerificationUrl(payment.invoice, verificationCode),
      },
      (doc) => {
        addSectionTitle(doc, 'Receipt details');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Receipt No.', value: payment.receiptNumber },
            { label: 'Invoice No.', value: payment.invoice?.invoiceNumber },
            { label: 'Patient', value: patientName(payment.invoice?.patient) },
            { label: 'Method', value: payment.paymentMethod },
            {
              label: 'Reference',
              value: payment.mpesaReceiptNumber || payment.transactionRef,
            },
            { label: 'Paid At', value: payment.paidAt },
            { label: 'Received By', value: staffName(payment.receivedBy) },
            { label: 'Status', value: payment.statusCode },
          ],
          2,
        );

        addTotalsPanel(
          doc,
          [
            {
              label: 'Amount',
              value: formatPdfMoney(payment.amount, currency),
            },
            {
              label: 'Invoice Balance',
              value: formatPdfMoney(payment.invoice?.balanceAmount, currency),
            },
          ],
          'Amount received',
        );
        addCompactParagraph(
          doc,
          'Receipt note',
          'This receipt confirms a payment recorded against the invoice above. Keep this copy for reconciliation.',
        );
      },
    );
  }

  private async createCollectionInvoicePdf(
    invoice: any,
    printableItems: any[],
    verificationCode: string,
    currency: string,
  ) {
    const paymentLines = this.invoicePaymentLines(invoice);
    const qrPayload = this.invoiceVerificationUrl(invoice, verificationCode);
    const admittedAt =
      invoice.admission?.admittedAt ||
      invoice.appointment?.scheduledAt ||
      invoice.issuedAt;

    return createHospitalPdfBuffer(
      {
        title: 'Invoice',
        subtitle: invoice.invoiceNumber,
        reference: invoice.statusCode,
        verificationCode,
        facility: invoice.facility,
        branch: invoice.branch,
        compact: true,
        qrPayload,
      },
      (doc) => {
        addSectionTitle(doc, 'Patient and invoice details');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Patient', value: patientName(invoice.patient) },
            { label: 'Patient No.', value: invoice.patient?.patientNumber },
            { label: 'Phone', value: invoice.patient?.phonePrimary },
            { label: 'Invoice No.', value: invoice.invoiceNumber },
            { label: 'Date', value: invoice.issuedAt },
            { label: 'Visit/Admission', value: admittedAt },
            { label: 'Status', value: invoice.statusCode },
            { label: 'Branch', value: invoice.branch?.name },
          ],
          4,
        );

        addSectionTitle(doc, 'Invoice items');
        addCompactTable(
          doc,
          [
            { header: 'Date', width: 58, render: (item) => this.shortInvoiceDate(item.createdAt) },
            { header: 'Item', width: 206, render: (item) => item.description },
            {
              header: 'Unit',
              width: 50,
              render: (item) =>
                (item.billingService?.category || item.sourceModule || 'EACH').toUpperCase(),
            },
            { header: 'Qty', width: 34, render: (item) => Number(item.quantity || 0) },
            { header: 'Disc', width: 44, render: (item) => `${Number(item.discountPercent || 0)}%` },
            { header: 'Price', width: 62, render: (item) => this.compactMoney(item.unitPrice, currency) },
            { header: 'Total', width: 72, render: (item) => this.compactMoney(item.lineTotal, currency) },
          ],
          printableItems,
          'No active invoice items recorded.',
        );

        addSectionTitle(doc, 'Payment instructions and totals');
        addTotalsPanel(
          doc,
          [
            { label: 'Subtotal', value: this.compactMoney(invoice.subtotal, currency) },
            { label: 'VAT', value: this.compactMoney(invoice.taxAmount, currency) },
            { label: 'Discount', value: this.compactMoney(invoice.discountAmount, currency) },
            { label: 'Grand Total', value: this.compactMoney(invoice.totalAmount, currency) },
            { label: 'Paid', value: this.compactMoney(invoice.amountPaid, currency) },
            { label: 'Balance', value: this.compactMoney(invoice.balanceAmount, currency) },
          ],
          'Invoice totals',
        );
        addCompactParagraph(
          doc,
          'Payment',
          paymentLines.length
            ? paymentLines.join('\n')
            : 'Payment is received at the cashier desk. Thank you for visiting.',
        );
        addCompactParagraph(
          doc,
          'Invoice note',
          `Items: ${printableItems.length}. Served at ${this.timeOnly(new Date())}.`,
        );
      },
    );
  }

  private invoicePrintColumns(left: number, right: number) {
    return [
      { x: left + 4, width: 76, align: 'left' as const },
      { x: left + 92, width: 322, align: 'left' as const },
      { x: left + 420, width: 62, align: 'left' as const },
      { x: left + 492, width: 34, align: 'left' as const },
      { x: left + 538, width: 42, align: 'right' as const },
      { x: left + 604, width: 68, align: 'right' as const },
      { x: right - 84, width: 82, align: 'right' as const },
    ];
  }

  private drawInvoiceLogoPlaceholder(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    size = 62,
  ) {
    const radius = size / 2;
    doc.circle(x + radius, y + radius, radius).fill('#bfeaf4');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(size * 0.55)
      .text('+', x + size * 0.28, y + size * 0.14, {
        width: size * 0.46,
        align: 'center',
      });
  }

  private drawQrPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number) {
    const size = 58;
    doc.rect(x, y, size, size).fill('#ffffff');
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if ((row * 7 + col * 5 + row + col) % 3 !== 0) {
          doc.rect(x + col * 6, y + row * 6, 4, 4).fill('#111827');
        }
      }
    }
  }

  private invoicePaymentLines(invoice: any) {
    const facility = invoice.facility ?? {};
    const branch = invoice.branch ?? {};
    const paybill = branch.mpesaPaybill || facility.mpesaPaybill;
    const account = branch.mpesaAccountNumber || facility.mpesaAccountNumber;
    const till = branch.mpesaTillNumber || facility.mpesaTillNumber;
    const pochi = branch.mpesaPochiNumber || facility.mpesaPochiNumber;
    const showCash = facility.showCashOnInvoice !== false;
    const showPaybill = facility.showPaybillOnInvoice !== false;
    const showTill = facility.showTillOnInvoice !== false;
    const showPochi = facility.showPochiOnInvoice !== false;
    const hasMpesa =
      (showPaybill && paybill) || (showTill && till) || (showPochi && pochi);
    const lines = hasMpesa ? ['Pay by M-PESA'] : [];

    if (showPaybill && paybill) {
      lines.push(`Paybill:${paybill}${account ? ` Account:${account}` : ''}`);
    }
    if (showTill && till) lines.push(`Till:${till}`);
    if (showPochi && pochi) lines.push(`Pochi La Biashara:${pochi}`);
    if (showCash)
      lines.push('Cash payments are receipted at the cashier desk.');
    lines.push('Thank you for visiting.');
    return lines;
  }

  private shortInvoiceDate(value?: string | Date | null) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    })
      .format(date)
      .replace(/ /g, '-');
  }

  private timeOnly(value: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(value);
  }

  private compactMoney(value?: number | null, _currency = 'KES') {
    return `ksh${Number(value || 0).toFixed(1)}`;
  }

  private generateReceiptNumber(prefix = 'RCT') {
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const entropy = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`.toUpperCase();
    return `${prefix}-${dateKey}-${entropy}`;
  }

  private normalizeMpesaPhone(phoneNumber: string) {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('254') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) {
      return `254${digits.slice(1)}`;
    }
    if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
    throw new BadRequestException(
      'Use a valid Kenyan M-PESA phone number, for example 0712345678 or 254712345678',
    );
  }

  private getMpesaBaseUrl(environment?: string | null) {
    return (environment || process.env.MPESA_ENV) === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private cleanMpesaNumber(value?: string | null) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits || undefined;
  }

  private resolveMpesaConfig(invoice: any): MpesaConfig {
    const facility = invoice.facility ?? {};
    const branch = invoice.branch ?? {};
    const branchPaybill = this.cleanMpesaNumber(branch.mpesaPaybill);
    const facilityPaybill = this.cleanMpesaNumber(facility.mpesaPaybill);
    const branchTill = this.cleanMpesaNumber(branch.mpesaTillNumber);
    const facilityTill = this.cleanMpesaNumber(facility.mpesaTillNumber);
    const envShortcode = this.cleanMpesaNumber(process.env.MPESA_SHORTCODE);
    const environment =
      facility.mpesaEnvironment ||
      branch.mpesaEnvironment ||
      process.env.MPESA_ENV;
    const shortcode =
      this.cleanMpesaNumber(branch.mpesaShortcode) ||
      this.cleanMpesaNumber(facility.mpesaShortcode) ||
      branchPaybill ||
      facilityPaybill ||
      branchTill ||
      facilityTill ||
      envShortcode;
    const usingTill =
      Boolean(branchTill || facilityTill) &&
      !(branchPaybill || facilityPaybill);
    const transactionType =
      facility.mpesaTransactionType ||
      branch.mpesaTransactionType ||
      process.env.MPESA_TRANSACTION_TYPE ||
      (usingTill ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline');

    return {
      consumerKey: facility.mpesaConsumerKey || process.env.MPESA_CONSUMER_KEY,
      consumerSecret:
        facility.mpesaConsumerSecret || process.env.MPESA_CONSUMER_SECRET,
      passkey: facility.mpesaPasskey || process.env.MPESA_PASSKEY,
      shortcode,
      callbackUrl: facility.mpesaCallbackUrl || process.env.MPESA_CALLBACK_URL,
      environment,
      transactionType,
      accountReference:
        branch.mpesaAccountNumber ||
        facility.mpesaAccountNumber ||
        invoice.invoiceNumber,
    };
  }

  private assertMpesaConfigured(config: MpesaConfig) {
    const missing = [
      ['MPESA_CONSUMER_KEY', config.consumerKey],
      ['MPESA_CONSUMER_SECRET', config.consumerSecret],
      ['MPESA_PASSKEY', config.passkey],
      ['MPESA_SHORTCODE or facility shortcode/paybill/till', config.shortcode],
      ['MPESA_CALLBACK_URL', config.callbackUrl],
    ].filter(([, value]) => !value);

    if (missing.length) {
      throw new BadRequestException(
        `M-PESA Daraja is not configured. Missing: ${missing
          .map(([key]) => key)
          .join(', ')}`,
      );
    }
  }

  private async getMpesaAccessToken(config: MpesaConfig) {
    this.assertMpesaConfigured(config);
    const cacheKey = `${config.environment || process.env.MPESA_ENV || 'sandbox'}:${config.consumerKey}`;
    const cached = this.mpesaTokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    const credentials = Buffer.from(
      `${config.consumerKey}:${config.consumerSecret}`,
    ).toString('base64');
    const response = await this.fetchWithTimeout(
      `${this.getMpesaBaseUrl(config.environment)}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      },
      this.mpesaRequestTimeoutMs(),
    );

    const data = (await response.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: string | number;
      errorMessage?: string;
    };

    if (!response.ok || !data.access_token) {
      throw new BadRequestException(
        data.errorMessage || 'Unable to get M-PESA access token',
      );
    }

    const expiresInSeconds = Number(data.expires_in || 3600);
    this.mpesaTokenCache.set(cacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(300, expiresInSeconds - 60) * 1000,
    });

    return data.access_token;
  }

  private mpesaTimestamp() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((values, part) => {
        if (part.type !== 'literal') values[part.type] = part.value;
        return values;
      }, {});

    return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
  }

  private async sendDarajaStkPush(params: {
    invoice: any;
    amount: number;
    phoneNumber: string;
  }) {
    const config = this.resolveMpesaConfig(params.invoice);
    this.assertMpesaConfigured(config);
    const token = await this.getMpesaAccessToken(config);
    const timestamp = this.mpesaTimestamp();
    const password = Buffer.from(
      `${config.shortcode}${config.passkey}${timestamp}`,
    ).toString('base64');
    const amount = Math.max(1, Math.round(Number(params.amount || 0)));
    const phoneNumber = this.normalizeMpesaPhone(params.phoneNumber);

    const response = await this.runWithMpesaPromptCapacity(() =>
      this.fetchWithTimeout(
        `${this.getMpesaBaseUrl(config.environment)}/mpesa/stkpush/v1/processrequest`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: config.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: config.transactionType,
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: config.shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: config.callbackUrl,
            AccountReference: String(config.accountReference).slice(0, 12),
            TransactionDesc: `Invoice ${params.invoice.invoiceNumber}`.slice(
              0,
              13,
            ),
          }),
        },
        this.mpesaRequestTimeoutMs(),
      ),
    );
    const data = (await response.json().catch(() => ({}))) as MpesaStkResponse;

    if (!response.ok || data.ResponseCode !== '0') {
      throw new BadRequestException(
        data.errorMessage ||
          data.ResponseDescription ||
          'M-PESA STK Push request was not accepted',
      );
    }

    return { data, phoneNumber };
  }

  private async queryDarajaStkStatus(payment: any) {
    if (!payment.checkoutRequestId) {
      throw new BadRequestException(
        'Payment has no M-PESA checkout request id',
      );
    }

    const invoice =
      payment.invoice ?? (await this.getInvoiceById(payment.invoiceId));
    const config = this.resolveMpesaConfig(invoice);
    this.assertMpesaConfigured(config);
    const token = await this.getMpesaAccessToken(config);
    const timestamp = this.mpesaTimestamp();
    const password = Buffer.from(
      `${config.shortcode}${config.passkey}${timestamp}`,
    ).toString('base64');

    const response = await this.fetchWithTimeout(
      `${this.getMpesaBaseUrl(config.environment)}/mpesa/stkpushquery/v1/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: payment.checkoutRequestId,
        }),
      },
      this.mpesaRequestTimeoutMs(),
    );
    const data = (await response
      .json()
      .catch(() => ({}))) as MpesaQueryResponse;

    if (!response.ok || data.errorCode) {
      throw new BadRequestException(
        data.errorMessage ||
          data.ResponseDescription ||
          'Unable to query M-PESA payment status',
      );
    }

    return data;
  }

  private async findPendingMpesaPayment(
    invoiceId: number,
    phoneNumber: string,
    amount: number,
  ) {
    const normalizedPhone = this.normalizeMpesaPhone(phoneNumber);
    const freshWindow = new Date(Date.now() - 1000 * 60 * 15);

    return this.prisma.payment.findFirst({
      where: {
        invoiceId,
        paymentMethod: 'MPESA',
        statusCode: 'PENDING',
        phoneNumber: normalizedPhone,
        amount: Number(amount || 0),
        requestedAt: { gte: freshWindow },
      },
      include: {
        facility: true,
        branch: true,
        invoice: true,
        receivedBy: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async createCashPayment(dto: CreateCashPaymentDto, user?: RequestUser) {
    const invoice = await this.getInvoiceById(dto.invoiceId);
    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        invoice.facilityId,
        invoice.branchId,
      );
    }
    const receiptNumber =
      dto.receiptNumber || this.generateReceiptNumber('CSH');

    const existing = await this.prisma.payment.findFirst({
      where: { receiptNumber },
    });

    if (existing) {
      throw new BadRequestException('Receipt number already exists');
    }

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
        receiptNumber,
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
    await this.triggerEtimsFiscalization(dto.invoiceId, 'CASH_PAYMENT', user);

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: 'CREATE_CASH_PAYMENT',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `Cash payment received for invoice ${dto.invoiceId}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      actorUserId: user?.userId,
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

  async applyShaCoveragePayment(params: {
    shaClaimId: number;
    claimNumber: string;
    invoiceId: number;
    amount: number;
    statusCode?: string | null;
    rejectionReason?: string | null;
    receivedByStaffId?: number | null;
  }) {
    const invoice = await this.getInvoiceById(params.invoiceId);
    const requestedAmount = Number(params.amount || 0);
    const existing = await this.prisma.payment.findFirst({
      where: {
        shaClaimId: params.shaClaimId,
        paymentMethod: 'SHA',
      },
    });

    if (requestedAmount <= 0) {
      if (existing && existing.statusCode !== 'FAILED') {
        const failed = await this.prisma.payment.update({
          where: { id: existing.id },
          data: {
            statusCode: 'FAILED',
            notes: 'SHA coverage removed from the invoice.',
          },
        });
        await this.recalculateInvoice(params.invoiceId);
        return failed;
      }

      return existing;
    }

    const maximumAllowed =
      invoice.balanceAmount +
      (existing?.statusCode === 'COMPLETED' ? existing.amount : 0);

    if (requestedAmount > maximumAllowed) {
      throw new BadRequestException(
        `SHA cover exceeds outstanding invoice balance of ${maximumAllowed}`,
      );
    }

    const cancelled = params.statusCode === 'CANCELLED';
    const now = new Date();
    const notes =
      params.statusCode === 'REJECTED'
        ? `SHA claim rejected and recorded as facility loss. ${
            params.rejectionReason || ''
          }`.trim()
        : `SHA cover for claim ${params.claimNumber}`;

    const data = {
      amount: requestedAmount,
      paymentMethod: 'SHA',
      statusCode: cancelled ? 'FAILED' : 'COMPLETED',
      transactionRef: params.claimNumber,
      paidAt: cancelled ? null : now,
      confirmedAt: cancelled ? null : now,
      receivedByStaffId: params.receivedByStaffId ?? null,
      notes,
    };

    const payment = existing
      ? await this.prisma.payment.update({
          where: { id: existing.id },
          data,
          include: {
            facility: true,
            branch: true,
            invoice: true,
            receivedBy: true,
          },
        })
      : await this.prisma.payment.create({
          data: {
            facilityId: invoice.facilityId,
            branchId: invoice.branchId,
            receiptNumber: this.generateReceiptNumber('SHA'),
            invoiceId: params.invoiceId,
            shaClaimId: params.shaClaimId,
            ...data,
          },
          include: {
            facility: true,
            branch: true,
            invoice: true,
            receivedBy: true,
          },
        });

    await this.recalculateInvoice(params.invoiceId);
    if (!cancelled) {
      await this.triggerEtimsFiscalization(params.invoiceId, 'SHA_COVERAGE');
    }

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName: cancelled ? 'CANCEL_SHA_PAYMENT' : 'APPLY_SHA_PAYMENT',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `SHA coverage ${payment.receiptNumber} linked to claim ${params.claimNumber}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      actorStaffId: params.receivedByStaffId ?? undefined,
      afterData: JSON.stringify(payment),
    });

    return payment;
  }

  async createMpesaPaymentRequest(
    dto: CreateMpesaPaymentRequestDto,
    user?: RequestUser,
    idempotencyKey?: string,
  ) {
    const invoice = await this.getInvoiceById(dto.invoiceId);
    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        invoice.facilityId,
        invoice.branchId,
      );
    }
    const normalizedPhone = this.normalizeMpesaPhone(dto.phoneNumber);
    const amount = Number(dto.amount || 0);
    await this.assertMpesaThrottle({
      facilityId: invoice.facilityId,
      branchId: invoice.branchId,
      phoneNumber: normalizedPhone,
      userId: user?.userId,
      forceResend: dto.forceResend,
    });
    const lockKey = `${dto.invoiceId}:${normalizedPhone}:${amount.toFixed(2)}`;
    const promptLockKey = this.cacheService.makeKey([
      'mpesa',
      'prompt-lock',
      invoice.facilityId,
      invoice.branchId ?? 'all',
      dto.invoiceId,
      normalizedPhone,
      amount.toFixed(2),
      idempotencyKey || 'auto',
    ]);

    const lockAcquired = dto.forceResend
      ? true
      : await this.cacheService.setIfAbsent(
          promptLockKey,
          {
            invoiceId: dto.invoiceId,
            phoneNumber: normalizedPhone,
            amount,
            requestedAt: new Date().toISOString(),
            userId: user?.userId ?? null,
          },
          this.mpesaPromptLockSeconds(),
        );

    if (!lockAcquired) {
      this.safeLogger.warn('Blocked duplicate M-PESA prompt within lock window', {
        invoiceId: dto.invoiceId,
        facilityId: invoice.facilityId,
        branchId: invoice.branchId,
        userId: user?.userId ?? null,
        lockSeconds: this.mpesaPromptLockSeconds(),
      });
      const pending = await this.findPendingMpesaPayment(
        dto.invoiceId,
        normalizedPhone,
        amount,
      );

      return {
        message:
          'A recent M-PESA STK Push already exists for this invoice, amount, and phone number. Wait before resending.',
        payment: pending,
        duplicatePrevented: true,
        retryAfterSeconds: this.mpesaPromptLockSeconds(),
      };
    }

    const activeLock = this.mpesaRequestLocks.get(lockKey);

    if (activeLock) {
      await activeLock.catch(() => undefined);
      const pending = await this.findPendingMpesaPayment(
        dto.invoiceId,
        normalizedPhone,
        amount,
      );

      if (pending && !dto.forceResend) {
        return {
          message:
            'A pending M-PESA STK Push already exists for this invoice, amount, and phone number. Use resend if the patient did not receive it.',
          payment: pending,
          duplicatePrevented: true,
        };
      }
    }

    let releaseLock: () => void = () => undefined;
    const lock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.mpesaRequestLocks.set(lockKey, lock);

    try {
      return await this.createMpesaPaymentRequestLocked(
        dto,
        invoice,
        normalizedPhone,
        amount,
        user,
      );
    } finally {
      releaseLock();
      this.mpesaRequestLocks.delete(lockKey);
    }
  }

  private async createMpesaPaymentRequestLocked(
    dto: CreateMpesaPaymentRequestDto,
    invoice: any,
    normalizedPhone: string,
    amount: number,
    user?: RequestUser,
  ) {
    if (dto.receivedByStaffId) {
      await this.staffService.findOne(dto.receivedByStaffId);
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (amount > invoice.balanceAmount) {
      throw new BadRequestException(
        `Payment exceeds outstanding balance of ${invoice.balanceAmount}`,
      );
    }

    const pending = await this.findPendingMpesaPayment(
      dto.invoiceId,
      normalizedPhone,
      amount,
    );

    if (pending && !dto.forceResend) {
      return {
        message:
          'A pending M-PESA STK Push already exists for this invoice, amount, and phone number. Use resend if the patient did not receive it.',
        payment: pending,
        duplicatePrevented: true,
      };
    }

    const receiptNumber =
      dto.receiptNumber || this.generateReceiptNumber('MPESA');
    const existing = await this.prisma.payment.findFirst({
      where: { receiptNumber },
    });

    if (existing) {
      throw new BadRequestException('Receipt number already exists');
    }

    const stk = await this.sendDarajaStkPush({
      invoice,
      amount,
      phoneNumber: normalizedPhone,
    });

    const payment = await this.prisma.payment.create({
      data: {
        facilityId: invoice.facilityId,
        branchId: invoice.branchId,
        receiptNumber,
        invoiceId: dto.invoiceId,
        amount,
        paymentMethod: 'MPESA',
        statusCode: 'PENDING',
        phoneNumber: normalizedPhone,
        checkoutRequestId: stk.data.CheckoutRequestID,
        merchantRequestId: stk.data.MerchantRequestID,
        callbackPayload: this.compactPaymentPayload({
          request: stk.data,
          requestedAt: new Date().toISOString(),
        }),
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
      actorUserId: user?.userId,
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
        stk.data.CustomerMessage ||
        'M-PESA STK Push sent. Ask the patient to enter their M-PESA PIN.',
      payment,
      stkRequest: {
        phoneNumber: normalizedPhone,
        amount,
        checkoutRequestId: stk.data.CheckoutRequestID,
        merchantRequestId: stk.data.MerchantRequestID,
      },
    };
  }

  async resendMpesaPaymentRequest(id: number, user: RequestUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            facility: true,
            branch: true,
            patient: true,
            appointment: true,
            admission: true,
            items: true,
            payments: true,
          },
        },
        facility: true,
        branch: true,
        receivedBy: true,
      },
    });

    if (!payment)
      throw new NotFoundException(`Payment with id ${id} not found`);
    this.scopeService.assertBranchAccess(
      user,
      payment.facilityId,
      payment.branchId,
    );

    if (payment.paymentMethod !== 'MPESA') {
      throw new BadRequestException(
        'Only M-PESA payment requests can be resent',
      );
    }

    if (payment.statusCode !== 'PENDING') {
      throw new BadRequestException(
        'Only pending M-PESA requests can be resent',
      );
    }

    if (!payment.phoneNumber) {
      throw new BadRequestException('Payment has no phone number to resend to');
    }

    const stk = await this.sendDarajaStkPush({
      invoice: payment.invoice,
      amount: payment.amount,
      phoneNumber: payment.phoneNumber,
    });

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutRequestId: stk.data.CheckoutRequestID,
        merchantRequestId: stk.data.MerchantRequestID,
        requestedAt: new Date(),
        callbackPayload: this.compactPaymentPayload({
          resend: stk.data,
          resentAt: new Date().toISOString(),
          previousCheckoutRequestId: payment.checkoutRequestId,
        }),
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
      actionName: 'RESEND_MPESA_STK_PUSH',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `M-PESA STK Push resent for invoice ${payment.invoiceId}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      beforeData: JSON.stringify(payment),
      afterData: JSON.stringify(updated),
    });

    return {
      message:
        stk.data.CustomerMessage ||
        'M-PESA STK Push resent. Ask the patient to enter their M-PESA PIN.',
      payment: updated,
      stkRequest: {
        phoneNumber: payment.phoneNumber,
        amount: payment.amount,
        checkoutRequestId: stk.data.CheckoutRequestID,
        merchantRequestId: stk.data.MerchantRequestID,
      },
    };
  }

  async getMpesaPaymentStatus(checkoutRequestId: string, user: RequestUser) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        checkoutRequestId,
        paymentMethod: 'MPESA',
      },
      include: {
        invoice: {
          include: {
            facility: true,
            branch: true,
            patient: true,
            appointment: true,
            admission: true,
            items: true,
            payments: true,
          },
        },
        facility: true,
        branch: true,
        receivedBy: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `M-PESA payment with checkoutRequestId ${checkoutRequestId} not found`,
      );
    }

    this.scopeService.assertBranchAccess(
      user,
      payment.facilityId,
      payment.branchId,
    );

    if (payment.statusCode !== 'PENDING') {
      return {
        message: `Payment is already ${payment.statusCode.toLowerCase()}.`,
        payment,
        daraja: null,
      };
    }

    const statusCacheKey = this.cacheService.makeKey([
      'mpesa',
      'status',
      payment.facilityId,
      payment.branchId ?? 'all',
      checkoutRequestId,
    ]);
    const daraja = await this.cacheService.getOrSet(
      statusCacheKey,
      Number(process.env.MPESA_STATUS_CACHE_SECONDS ?? 10),
      () => this.queryDarajaStkStatus(payment),
    );
    const resultCode = String(daraja.ResultCode ?? '');

    if (resultCode === '0') {
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          statusCode: 'COMPLETED',
          confirmedAt: new Date(),
          paidAt: new Date(),
          transactionRef: payment.transactionRef || payment.checkoutRequestId,
          callbackPayload: this.compactPaymentPayload({
            previousStatus: payment.callbackPayload ? 'stored' : 'none',
            statusQuery: daraja,
            queriedAt: new Date().toISOString(),
          }),
        },
        include: {
          facility: true,
          branch: true,
          invoice: true,
          receivedBy: true,
        },
      });

      await this.recalculateInvoice(payment.invoiceId);

      await this.auditLogService.create({
        moduleName: 'BILLING',
        actionName: 'QUERY_MPESA_PAYMENT_CONFIRMED',
        entityType: 'PAYMENT',
        entityId: String(payment.id),
        description: `M-PESA payment confirmed by Daraja status query for invoice ${payment.invoiceId}`,
        facilityId: payment.facilityId,
        branchId: payment.branchId ?? undefined,
        actorUserId: user.userId,
        actorStaffId: user.staffId ?? undefined,
        beforeData: JSON.stringify(payment),
        afterData: JSON.stringify(updated),
      });

      return {
        message: 'M-PESA payment confirmed by Daraja status query.',
        payment: updated,
        daraja,
      };
    }

    if (resultCode && resultCode !== '0') {
      const failed = await this.failMpesaPayment(
        checkoutRequestId,
        this.compactPaymentPayload({
          previousStatus: payment.callbackPayload ? 'stored' : 'none',
          statusQuery: daraja,
          queriedAt: new Date().toISOString(),
        }),
        user,
      );

      return {
        message:
          daraja.ResultDesc ||
          'M-PESA payment was not completed according to Daraja.',
        payment: failed,
        daraja,
      };
    }

    return {
      message:
        daraja.ResponseDescription ||
        'M-PESA request is still pending. Wait for the phone prompt or resend if needed.',
      payment,
      daraja,
    };
  }

  async confirmMpesaPayment(
    dto: ConfirmMpesaPaymentDto,
    user?: RequestUser,
    source: 'MANUAL' | 'CALLBACK' | 'STATUS_QUERY' = 'MANUAL',
  ) {
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

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        payment.facilityId,
        payment.branchId,
      );
    }

    if (payment.statusCode === 'COMPLETED') {
      return {
        message: 'Payment already confirmed',
        payment,
      };
    }

    const mpesaReceiptNumber = dto.mpesaReceiptNumber?.trim() || undefined;
    if (mpesaReceiptNumber) {
      const duplicateReceipt = await this.prisma.payment.findFirst({
        where: {
          mpesaReceiptNumber,
          NOT: { id: payment.id },
        },
        select: {
          id: true,
          receiptNumber: true,
          invoiceId: true,
          statusCode: true,
        },
      });

      if (duplicateReceipt) {
        throw new BadRequestException(
          'This M-PESA receipt number is already attached to another payment',
        );
      }
    }

    const beforeData = JSON.stringify(payment);

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        statusCode: 'COMPLETED',
        confirmedAt: new Date(),
        paidAt: new Date(),
        merchantRequestId: dto.merchantRequestId ?? payment.merchantRequestId,
        mpesaReceiptNumber,
        transactionRef: dto.transactionRef,
        callbackPayload: this.compactPaymentPayload(dto.callbackPayload),
      },
    });

    await this.recalculateInvoice(payment.invoiceId);
    await this.triggerEtimsFiscalization(
      payment.invoiceId,
      'MPESA_PAYMENT',
      user,
    );

    await this.auditLogService.create({
      moduleName: 'BILLING',
      actionName:
        source === 'CALLBACK'
          ? 'CONFIRM_MPESA_PAYMENT_CALLBACK'
          : 'CONFIRM_MPESA_PAYMENT',
      entityType: 'PAYMENT',
      entityId: String(payment.id),
      description: `M-PESA payment confirmed for invoice ${payment.invoiceId} via ${source}`,
      facilityId: payment.facilityId,
      branchId: payment.branchId ?? undefined,
      actorUserId: user?.userId,
      actorStaffId: user?.staffId ?? undefined,
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

  async failMpesaPayment(
    checkoutRequestId: string,
    callbackPayload?: string,
    user?: RequestUser,
  ) {
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

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        payment.facilityId,
        payment.branchId,
      );
    }

    if (payment.statusCode === 'COMPLETED') {
      return payment;
    }

    const beforeData = JSON.stringify(payment);

    const failedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        statusCode: 'FAILED',
        callbackPayload: this.compactPaymentPayload(callbackPayload),
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
      actorUserId: user?.userId,
      actorStaffId: user?.staffId ?? undefined,
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

  async handleMpesaCallback(payload: any) {
    const callback = payload?.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;

    if (!checkoutRequestId) {
      return { message: 'Ignored callback without CheckoutRequestID' };
    }

    if (Number(callback.ResultCode) !== 0) {
      await this.failMpesaPayment(
        checkoutRequestId,
        this.compactPaymentPayload(payload),
      );
      return { message: 'M-PESA callback recorded as failed' };
    }

    const metadataItems: Array<{ Name: string; Value?: string | number }> =
      callback?.CallbackMetadata?.Item ?? [];
    const metadata = metadataItems.reduce<Record<string, string | number>>(
      (acc, item) => {
        acc[item.Name] = item.Value ?? '';
        return acc;
      },
      {},
    );

    await this.confirmMpesaPayment({
      checkoutRequestId,
      merchantRequestId: callback.MerchantRequestID,
      mpesaReceiptNumber: String(metadata.MpesaReceiptNumber || ''),
      transactionRef: String(metadata.MpesaReceiptNumber || checkoutRequestId),
      callbackPayload: this.compactPaymentPayload(payload),
    }, undefined, 'CALLBACK');

    return { message: 'M-PESA callback confirmed' };
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
    return this.cacheService.rememberScoped(
      {
        facilityId: user.homeFacilityId ?? 'platform',
        branchId: user.homeBranchId ?? 'all',
        roleCode: user.roleCode,
        extra: `billing-dashboard:${JSON.stringify(scope)}`,
      },
      'billing-dashboard',
      this.getDashboardTtlSeconds(),
      async () => {
        const [
          totalInvoices,
          pendingInvoices,
          partiallyPaidInvoices,
          paidInvoices,
          invoiceAggregates,
        ] = await Promise.all([
          this.prisma.invoice.count({ where: scope }),
          this.prisma.invoice.count({
            where: { ...scope, statusCode: 'PENDING' },
          }),
          this.prisma.invoice.count({
            where: { ...scope, statusCode: 'PARTIALLY_PAID' },
          }),
          this.prisma.invoice.count({
            where: { ...scope, statusCode: { in: ['PAID', 'CLOSED'] } },
          }),
          this.prisma.invoice.aggregate({
            where: scope,
            _sum: {
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
            },
          }),
        ]);

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
          cacheMeta: {
            ttlSeconds: this.getDashboardTtlSeconds(),
            generatedAt: new Date().toISOString(),
          },
        };
      },
    );
  }

  async recalculateInvoice(invoiceId: number) {
    return this.recalculateInvoiceTotalsFromItems(invoiceId);
  }
}
