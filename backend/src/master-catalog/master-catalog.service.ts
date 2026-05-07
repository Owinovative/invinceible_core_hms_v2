import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import {
  paginatedResponse,
  parsePagination,
  type PaginationQuery,
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { SafeLoggerService } from '../resilience/safe-logger.service';
import { ImportMasterCatalogCsvDto } from './dto/import-master-catalog-csv.dto';

type CsvRow = Record<string, string>;
type ImportError = { row: number; key?: string; message: string };

const MEDICINE_COLUMNS = [
  'id',
  'code',
  'name',
  'dosageForm',
  'strength',
  'manufacturer',
  'unitPrice',
  'stockQuantity',
  'reorderLevel',
  'isActive',
];

const BILLING_SERVICE_COLUMNS = [
  'id',
  'code',
  'name',
  'category',
  'defaultPrice',
  'isActive',
];

const LAB_TEST_COLUMNS = [
  'id',
  'testName',
  'category',
  'specimenType',
  'isActive',
];

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function normalizeCode(value?: string) {
  return value?.trim().toUpperCase();
}

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

function parseCsvRecords(csvText: string) {
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

function mapCsvRow(headers: string[], cells: string[]): CsvRow {
  return headers.reduce<CsvRow>((row, header, index) => {
    row[header] = cells[index]?.trim() ?? '';
    return row;
  }, {});
}

function readText(row: CsvRow, aliases: string[]) {
  for (const alias of aliases.map(normalizeHeader)) {
    const value = row[alias];
    if (value !== undefined && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

function readNumber(row: CsvRow, aliases: string[]) {
  const raw = readText(row, aliases);
  if (!raw) return undefined;

  const number = Number(raw.replace(/,/g, ''));
  return Number.isFinite(number) ? number : undefined;
}

function readInteger(row: CsvRow, aliases: string[]) {
  const number = readNumber(row, aliases);
  return number === undefined ? undefined : Math.max(0, Math.round(number));
}

function readBoolean(row: CsvRow, aliases: string[]) {
  const raw = readText(row, aliases);
  if (!raw) return undefined;

  const normalized = raw.toLowerCase();
  if (['true', 'yes', 'y', '1', 'active'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'inactive'].includes(normalized)) {
    return false;
  }

  return undefined;
}

function readId(row: CsvRow) {
  const id = readInteger(row, ['id']);
  return id && id > 0 ? id : undefined;
}

function catalogKey(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim().toLowerCase() ?? '').join('::');
}

@Injectable()
export class MasterCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly safeLogger: SafeLoggerService,
  ) {}

  private readonly defaultCatalogPageSize = 50;
  private readonly maxCatalogPageSize = 100;
  private readonly slowCatalogListMs = Number(
    process.env.SLOW_LIST_MS ?? process.env.SLOW_REQUEST_MS ?? 1000,
  );

  private parseImport(csvText: string, requiredColumns: string[]) {
    const records = parseCsvRecords(csvText);

    if (records.length < 2) {
      throw new BadRequestException(
        'The uploaded CSV must contain a header row and at least one data row.',
      );
    }

    const headers = records[0].map(normalizeHeader);
    const missingColumn = requiredColumns
      .map(normalizeHeader)
      .find((column) => !headers.includes(column));

    if (missingColumn) {
      throw new BadRequestException(
        `The uploaded CSV is missing the ${missingColumn} column.`,
      );
    }

    return { records, headers };
  }

  private async auditImport(
    actionName: string,
    result: Record<string, unknown>,
    user: RequestUser,
  ) {
    await this.auditLogService.create({
      moduleName: 'MASTER_CATALOG',
      actionName,
      entityType: 'CSV_IMPORT',
      entityId: actionName,
      description: `${actionName} completed through platform master catalog CSV.`,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      afterData: JSON.stringify(result),
    });
  }

  async getOverview() {
    const [
      medicineCount,
      activeMedicineCount,
      billingServiceCount,
      activeBillingServiceCount,
      labTestCount,
      activeLabTestCount,
      branchStockCount,
      tariffCount,
    ] = await Promise.all([
      this.prisma.medicine.count(),
      this.prisma.medicine.count({ where: { isActive: true } }),
      this.prisma.billingService.count(),
      this.prisma.billingService.count({ where: { isActive: true } }),
      this.prisma.labTestCatalog.count(),
      this.prisma.labTestCatalog.count({ where: { isActive: true } }),
      this.prisma.branchMedicineStock.count(),
      this.prisma.serviceTariff.count(),
    ]);

    return {
      medicines: { total: medicineCount, active: activeMedicineCount },
      billingServices: {
        total: billingServiceCount,
        active: activeBillingServiceCount,
      },
      labTests: { total: labTestCount, active: activeLabTestCount },
      branchMedicinePrices: branchStockCount,
      facilityServiceTariffs: tariffCount,
    };
  }

  async getMedicines(query: PaginationQuery = {}) {
    const pagination = parsePagination(query, {
      defaultPageSize: this.defaultCatalogPageSize,
      maxPageSize: this.maxCatalogPageSize,
      allowedSortFields: ['name', 'code', 'createdAt', 'updatedAt', 'id'],
      defaultSortBy: 'name',
      defaultSortDirection: 'asc',
    });
    const startedAt = Date.now();
    const where: Prisma.MedicineWhereInput = pagination.search
      ? {
          OR: [
            { code: { contains: pagination.search } },
            { name: { contains: pagination.search } },
            { dosageForm: { contains: pagination.search } },
            { strength: { contains: pagination.search } },
            { manufacturer: { contains: pagination.search } },
          ],
        }
      : {};
    const orderBy = this.getMedicineOrderBy(
      pagination.sortBy,
      pagination.sortDirection,
    );

    const [data, total] = await Promise.all([
      this.prisma.medicine.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          code: true,
          name: true,
          dosageForm: true,
          strength: true,
          manufacturer: true,
          unitPrice: true,
          stockQuantity: true,
          reorderLevel: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.medicine.count({ where }),
    ]);

    const result = paginatedResponse(data, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
    this.logSlowCatalogList('medicines', startedAt, result.meta, pagination);
    return result;
  }

  async getMedicinesTemplate() {
    const medicines = await this.getAllMedicinesForCsv();
    const rows = [
      MEDICINE_COLUMNS,
      ...medicines.map((medicine) => [
        medicine.id,
        medicine.code,
        medicine.name,
        medicine.dosageForm ?? '',
        medicine.strength ?? '',
        medicine.manufacturer ?? '',
        medicine.unitPrice ?? 0,
        medicine.stockQuantity ?? 0,
        medicine.reorderLevel ?? 0,
        medicine.isActive,
      ]),
    ];

    return {
      fileName: 'platform-master-medicines.csv',
      columns: MEDICINE_COLUMNS,
      rowCount: medicines.length,
      csvText: toCsv(rows),
    };
  }

  async importMedicines(dto: ImportMasterCatalogCsvDto, user: RequestUser) {
    const { records, headers } = this.parseImport(dto.csvText, [
      'code',
      'name',
    ]);

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];

    for (let index = 1; index < records.length; index += 1) {
      const rowNumber = index + 1;
      const row = mapCsvRow(headers, records[index]);
      const id = readId(row);
      const code = normalizeCode(readText(row, ['code', 'medicineCode']));
      const name = readText(row, ['name', 'medicineName']);

      try {
        const existing = id
          ? await this.prisma.medicine.findUnique({ where: { id } })
          : code
            ? await this.prisma.medicine.findUnique({ where: { code } })
            : null;

        if (!existing && (!code || !name)) {
          skipped += 1;
          errors.push({
            row: rowNumber,
            key: code,
            message: 'Code and name are required for new medicines.',
          });
          continue;
        }

        if (existing && code && code !== existing.code) {
          const duplicate = await this.prisma.medicine.findUnique({
            where: { code },
          });

          if (duplicate && duplicate.id !== existing.id) {
            skipped += 1;
            errors.push({
              row: rowNumber,
              key: code,
              message: 'Another medicine already uses this code.',
            });
            continue;
          }
        }

        const dosageForm = readText(row, ['dosageForm', 'form']);
        const strength = readText(row, ['strength']);
        const manufacturer = readText(row, ['manufacturer']);
        const unitPrice = readNumber(row, ['unitPrice', 'defaultPrice']);
        const stockQuantity = readInteger(row, [
          'stockQuantity',
          'defaultStock',
        ]);
        const reorderLevel = readInteger(row, ['reorderLevel']);
        const isActive = readBoolean(row, ['isActive', 'active']);

        if (existing) {
          const data: Prisma.MedicineUpdateInput = {};
          if (code) data.code = code;
          if (name) data.name = name;
          if (dosageForm !== undefined) data.dosageForm = dosageForm;
          if (strength !== undefined) data.strength = strength;
          if (manufacturer !== undefined) data.manufacturer = manufacturer;
          if (unitPrice !== undefined) data.unitPrice = unitPrice;
          if (stockQuantity !== undefined) data.stockQuantity = stockQuantity;
          if (reorderLevel !== undefined) data.reorderLevel = reorderLevel;
          if (isActive !== undefined) data.isActive = isActive;

          await this.prisma.medicine.update({
            where: { id: existing.id },
            data,
          });
          updated += 1;
        } else {
          await this.prisma.medicine.create({
            data: {
              code: code!,
              name: name!,
              dosageForm: dosageForm ?? null,
              strength: strength ?? null,
              manufacturer: manufacturer ?? null,
              unitPrice: unitPrice ?? 0,
              stockQuantity: stockQuantity ?? 0,
              reorderLevel: reorderLevel ?? 0,
              isActive: isActive ?? true,
            },
          });
          created += 1;
        }

        processed += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          key: code,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to import medicine row.',
        });
      }
    }

    const result = { processed, created, updated, skipped, errors };
    await this.auditImport('IMPORT_MASTER_MEDICINES', result, user);
    return result;
  }

  async getBillingServices(query: PaginationQuery = {}) {
    const pagination = parsePagination(query, {
      defaultPageSize: this.defaultCatalogPageSize,
      maxPageSize: this.maxCatalogPageSize,
      allowedSortFields: [
        'category',
        'name',
        'code',
        'createdAt',
        'updatedAt',
        'id',
      ],
      defaultSortBy: 'category',
      defaultSortDirection: 'asc',
    });
    const startedAt = Date.now();
    const where: Prisma.BillingServiceWhereInput = pagination.search
      ? {
          OR: [
            { code: { contains: pagination.search } },
            { name: { contains: pagination.search } },
            { category: { contains: pagination.search } },
          ],
        }
      : {};
    const orderBy = this.getBillingServiceOrderBy(
      pagination.sortBy,
      pagination.sortDirection,
    );

    const [data, total] = await Promise.all([
      this.prisma.billingService.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          defaultPrice: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.billingService.count({ where }),
    ]);

    const result = paginatedResponse(data, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
    this.logSlowCatalogList(
      'billing-services',
      startedAt,
      result.meta,
      pagination,
    );
    return result;
  }

  async getBillingServicesTemplate() {
    const services = await this.getAllBillingServicesForCsv();
    const rows = [
      BILLING_SERVICE_COLUMNS,
      ...services.map((service) => [
        service.id,
        service.code,
        service.name,
        service.category ?? '',
        service.defaultPrice,
        service.isActive,
      ]),
    ];

    return {
      fileName: 'platform-master-billing-services.csv',
      columns: BILLING_SERVICE_COLUMNS,
      rowCount: services.length,
      csvText: toCsv(rows),
    };
  }

  async importBillingServices(
    dto: ImportMasterCatalogCsvDto,
    user: RequestUser,
  ) {
    const { records, headers } = this.parseImport(dto.csvText, [
      'code',
      'name',
    ]);

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];

    for (let index = 1; index < records.length; index += 1) {
      const rowNumber = index + 1;
      const row = mapCsvRow(headers, records[index]);
      const id = readId(row);
      const code = normalizeCode(readText(row, ['code', 'serviceCode']));
      const name = readText(row, ['name', 'serviceName']);

      try {
        const existing = id
          ? await this.prisma.billingService.findUnique({ where: { id } })
          : code
            ? await this.prisma.billingService.findUnique({ where: { code } })
            : null;

        if (!existing && (!code || !name)) {
          skipped += 1;
          errors.push({
            row: rowNumber,
            key: code,
            message: 'Code and name are required for new services.',
          });
          continue;
        }

        if (existing && code && code !== existing.code) {
          const duplicate = await this.prisma.billingService.findUnique({
            where: { code },
          });

          if (duplicate && duplicate.id !== existing.id) {
            skipped += 1;
            errors.push({
              row: rowNumber,
              key: code,
              message: 'Another billing service already uses this code.',
            });
            continue;
          }
        }

        const category =
          normalizeCode(readText(row, ['category'])) ?? existing?.category;
        const defaultPrice = readNumber(row, [
          'defaultPrice',
          'unitPrice',
          'price',
        ]);
        const isActive = readBoolean(row, ['isActive', 'active']);

        if (existing) {
          const data: Prisma.BillingServiceUpdateInput = {};
          if (code) data.code = code;
          if (name) data.name = name;
          if (category !== undefined) data.category = category;
          if (defaultPrice !== undefined) data.defaultPrice = defaultPrice;
          if (isActive !== undefined) data.isActive = isActive;

          await this.prisma.billingService.update({
            where: { id: existing.id },
            data,
          });
          updated += 1;
        } else {
          await this.prisma.billingService.create({
            data: {
              code: code!,
              name: name!,
              category: category ?? 'SERVICE',
              defaultPrice: defaultPrice ?? 0,
              isActive: isActive ?? true,
            },
          });
          created += 1;
        }

        processed += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          key: code,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to import billing service row.',
        });
      }
    }

    const result = { processed, created, updated, skipped, errors };
    await this.auditImport('IMPORT_MASTER_BILLING_SERVICES', result, user);
    return result;
  }

  async getLabTests(query: PaginationQuery = {}) {
    const pagination = parsePagination(query, {
      defaultPageSize: this.defaultCatalogPageSize,
      maxPageSize: this.maxCatalogPageSize,
      allowedSortFields: ['category', 'testName', 'createdAt', 'id'],
      defaultSortBy: 'category',
      defaultSortDirection: 'asc',
    });
    const startedAt = Date.now();
    const where: Prisma.LabTestCatalogWhereInput = pagination.search
      ? {
          OR: [
            { testName: { contains: pagination.search } },
            { category: { contains: pagination.search } },
            { specimenType: { contains: pagination.search } },
          ],
        }
      : {};
    const orderBy = this.getLabTestOrderBy(
      pagination.sortBy,
      pagination.sortDirection,
    );

    const [data, total] = await Promise.all([
      this.prisma.labTestCatalog.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          testName: true,
          category: true,
          specimenType: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.labTestCatalog.count({ where }),
    ]);

    const result = paginatedResponse(data, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
    this.logSlowCatalogList('lab-tests', startedAt, result.meta, pagination);
    return result;
  }

  async getLabTestsTemplate() {
    const labTests = await this.getAllLabTestsForCsv();
    const rows = [
      LAB_TEST_COLUMNS,
      ...labTests.map((test) => [
        test.id,
        test.testName,
        test.category ?? '',
        test.specimenType ?? '',
        test.isActive,
      ]),
    ];

    return {
      fileName: 'platform-master-lab-tests.csv',
      columns: LAB_TEST_COLUMNS,
      rowCount: labTests.length,
      csvText: toCsv(rows),
    };
  }

  async importLabTests(dto: ImportMasterCatalogCsvDto, user: RequestUser) {
    const { records, headers } = this.parseImport(dto.csvText, ['testName']);
    const existingTests = await this.prisma.labTestCatalog.findMany();
    const existingByKey = new Map(
      existingTests.map((test) => [
        catalogKey([test.testName, test.category, test.specimenType]),
        test,
      ]),
    );

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];

    for (let index = 1; index < records.length; index += 1) {
      const rowNumber = index + 1;
      const row = mapCsvRow(headers, records[index]);
      const id = readId(row);
      const testName = readText(row, ['testName', 'name']);
      const category = readText(row, ['category']);
      const specimenType = readText(row, ['specimenType', 'specimen']);
      const isActive = readBoolean(row, ['isActive', 'active']);

      try {
        const key = catalogKey([testName, category, specimenType]);
        const existing = id
          ? await this.prisma.labTestCatalog.findUnique({ where: { id } })
          : testName
            ? existingByKey.get(key)
            : null;

        if (!existing && !testName) {
          skipped += 1;
          errors.push({
            row: rowNumber,
            message: 'testName is required for new lab tests.',
          });
          continue;
        }

        if (existing) {
          const data: Prisma.LabTestCatalogUpdateInput = {};
          if (testName) data.testName = testName;
          if (category !== undefined) data.category = category;
          if (specimenType !== undefined) data.specimenType = specimenType;
          if (isActive !== undefined) data.isActive = isActive;

          const updatedTest = await this.prisma.labTestCatalog.update({
            where: { id: existing.id },
            data,
          });
          existingByKey.set(
            catalogKey([
              updatedTest.testName,
              updatedTest.category,
              updatedTest.specimenType,
            ]),
            updatedTest,
          );
          updated += 1;
        } else {
          const createdTest = await this.prisma.labTestCatalog.create({
            data: {
              testName: testName!,
              category: category ?? null,
              specimenType: specimenType ?? null,
              isActive: isActive ?? true,
            },
          });
          existingByKey.set(
            catalogKey([
              createdTest.testName,
              createdTest.category,
              createdTest.specimenType,
            ]),
            createdTest,
          );
          created += 1;
        }

        processed += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          key: testName,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to import lab test row.',
        });
      }
    }

    const result = { processed, created, updated, skipped, errors };
    await this.auditImport('IMPORT_MASTER_LAB_TESTS', result, user);
    return result;
  }

  private getMedicineOrderBy(
    sortBy: string,
    sortDirection: string,
  ): Prisma.MedicineOrderByWithRelationInput[] {
    const direction: Prisma.SortOrder =
      sortDirection === 'asc' ? 'asc' : 'desc';
    if (sortBy === 'id') return [{ id: direction }];
    return [
      { [sortBy]: direction } as Prisma.MedicineOrderByWithRelationInput,
      { id: 'asc' },
    ];
  }

  private getBillingServiceOrderBy(
    sortBy: string,
    sortDirection: string,
  ): Prisma.BillingServiceOrderByWithRelationInput[] {
    const direction: Prisma.SortOrder =
      sortDirection === 'asc' ? 'asc' : 'desc';
    if (sortBy === 'id') return [{ id: direction }];
    return [
      {
        [sortBy]: direction,
      } as Prisma.BillingServiceOrderByWithRelationInput,
      { id: 'asc' },
    ];
  }

  private getLabTestOrderBy(
    sortBy: string,
    sortDirection: string,
  ): Prisma.LabTestCatalogOrderByWithRelationInput[] {
    const direction: Prisma.SortOrder =
      sortDirection === 'asc' ? 'asc' : 'desc';
    if (sortBy === 'id') return [{ id: direction }];
    return [
      {
        [sortBy]: direction,
      } as Prisma.LabTestCatalogOrderByWithRelationInput,
      { id: 'asc' },
    ];
  }

  private logSlowCatalogList(
    kind: string,
    startedAt: number,
    meta: { page: number; pageSize: number; total: number },
    pagination: ReturnType<typeof parsePagination>,
  ) {
    const durationMs = Date.now() - startedAt;
    if (durationMs < this.slowCatalogListMs) return;

    this.safeLogger.warn('Slow master catalog list request', {
      kind,
      durationMs,
      page: meta.page,
      pageSize: meta.pageSize,
      total: meta.total,
      search: pagination.search ? '[present]' : undefined,
      sortBy: pagination.sortBy,
      sortDirection: pagination.sortDirection,
    });
  }

  private getAllMedicinesForCsv() {
    return this.prisma.medicine.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        dosageForm: true,
        strength: true,
        manufacturer: true,
        unitPrice: true,
        stockQuantity: true,
        reorderLevel: true,
        isActive: true,
      },
    });
  }

  private getAllBillingServicesForCsv() {
    return this.prisma.billingService.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        defaultPrice: true,
        isActive: true,
      },
    });
  }

  private getAllLabTestsForCsv() {
    return this.prisma.labTestCatalog.findMany({
      orderBy: [{ category: 'asc' }, { testName: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        testName: true,
        category: true,
        specimenType: true,
        isActive: true,
      },
    });
  }
}
