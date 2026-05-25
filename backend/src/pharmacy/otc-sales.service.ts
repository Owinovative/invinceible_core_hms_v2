import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  paginatedResponse,
  parsePagination,
} from '../common/pagination/pagination';
import {
  addCompactDefinitionList,
  addCompactParagraph,
  addCompactTable,
  addMiniKeyValueGrid,
  addSectionTitle,
  createHospitalPdfBuffer,
  formatPdfDate,
  formatPdfMoney,
  patientName,
  staffName,
} from '../common/pdf/hospital-pdf';
import {
  CreateOtcSaleDto,
  OtcSaleItemInputDto,
} from './dto/create-otc-sale.dto';
import { UpdateOtcSaleItemDto } from './dto/update-otc-sale-item.dto';
import {
  INSURANCE_CLAIM_STATUSES,
  OtcSalePaymentInputDto,
  RecordOtcSalePaymentDto,
} from './dto/record-otc-sale-payment.dto';
import {
  OtcMedicineSearchQueryDto,
  OtcSaleListQueryDto,
} from './dto/otc-sale-query.dto';

const FINAL_SALE_STATUSES = ['PAID', 'CANCELLED', 'REFUNDED'];
const COUNTED_INSURANCE_STATUSES = [
  'APPROVED',
  'PARTIALLY_APPROVED',
  'PAID',
];
const COUNTED_PAYMENT_STATUSES = ['COMPLETED', 'PAID', 'CONFIRMED'];

type OtcPaymentSummaryInput = {
  paymentMethod: string;
  statusCode?: string | null;
  amount?: number | null;
  insuranceCoveredAmount?: number | null;
  insuranceClaimStatus?: string | null;
};

