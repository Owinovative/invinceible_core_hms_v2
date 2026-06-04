import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityService } from '../facility/facility.service';
import { BranchService } from '../branch/branch.service';
import { CreateBranchMedicineStockDto } from './dto/create-branch-medicine-stock.dto';
import { UpdateBranchMedicineStockDto } from './dto/update-branch-medicine-stock.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { RestockBranchMedicineDto } from './dto/restock-branch-medicine.dto';
import { ImportBranchPricingCsvDto } from './dto/import-branch-pricing-csv.dto';
import {
  paginatedResponse,
  parsePagination,
  type PaginationQuery,
} from '../common/pagination/pagination';
import { SafeLoggerService } from '../resilience/safe-logger.service';

type CsvRow = Record<string, string>;

const BRANCH_PRICING_COLUMNS = [
  'medicineCode',
  'medicineName',
  'dosageForm',
  'strength',
  'manufacturer',
  'currentStock',
  'stockQuantity',
  'reorderLevel',
  'buyingPrice',
  'sellingPrice',
  'isActive',
];

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
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

  return ['true', 'yes', 'y', '1', 'active'].includes(raw.toLowerCase());
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function medicineTokens(value?: string | null) {
  const stopWords = new Set([
    'tab',
    'tabs',
    'tablet',
    'tablets',
    'cap',
    'caps',
    'capsule',
    'capsules',
    'syrup',
    'suspension',
    'injection',
    'inj',
    'cream',
    'ointment',
    'drops',
    'mg',
    'ml',
    'g',
  ]);

  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function stockStatus(stockQuantity?: number | null, reorderLevel?: number | null) {
  const quantity = Number(stockQuantity || 0);
  const reorder = Number(reorderLevel || 0);

  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (reorder > 0 && quantity <= reorder) return 'LOW_STOCK';
  return 'IN_STOCK';
}

@Injectable()
export class PharmacyStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    private readonly branchService: BranchService,
    private readonly scopeService: ScopeService,
    private readonly safeLogger: SafeLoggerService,
  ) {}

  private async resolveRecoveredStockNotifications(stockId: number) {
    const stock = await this.prisma.branchMedicineStock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      throw new NotFoundException(
        `Branch medicine stock with id ${stockId} not found`,
      );
    }

    if (stock.stockQuantity > stock.reorderLevel) {
      await this.prisma.notification.updateMany({
        where: {
          entityType: 'BRANCH_MEDICINE_STOCK',
          entityId: String(stock.id),
          facilityId: stock.facilityId,
          branchId: stock.branchId,
          notificationType: {
            in: ['LOW_STOCK', 'OUT_OF_STOCK'],
          },
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolutionNote:
            'Automatically resolved because stock recovered above reorder level.',
        },
      });
    }
  }

  private async getScopedBranch(branchId: number, user: RequestUser) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { facility: true },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with id ${branchId} not found`);
    }

    this.scopeService.assertBranchAccess(user, branch.facilityId, branchId);

    return branch;
  }

  async getBranchPricingTemplate(branchId: number, user: RequestUser) {
    const branch = await this.getScopedBranch(branchId, user);
    const [medicines, branchStocks] = await Promise.all([
      this.prisma.medicine.findMany({
        where: { isActive: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.branchMedicineStock.findMany({
        where: { branchId, facilityId: branch.facilityId },
      }),
    ]);

    const stockByMedicineId = new Map(
      branchStocks.map((stock) => [stock.medicineId, stock]),
    );

    const rows = [
      BRANCH_PRICING_COLUMNS,
      ...medicines.map((medicine) => {
        const stock = stockByMedicineId.get(medicine.id);

        return [
          medicine.code,
          medicine.name,
          medicine.dosageForm ?? '',
          medicine.strength ?? '',
          medicine.manufacturer ?? '',
          stock?.stockQuantity ?? 0,
          stock?.stockQuantity ?? '',
          stock?.reorderLevel ?? medicine.reorderLevel ?? 0,
          stock?.buyingPrice ?? 0,
          stock?.unitPrice ?? medicine.unitPrice ?? 0,
          stock?.isActive ?? true,
        ];
      }),
    ];

    return {
      fileName: `pharmacy-pricing-${branch.code ?? branch.id}.csv`,
      branch: {
        id: branch.id,
        name: branch.name,
        facilityId: branch.facilityId,
        facilityName: branch.facility?.name ?? null,
      },
      columns: BRANCH_PRICING_COLUMNS,
      rowCount: medicines.length,
      csvText: toCsv(rows),
    };
  }

  async importBranchPricing(
    branchId: number,
    dto: ImportBranchPricingCsvDto,
    user: RequestUser,
  ) {
    const branch = await this.getScopedBranch(branchId, user);
    const records = parseCsvRecords(dto.csvText);

    if (records.length < 2) {
      throw new BadRequestException(
        'The uploaded pricing file must contain a header row and at least one medicine row.',
      );
    }

    const headers = records[0].map(normalizeHeader);
    const medicineCodeIndex = headers.indexOf('medicinecode');

    if (medicineCodeIndex === -1) {
      throw new BadRequestException(
        'The pricing file must include a medicineCode column.',
      );
    }

    const codes = Array.from(
      new Set(
        records
          .slice(1)
          .map((cells) => cells[medicineCodeIndex]?.trim())
          .filter((code): code is string => Boolean(code))
          .map((code) => code.toUpperCase()),
      ),
    );

    const medicines = await this.prisma.medicine.findMany({
      where: {
        code: {
          in: codes,
        },
      },
    });
    const medicineByCode = new Map(
      medicines.map((medicine) => [medicine.code.toUpperCase(), medicine]),
    );

    let processed = 0;
    let created = 0;
    let updated = 0;
    let masterCreated = 0;
    let masterUpdated = 0;
    let skipped = 0;
    const errors: Array<{
      row: number;
      medicineCode?: string;
      message: string;
    }> = [];

    for (let index = 1; index < records.length; index += 1) {
      const rowNumber = index + 1;
      const row = mapCsvRow(headers, records[index]);
      const medicineCode = readText(row, ['medicineCode']);

      if (!medicineCode) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          message: 'Missing medicineCode.',
        });
        continue;
      }

      let medicine = medicineByCode.get(medicineCode.toUpperCase());

      if (!medicine) {
        const medicineName = readText(row, ['medicineName', 'name']);

        if (!medicineName) {
          skipped += 1;
          errors.push({
            row: rowNumber,
            medicineCode,
            message:
              'Medicine code is new. Add medicineName so the master catalogue can be created.',
          });
          continue;
        }

        medicine = await this.prisma.medicine.create({
          data: {
            code: medicineCode.toUpperCase(),
            name: medicineName,
            dosageForm: readText(row, ['dosageForm', 'form']),
            strength: readText(row, ['strength']),
            manufacturer: readText(row, ['manufacturer']),
            unitPrice:
              readNumber(row, ['sellingPrice', 'unitPrice', 'branchPrice']) ??
              0,
            stockQuantity: 0,
            reorderLevel:
              readInteger(row, ['reorderLevel', 'minimumStock']) ?? 0,
            isActive: readBoolean(row, ['isActive', 'active']) ?? true,
          },
        });

        medicineByCode.set(medicine.code.toUpperCase(), medicine);
        masterCreated += 1;
      } else {
        const masterUpdate = {
          name: readText(row, ['medicineName', 'name']) ?? medicine.name,
          dosageForm:
            readText(row, ['dosageForm', 'form']) ?? medicine.dosageForm,
          strength: readText(row, ['strength']) ?? medicine.strength,
          manufacturer:
            readText(row, ['manufacturer']) ?? medicine.manufacturer,
        };

        if (
          masterUpdate.name !== medicine.name ||
          masterUpdate.dosageForm !== medicine.dosageForm ||
          masterUpdate.strength !== medicine.strength ||
          masterUpdate.manufacturer !== medicine.manufacturer
        ) {
          medicine = await this.prisma.medicine.update({
            where: { id: medicine.id },
            data: masterUpdate,
          });
          medicineByCode.set(medicine.code.toUpperCase(), medicine);
          masterUpdated += 1;
        }
      }

      const existing = await this.prisma.branchMedicineStock.findUnique({
        where: {
          branchId_medicineId: {
            branchId,
            medicineId: medicine.id,
          },
        },
      });

      const stockQuantity =
        readInteger(row, ['stockQuantity', 'stock', 'quantity']) ??
        existing?.stockQuantity ??
        0;
      const reorderLevel =
        readInteger(row, ['reorderLevel', 'minimumStock']) ??
        existing?.reorderLevel ??
        medicine.reorderLevel ??
        0;
      const buyingPrice =
        readNumber(row, ['buyingPrice', 'purchasePrice', 'costPrice']) ??
        existing?.buyingPrice ??
        0;
      const unitPrice =
        readNumber(row, ['sellingPrice', 'unitPrice', 'branchPrice']) ??
        existing?.unitPrice ??
        medicine.unitPrice ??
        0;
      const isActive = readBoolean(row, ['isActive', 'active']) ?? true;

      await this.prisma.branchMedicineStock.upsert({
        where: {
          branchId_medicineId: {
            branchId,
            medicineId: medicine.id,
          },
        },
        create: {
          facilityId: branch.facilityId,
          branchId,
          medicineId: medicine.id,
          stockQuantity,
          reorderLevel,
          buyingPrice,
          unitPrice,
          isActive,
        },
        update: {
          stockQuantity,
          reorderLevel,
          buyingPrice,
          unitPrice,
          isActive,
        },
      });

      processed += 1;
      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        facilityId: branch.facilityId,
      },
      processed,
      created,
      updated,
      masterCreated,
      masterUpdated,
      skipped,
      errors,
    };
  }

  async restockBranchMedicine(stockId: number, dto: RestockBranchMedicineDto) {
    const stock = await this.prisma.branchMedicineStock.findUnique({
      where: { id: stockId },
      include: {
        medicine: true,
        branch: true,
        facility: true,
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `Branch medicine stock with id ${stockId} not found`,
      );
    }

    const updated = await this.prisma.branchMedicineStock.update({
      where: { id: stockId },
      data: {
        stockQuantity: {
          increment: dto.quantityToAdd,
        },
        reorderLevel: dto.reorderLevel ?? stock.reorderLevel,
        buyingPrice: dto.buyingPrice ?? stock.buyingPrice,
        unitPrice: dto.unitPrice ?? stock.unitPrice,
      },
      include: {
        medicine: true,
        branch: true,
        facility: true,
      },
    });

    await this.resolveRecoveredStockNotifications(updated.id);

    return updated;
  }

  async restockBranchMedicineScoped(
    stockId: number,
    dto: RestockBranchMedicineDto,
    user: RequestUser,
  ) {
    await this.findOneScoped(stockId, user);

    return this.restockBranchMedicine(stockId, dto);
  }

  async create(dto: CreateBranchMedicineStockDto) {
    await this.facilityService.findOne(dto.facilityId);
    const branch = await this.branchService.findOne(dto.branchId);

    if (branch.facilityId !== dto.facilityId) {
      throw new BadRequestException(
        'Selected branch does not belong to the selected facility',
      );
    }

    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });

    if (!medicine) {
      throw new NotFoundException(
        `Medicine with id ${dto.medicineId} not found`,
      );
    }

    const existing = await this.prisma.branchMedicineStock.findFirst({
      where: {
        branchId: dto.branchId,
        medicineId: dto.medicineId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'This medicine already has a stock record for the selected branch',
      );
    }

    const created = await this.prisma.branchMedicineStock.create({
      data: {
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        medicineId: dto.medicineId,
        stockQuantity: dto.stockQuantity ?? 0,
        reorderLevel: dto.reorderLevel ?? 0,
        buyingPrice: dto.buyingPrice ?? 0,
        unitPrice: dto.unitPrice ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
    });

    await this.resolveRecoveredStockNotifications(created.id);

    return created;
  }

  async createScoped(dto: CreateBranchMedicineStockDto, user: RequestUser) {
    this.scopeService.assertBranchAccess(user, dto.facilityId, dto.branchId);

    return this.create(dto);
  }

  findAll() {
    return this.prisma.branchMedicineStock.findMany({
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  private buildStockSearchWhere(search?: string): Prisma.BranchMedicineStockWhereInput[] {
      if (!search) return [];
      
      const query = search.trim();
      return [
        { medicine: { code: { contains: query } } },
        { medicine: { name: { contains: query } } },
        { medicine: { dosageForm: { contains: query } } },
        { medicine: { strength: { contains: query } } },
        { medicine: { manufacturer: { contains: query } } },
      ];
    }

  private branchStockListSelect() {
    return {
      id: true,
      facilityId: true,
      branchId: true,
      medicineId: true,
      stockQuantity: true,
      reorderLevel: true,
      buyingPrice: true,
      unitPrice: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      facility: { select: { id: true, code: true, name: true } },
      branch: { select: { id: true, code: true, name: true } },
      medicine: {
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
      },
    } satisfies Prisma.BranchMedicineStockSelect;
  }

  async findAllScoped(user: RequestUser, query: PaginationQuery = {}) {
    const scope = this.scopeService.buildReadScope(user);
    const params = parsePagination(query, {
      defaultPageSize: 50,
      maxPageSize: 100,
      allowedSortFields: [
        'id',
        'stockQuantity',
        'reorderLevel',
        'unitPrice',
        'buyingPrice',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: 'id',
      defaultSortDirection: 'asc',
    });
    const where: Prisma.BranchMedicineStockWhereInput = { ...scope };
    const searchOr = this.buildStockSearchWhere(params.search);
    if (searchOr.length) {
      where.OR = searchOr;
    }

    const startedAt = Date.now();
    const [data, total] = await Promise.all([
      this.prisma.branchMedicineStock.findMany({
        where,
        select: this.branchStockListSelect(),
        skip: params.skip,
        take: params.take,
        orderBy: { [params.sortBy]: params.sortDirection },
      }),
      this.prisma.branchMedicineStock.count({ where }),
    ]);

    const durationMs = Date.now() - startedAt;
    if (durationMs >= Number(process.env.SLOW_LIST_MS ?? 750)) {
      this.safeLogger.warn('Slow pharmacy stock list request', {
        durationMs,
        page: params.page,
        pageSize: params.pageSize,
        total,
        facilityId: user.homeFacilityId ?? null,
        branchId: user.homeBranchId ?? null,
        roleCode: user.roleCode,
      });
    }

    return paginatedResponse(data, {
      page: params.page,
      pageSize: params.pageSize,
      total,
    });
  }

  findByBranch(branchId: number) {
    return this.prisma.branchMedicineStock.findMany({
      where: { branchId },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findByBranchScoped(
    branchId: number,
    user: RequestUser,
    query: PaginationQuery = {},
  ) {
    const branch = await this.getScopedBranch(branchId, user);
    const params = parsePagination(query, {
      defaultPageSize: 50,
      maxPageSize: 100,
      allowedSortFields: [
        'id',
        'stockQuantity',
        'reorderLevel',
        'unitPrice',
        'buyingPrice',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: 'id',
      defaultSortDirection: 'asc',
    });
    const where: Prisma.BranchMedicineStockWhereInput = {
      facilityId: branch.facilityId,
      branchId,
    };
    const searchOr = this.buildStockSearchWhere(params.search);
    if (searchOr.length) {
      where.OR = searchOr;
    }

    const startedAt = Date.now();
    const [data, total] = await Promise.all([
      this.prisma.branchMedicineStock.findMany({
        where,
        select: this.branchStockListSelect(),
        skip: params.skip,
        take: params.take,
        orderBy: { [params.sortBy]: params.sortDirection },
      }),
      this.prisma.branchMedicineStock.count({ where }),
    ]);

    const durationMs = Date.now() - startedAt;
    if (durationMs >= Number(process.env.SLOW_LIST_MS ?? 750)) {
      this.safeLogger.warn('Slow branch pharmacy stock list request', {
        durationMs,
        page: params.page,
        pageSize: params.pageSize,
        total,
        facilityId: branch.facilityId,
        branchId,
        roleCode: user.roleCode,
      });
    }

    return paginatedResponse(data, {
      page: params.page,
      pageSize: params.pageSize,
      total,
    });
  }

  async searchBranchMedicinesScoped(
    branchId: number,
    search: string | undefined,
    user: RequestUser,
  ) {
    const branch = await this.getScopedBranch(branchId, user);
    const query = String(search ?? '').trim();

    return this.prisma.branchMedicineStock.findMany({
      where: {
        facilityId: branch.facilityId,
        branchId,
        isActive: true,
        medicine: {
          isActive: true,
          ...(query
            ? {
                OR: [
                  { name: { contains: query } },
                  { code: { contains: query } },
                  { dosageForm: { contains: query } },
                  { strength: { contains: query } },
                  { manufacturer: { contains: query } },
                ],
              }
            : {}),
        },
      },
      select: {
        id: true,
        facilityId: true,
        branchId: true,
        medicineId: true,
        stockQuantity: true,
        reorderLevel: true,
        buyingPrice: true,
        unitPrice: true,
        isActive: true,
        facility: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        medicine: {
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
        },
      },
      orderBy: [{ stockQuantity: 'desc' }, { id: 'asc' }],
      take: 50,
    });
  }

  async findMedicineAlternativesScoped(
    branchId: number,
    medicineId: number,
    user: RequestUser,
  ) {
    const branch = await this.getScopedBranch(branchId, user);
    const selectedMedicine = await this.prisma.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!selectedMedicine) {
      throw new NotFoundException(`Medicine with id ${medicineId} not found`);
    }

    const [selectedStock, branchStocks] = await Promise.all([
      this.prisma.branchMedicineStock.findUnique({
        where: {
          branchId_medicineId: {
            branchId,
            medicineId,
          },
        },
        include: {
          medicine: true,
          branch: true,
          facility: true,
        },
      }),
      this.prisma.branchMedicineStock.findMany({
        where: {
          facilityId: branch.facilityId,
          branchId,
          isActive: true,
          stockQuantity: { gt: 0 },
          medicineId: { not: medicineId },
          medicine: { isActive: true },
        },
        include: {
          medicine: true,
          branch: true,
          facility: true,
        },
        orderBy: [{ stockQuantity: 'desc' }, { id: 'asc' }],
        take: 250,
      }),
    ]);

    const selectedTokens = new Set(medicineTokens(selectedMedicine.name));
    const selectedForm = normalizeText(selectedMedicine.dosageForm);
    const selectedStrength = normalizeText(selectedMedicine.strength);

    const alternatives = branchStocks
      .map((stock) => {
        const candidateTokens = medicineTokens(stock.medicine?.name);
        const sharedTokens = candidateTokens.filter((token) =>
          selectedTokens.has(token),
        );
        const sameForm =
          selectedForm &&
          normalizeText(stock.medicine?.dosageForm) === selectedForm;
        const sameStrength =
          selectedStrength &&
          normalizeText(stock.medicine?.strength) === selectedStrength;
        const sameManufacturer =
          selectedMedicine.manufacturer &&
          normalizeText(stock.medicine?.manufacturer) ===
            normalizeText(selectedMedicine.manufacturer);

        const score =
          sharedTokens.length * 18 +
          (sameForm ? 28 : 0) +
          (sameStrength ? 28 : 0) +
          (sameManufacturer ? 6 : 0);

        const reasons = [
          sameForm ? 'Same dosage form' : null,
          sameStrength ? 'Same strength' : null,
          sharedTokens.length
            ? `Name-family overlap: ${sharedTokens.slice(0, 4).join(', ')}`
            : null,
          sameManufacturer ? 'Same manufacturer' : null,
        ].filter(Boolean);

        return {
          stock,
          score,
          reasons,
        };
      })
      .filter((item) => item.score >= 28)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => ({
        id: item.stock.id,
        facilityId: item.stock.facilityId,
        branchId: item.stock.branchId,
        medicineId: item.stock.medicineId,
        stockQuantity: item.stock.stockQuantity,
        reorderLevel: item.stock.reorderLevel,
        buyingPrice: item.stock.buyingPrice,
        unitPrice: item.stock.unitPrice,
        isActive: item.stock.isActive,
        medicine: item.stock.medicine,
        branch: item.stock.branch,
        facility: item.stock.facility,
        score: item.score,
        reasons: item.reasons,
        safetyNote:
          'Stock assistant shortlist only. Clinician must confirm indication, contraindications, allergies, dose, and route before use.',
      }));

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        facilityId: branch.facilityId,
        facilityName: branch.facility?.name ?? null,
      },
      selectedMedicine,
      selectedStock,
      selectedStatus: stockStatus(
        selectedStock?.stockQuantity,
        selectedStock?.reorderLevel,
      ),
      alternatives,
      safetyNotice:
        'The system ranks in-stock medicines from the same branch using catalogue similarity. It does not guarantee therapeutic equivalence.',
    };
  }

  async findOne(id: number) {
    const stock = await this.prisma.branchMedicineStock.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `Branch medicine stock with id ${id} not found`,
      );
    }

    return stock;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const stock = await this.findOne(id);

    this.scopeService.assertBranchAccess(
      user,
      stock.facilityId,
      stock.branchId,
    );

    return stock;
  }

  async update(id: number, dto: UpdateBranchMedicineStockDto) {
    await this.findOne(id);

    const updated = await this.prisma.branchMedicineStock.update({
      where: { id },
      data: {
        stockQuantity: dto.stockQuantity,
        reorderLevel: dto.reorderLevel,
        buyingPrice: dto.buyingPrice,
        unitPrice: dto.unitPrice,
        isActive: dto.isActive,
      },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
    });

    await this.resolveRecoveredStockNotifications(updated.id);

    return updated;
  }

  async updateScoped(
    id: number,
    dto: UpdateBranchMedicineStockDto,
    user: RequestUser,
  ) {
    await this.findOneScoped(id, user);

    return this.update(id, dto);
  }

  async addStock(id: number, quantity: number) {
    const stock = await this.findOne(id);

    const updated = await this.prisma.branchMedicineStock.update({
      where: { id },
      data: {
        stockQuantity: stock.stockQuantity + quantity,
      },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
    });

    await this.resolveRecoveredStockNotifications(updated.id);

    return updated;
  }

  async deductStock(id: number, quantity: number) {
    const stock = await this.findOne(id);

    if (stock.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient branch stock');
    }

    return this.prisma.branchMedicineStock.update({
      where: { id },
      data: {
        stockQuantity: stock.stockQuantity - quantity,
      },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
    });
  }

  async getLowStock(facilityId?: number, branchId?: number) {
    const where: Prisma.BranchMedicineStockWhereInput = {
      isActive: true,
    };

    if (facilityId) {
      await this.facilityService.findOne(facilityId);
      where.facilityId = facilityId;
    }

    if (branchId) {
      const branch = await this.branchService.findOne(branchId);
      where.branchId = branchId;

      if (facilityId && branch.facilityId !== facilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    const stocks = await this.prisma.branchMedicineStock.findMany({
      where,
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
      orderBy: { id: 'asc' },
    });

    const lowStockItems = stocks.filter(
      (item) => item.stockQuantity <= item.reorderLevel,
    );
    const outOfStockItems = stocks.filter((item) => item.stockQuantity <= 0);

    return {
      filters: {
        facilityId: facilityId ?? null,
        branchId: branchId ?? null,
      },
      summary: {
        totalChecked: stocks.length,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
      },
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
        buyingPrice: item.buyingPrice,
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
        buyingPrice: item.buyingPrice,
        unitPrice: item.unitPrice,
      })),
    };
  }

  async getLowStockScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.getLowStock(
      scope.facilityId,
      typeof scope.branchId === 'object' ? undefined : scope.branchId,
    );
  }
}
