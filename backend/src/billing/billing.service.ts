import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { RemoveInvoiceItemDto } from './dto/remove-invoice-item.dto';
import { CreateServiceTariffDto } from './dto/create-service-tariff.dto';
import { UpdateServiceTariffDto } from './dto/update-service-tariff.dto';

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

      if (dto.facilityId && ward.facilityId && ward.facilityId !== dto.facilityId) {
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

      if (dto.facilityId && bed.facilityId && bed.facilityId !== dto.facilityId) {
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
      },
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
    });

    if (!item) {
      throw new NotFoundException(`Invoice item with id ${id} not found`);
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
    const where: any = {};

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
        if (
          params.code &&
          tariff.code === params.code.trim().toUpperCase()
        ) {
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

    let appointment: any = null;
    if (dto.appointmentId) {
      appointment = await this.appointmentService.findOne(dto.appointmentId);
    }

    let consultation: any = null;
    if (dto.consultationId) {
      consultation = await this.consultationService.findOne(dto.consultationId);
    }

    let admission: any = null;
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

    let createdByStaff: any = null;
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
          orderBy: { id: 'asc' },
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
