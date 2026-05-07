import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { UpdatePrescriptionItemDto } from './dto/update-prescription-item.dto';

function getStockStatus(
  stockQuantity?: number | null,
  reorderLevel?: number | null,
) {
  const quantity = Number(stockQuantity ?? 0);
  const reorder = Number(reorderLevel ?? 0);

  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (reorder > 0 && quantity <= reorder) return 'LOW_STOCK';
  return 'IN_STOCK';
}

@Injectable()
export class PrescriptionItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private async getPrescriptionForWrite(
    prescriptionId: number,
    user?: RequestUser,
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        consultation: true,
        patient: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException(
        `Prescription with id ${prescriptionId} not found`,
      );
    }

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        prescription.facilityId,
        prescription.branchId,
      );
    }

    if (
      ['DISPENSED', 'CANCELLED'].includes(
        (prescription.statusCode || '').toUpperCase(),
      )
    ) {
      throw new BadRequestException(
        `Prescription is already ${prescription.statusCode}.`,
      );
    }

    return prescription;
  }

  private async recordPrescriptionItemAudit(params: {
    actionName: string;
    prescription: { id: number; facilityId: number; branchId?: number | null };
    user?: RequestUser;
    beforeData?: unknown;
    afterData?: unknown;
    description?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          moduleName: 'PRESCRIPTION',
          actionName: params.actionName,
          entityType: 'PRESCRIPTION',
          entityId: String(params.prescription.id),
          facilityId: params.prescription.facilityId,
          branchId: params.prescription.branchId ?? undefined,
          actorUserId: params.user?.userId,
          actorStaffId: params.user?.staffId ?? undefined,
          description: params.description,
          beforeData: params.beforeData
            ? JSON.stringify(params.beforeData)
            : undefined,
          afterData: params.afterData
            ? JSON.stringify(params.afterData)
            : undefined,
        },
      });
    } catch {
      // Prescription editing must not fail because audit storage is temporarily unavailable.
    }
  }

  async create(dto: CreatePrescriptionItemDto, user?: RequestUser) {
    const prescription = await this.getPrescriptionForWrite(
      dto.prescriptionId,
      user,
    );
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });

    if (!medicine) {
      throw new NotFoundException(
        `Medicine with id ${dto.medicineId} not found`,
      );
    }

    let selectedStock:
      | { stockQuantity: number; reorderLevel: number }
      | null
      | undefined = null;

    if (prescription.branchId) {
      selectedStock = await this.prisma.branchMedicineStock.findUnique({
        where: {
          branchId_medicineId: {
            branchId: prescription.branchId,
            medicineId: medicine.id,
          },
        },
        select: {
          stockQuantity: true,
          reorderLevel: true,
        },
      });
    }

    if (dto.acceptedAlternativeForMedicineId) {
      const original = await this.prisma.medicine.findUnique({
        where: { id: dto.acceptedAlternativeForMedicineId },
        select: { id: true },
      });

      if (!original) {
        throw new NotFoundException(
          `Original medicine with id ${dto.acceptedAlternativeForMedicineId} not found`,
        );
      }
    }

    const stockStatus =
      dto.stockStatusAtPrescribing ??
      getStockStatus(selectedStock?.stockQuantity, selectedStock?.reorderLevel);

    const created = await this.prisma.prescriptionItem.create({
      data: {
        prescriptionId: dto.prescriptionId,
        medicineId: dto.medicineId,
        dosage: dto.dosage,
        route: dto.route,
        frequency: dto.frequency,
        duration: dto.duration,
        quantity: dto.quantity ?? 1,
        instructions: dto.instructions,
        medicineNameSnapshot: medicine.name,
        stockStatusAtPrescribing: stockStatus,
        acceptedAlternativeForMedicineId: dto.acceptedAlternativeForMedicineId,
        statusCode: dto.statusCode ?? 'PRESCRIBED',
      },
      include: {
        prescription: true,
        medicine: true,
      },
    });

    await this.recordPrescriptionItemAudit({
      actionName: dto.acceptedAlternativeForMedicineId
        ? 'PRESCRIPTION_ALTERNATIVE_ACCEPTED'
        : 'PRESCRIPTION_ITEM_CREATED',
      prescription,
      user,
      afterData: {
        prescriptionItemId: created.id,
        medicineId: created.medicineId,
        medicineName: created.medicineNameSnapshot ?? medicine.name,
        dosage: created.dosage,
        route: created.route,
        frequency: created.frequency,
        duration: created.duration,
        quantity: created.quantity,
        stockStatusAtPrescribing: created.stockStatusAtPrescribing,
        acceptedAlternativeForMedicineId:
          created.acceptedAlternativeForMedicineId,
      },
      description: dto.acceptedAlternativeForMedicineId
        ? `Clinician accepted an in-stock alternative for prescription ${prescription.id}.`
        : `Clinician added ${medicine.name} to prescription ${prescription.id}.`,
    });

    return created;
  }

  async findOne(id: number) {
    const item = await this.prisma.prescriptionItem.findUnique({
      where: { id },
      include: {
        prescription: {
          include: {
            facility: true,
            branch: true,
            patient: true,
            consultation: true,
            prescribedBy: true,
          },
        },
        medicine: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Prescription item with id ${id} not found`);
    }

    return item;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const item = await this.findOne(id);

    this.scopeService.assertBranchAccess(
      user,
      item.prescription.facilityId,
      item.prescription.branchId,
    );

    return item;
  }

  async findByPrescriptionIdScoped(prescriptionId: number, user: RequestUser) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException(
        `Prescription with id ${prescriptionId} not found`,
      );
    }

    this.scopeService.assertBranchAccess(
      user,
      prescription.facilityId,
      prescription.branchId,
    );

    return this.prisma.prescriptionItem.findMany({
      where: { prescriptionId },
      include: {
        prescription: true,
        medicine: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async update(id: number, dto: UpdatePrescriptionItemDto, user?: RequestUser) {
    const existing = await this.findOne(id);

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        existing.prescription.facilityId,
        existing.prescription.branchId,
      );
    }

    if (dto.prescriptionId) {
      throw new BadRequestException('Prescription cannot be changed');
    }

    let medicineNameSnapshot: string | undefined;
    if (dto.medicineId) {
      const medicine = await this.prisma.medicine.findUnique({
        where: { id: dto.medicineId },
      });

      if (!medicine) {
        throw new NotFoundException(
          `Medicine with id ${dto.medicineId} not found`,
        );
      }

      medicineNameSnapshot = medicine.name;
    }

    const updated = await this.prisma.prescriptionItem.update({
      where: { id },
      data: {
        medicineId: dto.medicineId,
        medicineNameSnapshot,
        dosage: dto.dosage,
        route: dto.route,
        frequency: dto.frequency,
        duration: dto.duration,
        quantity: dto.quantity,
        instructions: dto.instructions,
        stockStatusAtPrescribing: dto.stockStatusAtPrescribing,
        acceptedAlternativeForMedicineId: dto.acceptedAlternativeForMedicineId,
        statusCode: dto.statusCode,
      },
      include: {
        prescription: true,
        medicine: true,
      },
    });

    await this.recordPrescriptionItemAudit({
      actionName: 'PRESCRIPTION_ITEM_UPDATED',
      prescription: existing.prescription,
      user,
      beforeData: {
        medicineId: existing.medicineId,
        dosage: existing.dosage,
        route: existing.route,
        frequency: existing.frequency,
        duration: existing.duration,
        quantity: existing.quantity,
        instructions: existing.instructions,
        statusCode: existing.statusCode,
      },
      afterData: {
        medicineId: updated.medicineId,
        dosage: updated.dosage,
        route: updated.route,
        frequency: updated.frequency,
        duration: updated.duration,
        quantity: updated.quantity,
        instructions: updated.instructions,
        statusCode: updated.statusCode,
      },
    });

    return updated;
  }

  async remove(id: number, user?: RequestUser) {
    const existing = await this.findOne(id);

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        existing.prescription.facilityId,
        existing.prescription.branchId,
      );
    }

    await this.recordPrescriptionItemAudit({
      actionName: 'PRESCRIPTION_ITEM_DELETED',
      prescription: existing.prescription,
      user,
      beforeData: {
        id: existing.id,
        medicineId: existing.medicineId,
        medicineName: existing.medicine?.name,
        dosage: existing.dosage,
        route: existing.route,
        quantity: existing.quantity,
      },
    });

    return this.prisma.prescriptionItem.delete({
      where: { id },
    });
  }
}