function roundMoney(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function safeReceiptFileName(value: string) {
  return `${value || 'otc-receipt'}`
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function maskValue(value?: string | null, visibleStart = 2, visibleEnd = 3) {
  if (!value) return undefined;
  const clean = String(value).trim();
  if (clean.length <= visibleStart + visibleEnd) return clean;
  return `${clean.slice(0, visibleStart)}${'*'.repeat(
    Math.min(8, clean.length - visibleStart - visibleEnd),
  )}${clean.slice(-visibleEnd)}`;
}

export function stockStatus(
  stockQuantity?: number | null,
  reorderLevel?: number | null,
) {
  const quantity = Number(stockQuantity || 0);
  const reorder = Number(reorderLevel || 0);

  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (reorder > 0 && quantity <= reorder) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function calculateOtcPaymentSummary(
  totalAmount: number,
  payments: OtcPaymentSummaryInput[],
) {
  let paidAmount = 0;
  let hasPendingInsurance = false;

  for (const payment of payments) {
    const method = payment.paymentMethod.toUpperCase();
    const status = (payment.statusCode || '').toUpperCase();
    const claimStatus = (payment.insuranceClaimStatus || '').toUpperCase();

    if (method === 'INSURANCE') {
      if (COUNTED_INSURANCE_STATUSES.includes(claimStatus)) {
        paidAmount += Number(payment.insuranceCoveredAmount || 0);
      } else if (['DRAFT', 'PENDING_APPROVAL'].includes(claimStatus)) {
        hasPendingInsurance = true;
      }
      continue;
    }

    if (COUNTED_PAYMENT_STATUSES.includes(status)) {
      paidAmount += Number(payment.amount || 0);
    }
  }

  paidAmount = roundMoney(paidAmount);
  const balanceAmount = roundMoney(Math.max(Number(totalAmount || 0) - paidAmount, 0));

  return {
    paidAmount,
    balanceAmount,
    paymentStatus:
      Number(totalAmount || 0) > 0 && balanceAmount <= 0
        ? 'PAID'
        : hasPendingInsurance
          ? 'PENDING_INSURANCE'
          : paidAmount > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID',
  };
}

@Injectable()
export class OtcSalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private saleInclude() {
    return {
      facility: { select: { id: true, code: true, name: true } },
      branch: { select: { id: true, code: true, name: true } },
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
      createdBy: {
        select: {
          id: true,
          staffCode: true,
          firstName: true,
          lastName: true,
          designation: true,
        },
      },
      items: {
        orderBy: { id: 'asc' as const },
        include: {
          medicine: {
            select: {
              id: true,
              code: true,
              name: true,
              dosageForm: true,
              strength: true,
            },
          },
        },
      },
      payments: {
        orderBy: { id: 'asc' as const },
        select: {
          id: true,
          paymentMethod: true,
          statusCode: true,
          amount: true,
          transactionRef: true,
          phoneNumber: true,
          mpesaReceiptNumber: true,
          merchantRequestId: true,
          checkoutRequestId: true,
          insuranceProviderName: true,
          insuranceSchemeName: true,
          insuranceMemberNumber: true,
          principalMemberName: true,
          relationshipToPrincipal: true,
          authorizationNumber: true,
          policyNumber: true,
          insuranceCoveredAmount: true,
          patientCoPayAmount: true,
          insuranceClaimReference: true,
          insuranceClaimStatus: true,
          paidAt: true,
          requestedAt: true,
          confirmedAt: true,
          notes: true,
        },
      },
    };
  }

  private receiptQrPayload(saleId: number) {
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    const path = `/print/otc-receipt/${saleId}`;
    return frontendUrl ? `${frontendUrl}${path}` : path;
  }

  private paymentDisplayMethod(payment: {
    paymentMethod: string;
    insuranceClaimStatus?: string | null;
  }) {
    if (payment.paymentMethod === 'INSURANCE') {
      return `INSURANCE${payment.insuranceClaimStatus ? ` (${payment.insuranceClaimStatus})` : ''}`;
    }
    return payment.paymentMethod.replace(/_/g, ' ');
  }

  private async resolveBranch(branchId: number | undefined, user: RequestUser) {
    const resolvedBranchId = branchId ?? user.homeBranchId ?? undefined;
    if (!resolvedBranchId) {
      throw new BadRequestException(
        'branchId is required for OTC sales when the user has no default branch.',
      );
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: resolvedBranchId },
      select: { id: true, facilityId: true, name: true, code: true },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with id ${resolvedBranchId} not found`);
    }

    this.scopeService.assertBranchAccess(user, branch.facilityId, branch.id);
    return branch;
  }

  private async getActiveStaff(user: RequestUser) {
    const staff = user.staffId
      ? await this.prisma.staff.findUnique({
          where: { id: user.staffId },
          select: { id: true, facilityId: true, branchId: true, isActive: true },
        })
      : await this.prisma.staff.findFirst({
          where: { userId: user.userId, isActive: true },
          select: { id: true, facilityId: true, branchId: true, isActive: true },
        });

    if (!staff?.isActive) {
      throw new BadRequestException(
        'Logged in user is not linked to an active staff profile.',
      );
    }

    return staff;
  }

  private assertMutableSale(sale: { status: string }) {
    if (FINAL_SALE_STATUSES.includes(sale.status.toUpperCase())) {
      throw new BadRequestException(`OTC sale is already ${sale.status}.`);
    }
  }

  private async getScopedSale(id: number, user: RequestUser) {
    const sale = await this.prisma.otcSale.findUnique({
      where: { id },
      include: this.saleInclude(),
    });

    if (!sale) {
      throw new NotFoundException(`OTC sale with id ${id} not found`);
    }

    this.scopeService.assertBranchAccess(user, sale.facilityId, sale.branchId);
    return sale;
  }

  private async assertPatientScope(patientId: number | undefined, facilityId: number) {
    if (!patientId) return;
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, facilityId: true },
    });
    if (!patient) throw new NotFoundException(`Patient with id ${patientId} not found`);
    if (patient.facilityId !== facilityId) {
      throw new BadRequestException('Selected patient does not belong to this facility.');
    }
  }

  private async createItemInTransaction(
    tx: Prisma.TransactionClient,
    sale: { id: number; facilityId: number; branchId: number },
    dto: OtcSaleItemInputDto,
  ) {
    const stock = await tx.branchMedicineStock.findFirst({
      where: {
        facilityId: sale.facilityId,
        branchId: sale.branchId,
        medicineId: dto.medicineId,
        isActive: true,
      },
      include: { medicine: true },
    });

    if (!stock) {
      throw new NotFoundException(
        `No active branch stock found for medicine ${dto.medicineId}`,
      );
    }

    if (stock.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${stock.medicine.name}. Available: ${stock.stockQuantity}, required: ${dto.quantity}`,
      );
    }

    const unitPrice = roundMoney(
      dto.unitPrice ?? stock.unitPrice ?? stock.medicine.unitPrice ?? 0,
    );
    const lineTotal = roundMoney(dto.quantity * unitPrice);

    return tx.otcSaleItem.create({
      data: {
        saleId: sale.id,
        medicineId: stock.medicineId,
        medicineNameSnapshot: stock.medicine.name,
        dosageFormSnapshot: stock.medicine.dosageForm,
        strengthSnapshot: stock.medicine.strength,
        quantity: dto.quantity,
        unitPrice,
        lineTotal,
        notes: dto.notes,
      },
    });
  }

  private async recalculateSaleTotals(tx: Prisma.TransactionClient, saleId: number) {
    const [sale, items, payments] = await Promise.all([
      tx.otcSale.findUnique({
        where: { id: saleId },
        select: {
          id: true,
          discountAmount: true,
          taxAmount: true,
          status: true,
        },
      }),
      tx.otcSaleItem.findMany({
        where: { saleId },
        select: { lineTotal: true },
      }),
      tx.otcSalePayment.findMany({
        where: { saleId },
        select: {
          paymentMethod: true,
          statusCode: true,
          amount: true,
          insuranceCoveredAmount: true,
          insuranceClaimStatus: true,
        },
      }),
    ]);

    if (!sale) throw new NotFoundException(`OTC sale with id ${saleId} not found`);

    const subtotal = roundMoney(
      items.reduce((total, item) => total + Number(item.lineTotal || 0), 0),
    );
    const totalAmount = roundMoney(
      Math.max(subtotal - Number(sale.discountAmount || 0) + Number(sale.taxAmount || 0), 0),
    );
    const paymentSummary = calculateOtcPaymentSummary(totalAmount, payments);
    const nextStatus =
      sale.status === 'DRAFT' && items.length > 0 ? 'PENDING_PAYMENT' : sale.status;

    return tx.otcSale.update({
      where: { id: saleId },
      data: {
        subtotal,
        totalAmount,
        paidAmount: paymentSummary.paidAmount,
        balanceAmount: paymentSummary.balanceAmount,
        paymentStatus: paymentSummary.paymentStatus,
        status: nextStatus,
      },
      include: this.saleInclude(),
    });
  }

  async searchMedicines(query: OtcMedicineSearchQueryDto, user: RequestUser) {
    const branch = await this.resolveBranch(query.branchId, user);
    const pagination = parsePagination(
      {
        page: query.page,
        pageSize: query.pageSize,
        search: query.query ?? query.search,
      },
      { defaultPageSize: 10, maxPageSize: 25 },
    );
    const search = pagination.search;

    const where: Prisma.BranchMedicineStockWhereInput = {
      facilityId: branch.facilityId,
      branchId: branch.id,
      isActive: true,
      medicine: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { code: { contains: search } },
                { dosageForm: { contains: search } },
                { strength: { contains: search } },
                { manufacturer: { contains: search } },
              ],
            }
          : {}),
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.branchMedicineStock.findMany({
        where,
        orderBy: [{ stockQuantity: 'desc' }, { id: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          stockQuantity: true,
          reorderLevel: true,
          unitPrice: true,
          medicine: {
            select: {
              id: true,
              code: true,
              name: true,
              dosageForm: true,
              strength: true,
              manufacturer: true,
              unitPrice: true,
            },
          },
        },
      }),
      this.prisma.branchMedicineStock.count({ where }),
    ]);

    return paginatedResponse(
      data.map((stock) => ({
        branchStockId: stock.id,
        medicineId: stock.medicine.id,
        code: stock.medicine.code,
        name: stock.medicine.name,
        dosageForm: stock.medicine.dosageForm,
        strength: stock.medicine.strength,
        manufacturer: stock.medicine.manufacturer,
        currentStock: stock.stockQuantity,
        reorderLevel: stock.reorderLevel,
        unitPrice: roundMoney(stock.unitPrice || stock.medicine.unitPrice || 0),
        stockStatus: stockStatus(stock.stockQuantity, stock.reorderLevel),
      })),
      { page: pagination.page, pageSize: pagination.pageSize, total },
    );
  }

  async createSale(dto: CreateOtcSaleDto, user: RequestUser) {
    const branch = await this.resolveBranch(dto.branchId, user);
    const staff = await this.getActiveStaff(user);
    this.scopeService.assertBranchAccess(user, branch.facilityId, branch.id);
    await this.assertPatientScope(dto.patientId, branch.facilityId);

    const sale = await this.prisma.$transaction(async (tx) => {
      let created = await tx.otcSale.create({
        data: {
          saleNumber: `OTC-TMP-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`,
          saleType: 'OTC',
          customerName: dto.customerName?.trim() || undefined,
          customerPhone: dto.customerPhone?.trim() || undefined,
          patientId: dto.patientId,
          facilityId: branch.facilityId,
          branchId: branch.id,
          createdByStaffId: staff.id,
          discountAmount: roundMoney(dto.discountAmount ?? 0),
          taxAmount: roundMoney(dto.taxAmount ?? 0),
          notes: dto.notes,
        },
      });

      created = await tx.otcSale.update({
        where: { id: created.id },
        data: {
          saleNumber: `OTC-${String(created.id).padStart(6, '0')}`,
        },
      });

      for (const item of dto.items ?? []) {
        await this.createItemInTransaction(tx, created, item);
      }

      return this.recalculateSaleTotals(tx, created.id);
    });

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_SALE_CREATED',
      entityType: 'OTC_SALE',
      entityId: String(sale.id),
      description: `OTC sale ${sale.saleNumber} created`,
      facilityId: sale.facilityId,
      branchId: sale.branchId,
      actorUserId: user.userId,
      actorStaffId: staff.id,
      afterData: JSON.stringify({
        saleNumber: sale.saleNumber,
        totalAmount: sale.totalAmount,
        itemCount: sale.items.length,
      }),
    });

    return sale;
  }

  async listSales(query: OtcSaleListQueryDto, user: RequestUser) {
    const pagination = parsePagination(query, {
      defaultPageSize: 25,
      maxPageSize: 100,
      allowedSortFields: ['createdAt', 'soldAt', 'totalAmount', 'saleNumber'],
      defaultSortBy: 'createdAt',
      defaultSortDirection: 'desc',
    });

    const where: Prisma.OtcSaleWhereInput = {
      ...this.scopeService.buildBranchScopeWhere(user),
    };

    if (query.branchId) {
      const branch = await this.resolveBranch(query.branchId, user);
      where.facilityId = branch.facilityId;
      where.branchId = branch.id;
    }
    if (query.status) where.status = query.status.toUpperCase();
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus.toUpperCase();
    if (pagination.search) {
      where.OR = [
        { saleNumber: { contains: pagination.search } },
        { customerName: { contains: pagination.search } },
        { customerPhone: { contains: pagination.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.otcSale.findMany({
        where,
        orderBy: { [pagination.sortBy]: pagination.sortDirection },
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          saleNumber: true,
          customerName: true,
          customerPhone: true,
          status: true,
          paymentStatus: true,
          subtotal: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          soldAt: true,
          createdAt: true,
          branch: { select: { id: true, code: true, name: true } },
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: { select: { items: true, payments: true } },
        },
      }),
      this.prisma.otcSale.count({ where }),
    ]);

    return paginatedResponse(data, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  getSale(id: number, user: RequestUser) {
    return this.getScopedSale(id, user);
  }

  async addItem(id: number, dto: OtcSaleItemInputDto, user: RequestUser) {
    const sale = await this.getScopedSale(id, user);
    this.assertMutableSale(sale);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.createItemInTransaction(tx, sale, dto);
      return this.recalculateSaleTotals(tx, id);
    });

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_SALE_ITEM_ADDED',
      entityType: 'OTC_SALE',
      entityId: String(id),
      description: `Item added to OTC sale ${sale.saleNumber}`,
      facilityId: sale.facilityId,
      branchId: sale.branchId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });

    return updated;
  }

  async updateItem(
    id: number,
    itemId: number,
    dto: UpdateOtcSaleItemDto,
    user: RequestUser,
  ) {
    const sale = await this.getScopedSale(id, user);
    this.assertMutableSale(sale);
    const existing = sale.items.find((item) => item.id === itemId);
    if (!existing) {
      throw new NotFoundException(`OTC sale item with id ${itemId} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const quantity = dto.quantity ?? existing.quantity;
      const stock = await tx.branchMedicineStock.findFirst({
        where: {
          facilityId: sale.facilityId,
          branchId: sale.branchId,
          medicineId: existing.medicineId,
          isActive: true,
        },
      });
      if (!stock) {
        throw new NotFoundException('Branch stock record no longer exists.');
      }
      if (stock.stockQuantity < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${stock.stockQuantity}, required: ${quantity}`,
        );
      }

      const unitPrice = roundMoney(dto.unitPrice ?? existing.unitPrice);
      await tx.otcSaleItem.update({
        where: { id: itemId },
        data: {
          quantity,
          unitPrice,
          lineTotal: roundMoney(quantity * unitPrice),
          notes: dto.notes,
        },
      });
      return this.recalculateSaleTotals(tx, id);
    });

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_SALE_ITEM_UPDATED',
      entityType: 'OTC_SALE',
      entityId: String(id),
      description: `Item ${itemId} updated on OTC sale ${sale.saleNumber}`,
      facilityId: sale.facilityId,
      branchId: sale.branchId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });

    return updated;
  }

  async removeItem(id: number, itemId: number, user: RequestUser) {
    const sale = await this.getScopedSale(id, user);
    this.assertMutableSale(sale);
    const existing = sale.items.find((item) => item.id === itemId);
    if (!existing) {
      throw new NotFoundException(`OTC sale item with id ${itemId} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.otcSaleItem.delete({ where: { id: itemId } });
      return this.recalculateSaleTotals(tx, id);
    });

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_SALE_ITEM_REMOVED',
      entityType: 'OTC_SALE',
      entityId: String(id),
      description: `Item ${itemId} removed from OTC sale ${sale.saleNumber}`,
      facilityId: sale.facilityId,
      branchId: sale.branchId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });

    return updated;
  }

  private validatePaymentInput(
    sale: { totalAmount: number },
    input: OtcSalePaymentInputDto,
  ) {
    const method = input.paymentMethod;
    if (method === 'INSURANCE') {
      if (!input.insuranceProviderName?.trim()) {
        throw new BadRequestException('Insurance provider is required.');
      }
      if (!input.insuranceMemberNumber?.trim()) {
        throw new BadRequestException('Insurance member number is required.');
      }
      const claimStatus = input.insuranceClaimStatus ?? 'DRAFT';
      if (!INSURANCE_CLAIM_STATUSES.includes(claimStatus)) {
        throw new BadRequestException('Unsupported insurance claim status.');
      }
      const covered = Number(input.insuranceCoveredAmount ?? input.amount ?? 0);
      if (covered < 0 || covered > Number(sale.totalAmount || 0)) {
        throw new BadRequestException(
          'Insurance covered amount must be between 0 and the sale total.',
        );
      }
      if (
        ['APPROVED', 'PARTIALLY_APPROVED', 'PAID'].includes(claimStatus) &&
        !input.insuranceClaimReference?.trim() &&
        !input.authorizationNumber?.trim()
      ) {
        throw new BadRequestException(
          'Approved insurance payments require a claim reference or authorization number.',
        );
      }
      return;
    }

    if (Number(input.amount || 0) <= 0) {
      throw new BadRequestException(`${method} payment amount must be greater than 0.`);
    }

    if (
      ['MPESA_MANUAL', 'CARD', 'BANK'].includes(method) &&
      !input.transactionRef?.trim() &&
      !input.mpesaReceiptNumber?.trim()
    ) {
      throw new BadRequestException(`${method} payment requires a reference.`);
    }
  }

  async recordPayment(id: number, dto: RecordOtcSalePaymentDto, user: RequestUser) {
    const sale = await this.getScopedSale(id, user);
    this.assertMutableSale(sale);
    if (!sale.items.length) {
      throw new BadRequestException('Add at least one item before recording payment.');
    }
    if (!dto.payments?.length) {
      throw new BadRequestException('At least one payment entry is required.');
    }
    const staff = await this.getActiveStaff(user);

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const input of dto.payments) {
        this.validatePaymentInput(sale, input);
        const isInsurance = input.paymentMethod === 'INSURANCE';
        const claimStatus = input.insuranceClaimStatus ?? (isInsurance ? 'DRAFT' : undefined);
        const coveredAmount = isInsurance
          ? roundMoney(input.insuranceCoveredAmount ?? input.amount ?? 0)
          : 0;
        const patientCoPayAmount = isInsurance
          ? roundMoney(
              input.patientCoPayAmount ??
                Math.max(Number(sale.totalAmount || 0) - coveredAmount, 0),
            )
          : 0;
        const statusCode =
          input.paymentMethod === 'MPESA_STK'
            ? 'PENDING'
            : isInsurance && ['DRAFT', 'PENDING_APPROVAL'].includes(claimStatus!)
              ? 'PENDING'
              : 'COMPLETED';

        await tx.otcSalePayment.create({
          data: {
            saleId: sale.id,
            facilityId: sale.facilityId,
            branchId: sale.branchId,
            paymentMethod: input.paymentMethod,
            statusCode,
            amount: isInsurance ? coveredAmount : roundMoney(input.amount ?? 0),
            transactionRef: input.transactionRef?.trim() || undefined,
            phoneNumber: input.phoneNumber?.trim() || undefined,
            mpesaReceiptNumber: input.mpesaReceiptNumber?.trim() || undefined,
            merchantRequestId: input.merchantRequestId?.trim() || undefined,
            checkoutRequestId: input.checkoutRequestId?.trim() || undefined,
            insuranceProviderName: input.insuranceProviderName?.trim() || undefined,
            insuranceSchemeName: input.insuranceSchemeName?.trim() || undefined,
            insuranceMemberNumber: input.insuranceMemberNumber?.trim() || undefined,
            principalMemberName: input.principalMemberName?.trim() || undefined,
            relationshipToPrincipal:
              input.relationshipToPrincipal?.trim() || undefined,
            authorizationNumber: input.authorizationNumber?.trim() || undefined,
            policyNumber: input.policyNumber?.trim() || undefined,
            insuranceCoveredAmount: coveredAmount,
            patientCoPayAmount,
            insuranceClaimReference:
              input.insuranceClaimReference?.trim() || undefined,
            insuranceClaimStatus: claimStatus,
            paidAt: statusCode === 'COMPLETED' ? new Date() : undefined,
            confirmedAt: statusCode === 'COMPLETED' ? new Date() : undefined,
            receivedByStaffId: staff.id,
            notes: input.notes,
          },
        });
      }

      return this.recalculateSaleTotals(tx, sale.id);
    });

    const hasInsurance = dto.payments.some(
      (payment) => payment.paymentMethod === 'INSURANCE',
    );
    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: hasInsurance ? 'OTC_INSURANCE_PAYMENT_RECORDED' : 'OTC_PAYMENT_RECORDED',
      entityType: 'OTC_SALE',
      entityId: String(id),
      description: `Payment recorded for OTC sale ${sale.saleNumber}`,
      facilityId: sale.facilityId,
      branchId: sale.branchId,
      actorUserId: user.userId,
      actorStaffId: staff.id,
      afterData: JSON.stringify({
        paymentMethods: dto.payments.map((payment) => payment.paymentMethod),
        insuranceClaimStatuses: dto.payments
          .map((payment) => payment.insuranceClaimStatus)
          .filter(Boolean),
        totalAmount: updated.totalAmount,
        paidAmount: updated.paidAmount,
        balanceAmount: updated.balanceAmount,
        paymentStatus: updated.paymentStatus,
      }),
    });

    return updated;
  }

  async completeSale(id: number, user: RequestUser) {
    const sale = await this.getScopedSale(id, user);
    this.assertMutableSale(sale);
    if (!sale.items.length) {
      throw new BadRequestException('Cannot complete an OTC sale without items.');
    }
    if (sale.paymentStatus !== 'PAID') {
      throw new BadRequestException(
        sale.paymentStatus === 'PENDING_INSURANCE'
          ? 'Insurance is still pending. Stock is not deducted until approved coverage and patient payment fully cover the sale.'
          : 'OTC sale must be fully paid before stock is deducted.',
      );
    }
    const staff = await this.getActiveStaff(user);

    const completed = await this.prisma.$transaction(async (tx) => {
      const current = await tx.otcSale.findUnique({
        where: { id },
        include: { items: true, payments: true },
      });
      if (!current) throw new NotFoundException(`OTC sale with id ${id} not found`);
      if (FINAL_SALE_STATUSES.includes(current.status.toUpperCase())) {
        throw new BadRequestException(`OTC sale is already ${current.status}.`);
      }
      const totals = calculateOtcPaymentSummary(current.totalAmount, current.payments);
      if (totals.paymentStatus !== 'PAID') {
        throw new BadRequestException('OTC sale must be fully paid before completion.');
      }

      for (const item of current.items) {
        const stockUpdate = await tx.branchMedicineStock.updateMany({
          where: {
            facilityId: current.facilityId,
            branchId: current.branchId,
            medicineId: item.medicineId,
            isActive: true,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock for ${item.medicineNameSnapshot}. The sale was not completed.`,
          );
        }

        const updatedStock = await tx.branchMedicineStock.findFirstOrThrow({
          where: {
            facilityId: current.facilityId,
            branchId: current.branchId,
            medicineId: item.medicineId,
            isActive: true,
          },
        });
        const stockAfter = updatedStock.stockQuantity;
        const stockBefore = stockAfter + item.quantity;

        await tx.otcSaleItem.update({
          where: { id: item.id },
          data: { stockBefore, stockAfter },
        });

        await tx.pharmacyStockMovement.create({
          data: {
            facilityId: current.facilityId,
            branchId: current.branchId,
            medicineId: item.medicineId,
            branchStockId: updatedStock.id,
            sourceType: 'OTC_SALE',
            sourceEntityId: String(current.id),
            movementType: 'OUT',
            quantity: item.quantity,
            stockBefore,
            stockAfter,
            otcSaleId: current.id,
            otcSaleItemId: item.id,
            performedByStaffId: staff.id,
            notes: `OTC sale ${current.saleNumber}`,
          },
        });
      }

      await tx.otcSale.update({
        where: { id: current.id },
        data: {
          status: 'PAID',
          paymentStatus: 'PAID',
          soldAt: new Date(),
          paidAmount: totals.paidAmount,
          balanceAmount: totals.balanceAmount,
        },
      });

      return tx.otcSale.findUniqueOrThrow({
        where: { id },
        include: this.saleInclude(),
      });
    });

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_SALE_COMPLETED',
      entityType: 'OTC_SALE',
      entityId: String(id),
      description: `OTC sale ${sale.saleNumber} completed and stock deducted`,
      facilityId: completed.facilityId,
      branchId: completed.branchId,
      actorUserId: user.userId,
      actorStaffId: staff.id,
      afterData: JSON.stringify({
        saleNumber: completed.saleNumber,
        totalAmount: completed.totalAmount,
        paidAmount: completed.paidAmount,
        itemCount: completed.items.length,
      }),
    });

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_STOCK_DEDUCTED',
      entityType: 'OTC_SALE',
      entityId: String(id),
      description: `Stock deducted for OTC sale ${sale.saleNumber}`,
      facilityId: completed.facilityId,
      branchId: completed.branchId,
      actorUserId: user.userId,
      actorStaffId: staff.id,
    });

    return completed;
  }

  async getReceiptPdf(id: number, user: RequestUser) {
    const sale = await this.prisma.otcSale.findUnique({
      where: { id },
      select: {
        id: true,
        saleNumber: true,
        customerName: true,
        customerPhone: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        soldAt: true,
        notes: true,
        createdAt: true,
        facilityId: true,
        branchId: true,
        facility: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            logoUrl: true,
            currency: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            phone: true,
            email: true,
            currency: true,
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
        items: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            saleId: true,
            medicineId: true,
            medicineNameSnapshot: true,
            dosageFormSnapshot: true,
            strengthSnapshot: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            stockBefore: true,
            stockAfter: true,
            notes: true,
            medicine: {
              select: {
                id: true,
                code: true,
                name: true,
                dosageForm: true,
                strength: true,
              },
            },
          },
        },
        payments: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            paymentMethod: true,
            statusCode: true,
            amount: true,
            transactionRef: true,
            phoneNumber: true,
            mpesaReceiptNumber: true,
            merchantRequestId: true,
            checkoutRequestId: true,
            insuranceProviderName: true,
            insuranceSchemeName: true,
            insuranceMemberNumber: true,
            principalMemberName: true,
            relationshipToPrincipal: true,
            authorizationNumber: true,
            policyNumber: true,
            insuranceCoveredAmount: true,
            patientCoPayAmount: true,
            insuranceClaimReference: true,
            insuranceClaimStatus: true,
            paidAt: true,
            requestedAt: true,
            confirmedAt: true,
            notes: true,
            receivedBy: {
              select: {
                id: true,
                staffCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`OTC sale with id ${id} not found`);
    }

    this.scopeService.assertBranchAccess(user, sale.facilityId, sale.branchId);

    const currency = sale.facility?.currency || sale.branch?.currency || 'KES';
    const customer =
      sale.patient ? patientName(sale.patient) : sale.customerName || 'Walk-in customer';
    const customerReference =
      sale.patient?.patientNumber || maskValue(sale.customerPhone, 3, 3) || '-';
    const paymentMethods = Array.from(
      new Set(sale.payments.map((payment) => payment.paymentMethod)),
    );
    const receiptNumber = `OTC-RCPT-${String(sale.id).padStart(6, '0')}`;
    const paymentLabel =
      paymentMethods.length > 1
        ? `MIXED (${paymentMethods.map((x) => x.replace(/_/g, ' ')).join(' + ')})`
        : paymentMethods[0]?.replace(/_/g, ' ') || sale.paymentStatus;

    const buffer = await createHospitalPdfBuffer(
      {
        title: 'OTC Drug Sale Receipt',
        subtitle: receiptNumber,
        reference: sale.saleNumber,
        verificationCode: receiptNumber,
        facility: sale.facility,
        branch: sale.branch,
        compact: true,
        qrPayload: this.receiptQrPayload(sale.id),
      },
      (doc) => {
        addSectionTitle(doc, 'Sale and customer');
        addMiniKeyValueGrid(
          doc,
          [
            { label: 'Receipt No.', value: receiptNumber },
            { label: 'Sale No.', value: sale.saleNumber },
            { label: 'Status', value: sale.status },
            { label: 'Payment', value: sale.paymentStatus },
            { label: 'Customer', value: customer },
            { label: 'Customer Ref.', value: customerReference },
            { label: 'Served By', value: staffName(sale.createdBy) },
            { label: 'Sold At', value: sale.soldAt || sale.createdAt },
          ],
          4,
        );

        addSectionTitle(doc, 'Items');
        addCompactTable(
          doc,
          [
            { header: '#', width: 24, render: (_item, index) => index + 1 },
            {
              header: 'Medicine',
              width: 180,
              render: (item) => item.medicineNameSnapshot,
            },
            {
              header: 'Form',
              width: 80,
              render: (item) => item.dosageFormSnapshot,
            },
            {
              header: 'Strength',
              width: 80,
              render: (item) => item.strengthSnapshot,
            },
            { header: 'Qty', width: 45, render: (item) => item.quantity },
            {
              header: 'Unit',
              width: 65,
              render: (item) => formatPdfMoney(item.unitPrice, currency),
            },
            {
              header: 'Total',
              width: 70,
              render: (item) => formatPdfMoney(item.lineTotal, currency),
            },
          ],
          sale.items,
          'No OTC sale items recorded.',
        );

        addSectionTitle(doc, 'Totals');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Subtotal', value: formatPdfMoney(sale.subtotal, currency) },
            {
              label: 'Discount',
              value: formatPdfMoney(sale.discountAmount, currency),
            },
            { label: 'Tax', value: formatPdfMoney(sale.taxAmount, currency) },
            { label: 'Total', value: formatPdfMoney(sale.totalAmount, currency) },
            { label: 'Paid', value: formatPdfMoney(sale.paidAmount, currency) },
            {
              label: 'Balance',
              value: formatPdfMoney(sale.balanceAmount, currency),
            },
          ],
          3,
        );

        addSectionTitle(doc, 'Payments');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Method', value: paymentLabel },
            { label: 'Payment Status', value: sale.paymentStatus },
            {
              label: 'Generated',
              value: formatPdfDate(new Date()),
            },
            {
              label: 'Exact receipt route',
              value: this.receiptQrPayload(sale.id),
            },
          ],
          2,
        );

        addCompactTable(
          doc,
          [
            {
              header: 'Method',
              width: 95,
              render: (payment) => this.paymentDisplayMethod(payment),
            },
            {
              header: 'Reference',
              width: 110,
              render: (payment) =>
                payment.mpesaReceiptNumber ||
                payment.transactionRef ||
                payment.checkoutRequestId ||
                payment.insuranceClaimReference ||
                payment.authorizationNumber,
            },
            {
              header: 'Amount',
              width: 75,
              render: (payment) => formatPdfMoney(payment.amount, currency),
            },
            {
              header: 'Insurance',
              width: 110,
              render: (payment) =>
                payment.paymentMethod === 'INSURANCE'
                  ? [
                      payment.insuranceProviderName,
                      payment.insuranceSchemeName,
                      maskValue(payment.insuranceMemberNumber, 2, 3),
                    ]
                      .filter(Boolean)
                      .join(' / ')
                  : maskValue(payment.phoneNumber, 3, 3),
            },
            {
              header: 'Claim/Co-pay',
              width: 85,
              render: (payment) =>
                payment.paymentMethod === 'INSURANCE'
                  ? `Covered ${formatPdfMoney(
                      payment.insuranceCoveredAmount,
                      currency,
                    )}; Co-pay ${formatPdfMoney(
                      payment.patientCoPayAmount,
                      currency,
                    )}`
                  : payment.statusCode,
            },
            {
              header: 'Confirmed',
              width: 69,
              render: (payment) =>
                payment.confirmedAt || payment.paidAt || payment.requestedAt,
            },
          ],
          sale.payments,
          'No payment lines recorded.',
        );

        if (sale.notes) {
          addCompactParagraph(doc, 'Notes', sale.notes);
        }
      },
    );

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_RECEIPT_PDF_DOWNLOADED',
      entityType: 'OTC_SALE',
      entityId: String(sale.id),
      description: `OTC receipt ${receiptNumber} downloaded for sale ${sale.saleNumber}`,
      facilityId: sale.facilityId,
      branchId: sale.branchId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
      afterData: JSON.stringify({
        saleNumber: sale.saleNumber,
        receiptNumber,
        paymentStatus: sale.paymentStatus,
      }),
    });

    return {
      buffer,
      fileName: `${safeReceiptFileName(`otc-receipt-${sale.saleNumber}`)}.pdf`,
    };
  }

  async cancelSale(id: number, user: RequestUser) {
    const sale = await this.getScopedSale(id, user);
    if (sale.status === 'PAID') {
      throw new BadRequestException(
        'Paid OTC sales require a future refund workflow and cannot be cancelled directly.',
      );
    }
    if (sale.status === 'CANCELLED') return sale;

    const updated = await this.prisma.otcSale.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: this.saleInclude(),
    });

    await this.auditLogService.create({
      moduleName: 'PHARMACY',
      actionName: 'OTC_SALE_CANCELLED',
      entityType: 'OTC_SALE',
      entityId: String(id),
      description: `OTC sale ${sale.saleNumber} cancelled`,
      facilityId: sale.facilityId,
      branchId: sale.branchId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    });

    return updated;
  }
}
