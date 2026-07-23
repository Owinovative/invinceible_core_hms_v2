import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ScopeService } from '../auth/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineReturnDto } from './dto/create-medicine-return.dto';
import { CreatePharmacyLocationDto } from './dto/create-pharmacy-location.dto';
import { ReceiveMedicineBatchDto } from './dto/receive-medicine-batch.dto';
import { ReviewMedicineReturnDto } from './dto/review-medicine-return.dto';

const RESTOCKABLE_CONDITIONS = new Set(['SEALED', 'UNOPENED', 'GOOD']);

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && Number(value) > 0
    ? Number(value)
    : fallback;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRows(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

@Injectable()
export class PharmacyInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private async getLocation(id: number, user: RequestUser) {
    const location = await this.prisma.pharmacyLocation.findUnique({
      where: { id },
      include: { facility: true, branch: true },
    });
    if (!location) {
      throw new NotFoundException(`Pharmacy location with id ${id} not found`);
    }
    this.scope.assertBranchAccess(user, location.facilityId, location.branchId);
    return location;
  }

  async listLocations(user: RequestUser) {
    return this.prisma.pharmacyLocation.findMany({
      where: {
        ...this.scope.buildBranchScopeWhere(user),
        isActive: true,
      },
      include: {
        branch: true,
        _count: { select: { stocks: true, batches: true } },
      },
      orderBy: [{ branchId: 'asc' }, { name: 'asc' }],
    });
  }

  async listBatches(user: RequestUser) {
    return this.prisma.medicineBatch.findMany({
      where: {
        ...this.scope.buildBranchScopeWhere(user),
        statusCode: 'ACTIVE',
        expiresAt: { gt: new Date() },
        quantityAvailable: { gt: 0 },
      },
      include: { medicine: true, pharmacyLocation: true },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: 1000,
    });
  }

  async listMovements(
    user: RequestUser,
    filters: {
      medicineId?: number;
      pharmacyLocationId?: number;
      movementType?: string;
    } = {},
  ) {
    return this.prisma.pharmacyStockMovement.findMany({
      where: {
        ...this.scope.buildBranchScopeWhere(user),
        medicineId: filters.medicineId,
        pharmacyLocationId: filters.pharmacyLocationId,
        movementType: filters.movementType?.trim().toUpperCase() || undefined,
      },
      include: {
        medicine: true,
        pharmacyLocation: true,
        medicineBatch: true,
        performedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  }

  async exportMovements(user: RequestUser) {
    const movements = await this.prisma.pharmacyStockMovement.findMany({
      where: this.scope.buildBranchScopeWhere(user),
      include: {
        facility: true,
        branch: true,
        medicine: true,
        pharmacyLocation: true,
        medicineBatch: true,
        performedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25000,
    });
    const rows: unknown[][] = [
      [
        'date',
        'facility',
        'branch',
        'pharmacyLocation',
        'medicineCode',
        'medicine',
        'batchNumber',
        'movementType',
        'sourceType',
        'sourceEntityId',
        'quantity',
        'stockBefore',
        'stockAfter',
        'performedBy',
        'notes',
      ],
      ...movements.map((movement) => [
        movement.createdAt.toISOString(),
        movement.facility.name,
        movement.branch.name,
        movement.pharmacyLocation?.name ?? 'Unallocated legacy movement',
        movement.medicine.code,
        movement.medicine.name,
        movement.medicineBatch?.batchNumber ?? '',
        movement.movementType,
        movement.sourceType,
        movement.sourceEntityId,
        movement.quantity,
        movement.stockBefore,
        movement.stockAfter,
        movement.performedBy
          ? `${movement.performedBy.firstName} ${movement.performedBy.lastName}`
          : 'System',
        movement.notes,
      ]),
    ];
    return {
      fileName: `drug-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      rowCount: movements.length,
      truncated: movements.length === 25000,
      csvText: csvRows(rows),
    };
  }

  async createLocation(dto: CreatePharmacyLocationDto, user: RequestUser) {
    this.scope.assertBranchAccess(user, dto.facilityId, dto.branchId);
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      select: { facilityId: true },
    });
    if (!branch || branch.facilityId !== dto.facilityId) {
      throw new BadRequestException(
        'Selected branch does not belong to the selected facility',
      );
    }

    try {
      return await this.prisma.pharmacyLocation.create({
        data: {
          facilityId: dto.facilityId,
          branchId: dto.branchId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          locationType: dto.locationType?.trim().toUpperCase() || 'MAIN',
          isDispensingLocation: dto.isDispensingLocation ?? true,
        },
        include: { branch: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A pharmacy location with this code already exists in the branch',
        );
      }
      throw error;
    }
  }

  async receiveBatch(dto: ReceiveMedicineBatchDto, user: RequestUser) {
    const location = await this.getLocation(dto.pharmacyLocationId, user);
    if (!location.isActive) {
      throw new BadRequestException('The pharmacy location is inactive');
    }

    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= new Date()) {
      throw new BadRequestException(
        'Expired stock cannot be received into available inventory',
      );
    }
    const manufacturedAt = dto.manufacturedAt
      ? new Date(dto.manufacturedAt)
      : undefined;
    if (manufacturedAt && manufacturedAt >= expiresAt) {
      throw new BadRequestException(
        'Manufacturing date must be before the expiry date',
      );
    }

    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });
    if (!medicine?.isActive) {
      throw new NotFoundException('Active medicine was not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const branchStock = await tx.branchMedicineStock.upsert({
        where: {
          branchId_medicineId: {
            branchId: location.branchId,
            medicineId: dto.medicineId,
          },
        },
        create: {
          facilityId: location.facilityId,
          branchId: location.branchId,
          medicineId: dto.medicineId,
          stockQuantity: dto.quantity,
          reorderLevel: dto.reorderLevel ?? medicine.reorderLevel,
          buyingPrice: dto.unitCost ?? 0,
          unitPrice: medicine.unitPrice ?? 0,
        },
        update: {
          stockQuantity: { increment: dto.quantity },
          ...(dto.reorderLevel !== undefined
            ? { reorderLevel: dto.reorderLevel }
            : {}),
          ...(dto.unitCost !== undefined ? { buyingPrice: dto.unitCost } : {}),
        },
      });

      const locationStock = await tx.pharmacyLocationStock.upsert({
        where: {
          pharmacyLocationId_medicineId: {
            pharmacyLocationId: location.id,
            medicineId: dto.medicineId,
          },
        },
        create: {
          facilityId: location.facilityId,
          branchId: location.branchId,
          pharmacyLocationId: location.id,
          medicineId: dto.medicineId,
          branchStockId: branchStock.id,
          stockQuantity: dto.quantity,
          reorderLevel: dto.reorderLevel ?? medicine.reorderLevel,
        },
        update: {
          stockQuantity: { increment: dto.quantity },
          branchStockId: branchStock.id,
          ...(dto.reorderLevel !== undefined
            ? { reorderLevel: dto.reorderLevel }
            : {}),
        },
      });

      const batch = await tx.medicineBatch.upsert({
        where: {
          pharmacyLocationId_medicineId_batchNumber: {
            pharmacyLocationId: location.id,
            medicineId: dto.medicineId,
            batchNumber: dto.batchNumber.trim().toUpperCase(),
          },
        },
        create: {
          facilityId: location.facilityId,
          branchId: location.branchId,
          pharmacyLocationId: location.id,
          medicineId: dto.medicineId,
          branchStockId: branchStock.id,
          batchNumber: dto.batchNumber.trim().toUpperCase(),
          supplierName: dto.supplierName?.trim(),
          manufacturerName: dto.manufacturerName?.trim(),
          manufacturedAt,
          expiresAt,
          quantityReceived: dto.quantity,
          quantityAvailable: dto.quantity,
          unitCost: dto.unitCost ?? 0,
        },
        update: {
          quantityReceived: { increment: dto.quantity },
          quantityAvailable: { increment: dto.quantity },
          expiresAt,
          supplierName: dto.supplierName?.trim(),
          manufacturerName: dto.manufacturerName?.trim(),
          manufacturedAt,
          unitCost: dto.unitCost ?? 0,
          statusCode: 'ACTIVE',
        },
      });

      await tx.pharmacyStockMovement.create({
        data: {
          facilityId: location.facilityId,
          branchId: location.branchId,
          pharmacyLocationId: location.id,
          medicineId: dto.medicineId,
          medicineBatchId: batch.id,
          branchStockId: branchStock.id,
          sourceType: 'BATCH_RECEIPT',
          sourceEntityId: String(batch.id),
          movementType: 'IN',
          quantity: dto.quantity,
          stockBefore: branchStock.stockQuantity - dto.quantity,
          stockAfter: branchStock.stockQuantity,
          performedByStaffId: user.staffId ?? undefined,
          notes: dto.notes?.trim() || `Batch ${batch.batchNumber} received`,
        },
      });

      return {
        batch,
        branchStock,
        locationStock,
      };
    });
  }

  /**
   * Allocates an already-reserved branch quantity using earliest-expiry-first
   * batches. Compare-and-set guards keep concurrent dispensing consistent.
   * All issued stock must resolve to an active, unexpired batch and location.
   * This deliberately rejects legacy aggregate-only stock so the three stock
   * balances cannot silently diverge.
   */
  async allocateForIssue(
    tx: Prisma.TransactionClient,
    input: {
      facilityId: number;
      branchId: number;
      medicineId: number;
      branchStockId: number;
      quantity: number;
      sourceType: string;
      sourceEntityId: string;
      performedByStaffId?: number;
      notes?: string;
      aggregateStockBefore: number;
      aggregateStockAfter: number;
      otcSaleId?: number;
      otcSaleItemId?: number;
    },
  ) {
    const batches = await tx.medicineBatch.findMany({
      where: {
        facilityId: input.facilityId,
        branchId: input.branchId,
        medicineId: input.medicineId,
        statusCode: 'ACTIVE',
        quantityAvailable: { gt: 0 },
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }, { id: 'asc' }],
    });

    let remaining = input.quantity;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const quantity = Math.min(remaining, batch.quantityAvailable);
      const reservedBatch = await tx.medicineBatch.updateMany({
        where: { id: batch.id, quantityAvailable: { gte: quantity } },
        data: {
          quantityAvailable: { decrement: quantity },
          ...(batch.quantityAvailable === quantity
            ? { statusCode: 'DEPLETED' }
            : {}),
        },
      });
      if (reservedBatch.count !== 1) {
        throw new ConflictException(
          'A medicine batch changed during dispensing. Please retry.',
        );
      }

      const reservedLocation = await tx.pharmacyLocationStock.updateMany({
        where: {
          pharmacyLocationId: batch.pharmacyLocationId,
          medicineId: input.medicineId,
          stockQuantity: { gte: quantity },
        },
        data: { stockQuantity: { decrement: quantity } },
      });
      if (reservedLocation.count !== 1) {
        throw new ConflictException(
          `Location stock is inconsistent for batch ${batch.batchNumber}. The issue was rolled back.`,
        );
      }

      await tx.pharmacyStockMovement.create({
        data: {
          facilityId: input.facilityId,
          branchId: input.branchId,
          medicineId: input.medicineId,
          branchStockId: input.branchStockId,
          pharmacyLocationId: batch.pharmacyLocationId,
          medicineBatchId: batch.id,
          sourceType: input.sourceType,
          sourceEntityId: input.sourceEntityId,
          movementType: 'OUT',
          quantity,
          stockBefore: batch.quantityAvailable,
          stockAfter: batch.quantityAvailable - quantity,
          performedByStaffId: input.performedByStaffId,
          notes: input.notes,
          otcSaleId: input.otcSaleId,
          otcSaleItemId: input.otcSaleItemId,
        },
      });
      remaining -= quantity;
    }

    if (remaining > 0) {
      throw new ConflictException(
        `Only ${input.quantity - remaining} of ${input.quantity} units are available in active, unexpired pharmacy batches. Receive or reconcile batch stock before issuing this medicine.`,
      );
    }
  }

  async listReturns(user: RequestUser) {
    return this.prisma.medicineReturn.findMany({
      where: this.scope.buildBranchScopeWhere(user),
      include: {
        patient: true,
        pharmacyLocation: true,
        receivedBy: true,
        reviewedBy: true,
        items: {
          include: {
            medicine: true,
            medicineBatch: true,
            dispenseItem: true,
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: 250,
    });
  }

  async createReturn(dto: CreateMedicineReturnDto, user: RequestUser) {
    const location = await this.getLocation(dto.pharmacyLocationId, user);
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true, facilityId: true },
    });
    if (!patient || patient.facilityId !== location.facilityId) {
      throw new NotFoundException('Patient was not found in this facility');
    }

    if (dto.dispenseId) {
      const dispense = await this.prisma.dispense.findUnique({
        where: { id: dto.dispenseId },
        include: { items: true },
      });
      if (
        !dispense ||
        dispense.patientId !== patient.id ||
        dispense.facilityId !== location.facilityId
      ) {
        throw new BadRequestException(
          'The selected dispensing record does not belong to this patient',
        );
      }

      for (const item of dto.items) {
        if (!item.dispenseItemId) continue;
        const dispensedItem = dispense.items.find(
          (candidate) => candidate.id === item.dispenseItemId,
        );
        if (!dispensedItem || dispensedItem.medicineId !== item.medicineId) {
          throw new BadRequestException(
            `Dispense item ${item.dispenseItemId} is not valid for this return`,
          );
        }
        const previouslyReturned =
          await this.prisma.medicineReturnItem.aggregate({
            where: {
              dispenseItemId: item.dispenseItemId,
              medicineReturn: {
                statusCode: { not: 'REJECTED' },
              },
            },
            _sum: { quantityReturned: true },
          });
        if (
          Number(previouslyReturned._sum.quantityReturned ?? 0) +
            item.quantityReturned >
          dispensedItem.quantityDispensed
        ) {
          throw new BadRequestException(
            `Returned quantity exceeds the quantity dispensed for item ${item.dispenseItemId}`,
          );
        }
      }
    }

    const medicines = await this.prisma.medicine.count({
      where: {
        id: {
          in: Array.from(new Set(dto.items.map((item) => item.medicineId))),
        },
        isActive: true,
      },
    });
    if (medicines !== new Set(dto.items.map((item) => item.medicineId)).size) {
      throw new BadRequestException('One or more medicines are invalid');
    }

    return this.prisma.medicineReturn.create({
      data: {
        returnNumber: `MRET-${randomUUID().slice(0, 12).toUpperCase()}`,
        facilityId: location.facilityId,
        branchId: location.branchId,
        pharmacyLocationId: location.id,
        patientId: patient.id,
        dispenseId: dto.dispenseId,
        returnReason: dto.returnReason.trim(),
        receivedByStaffId: user.staffId ?? undefined,
        items: {
          create: dto.items.map((item) => ({
            dispenseItemId: item.dispenseItemId,
            medicineId: item.medicineId,
            medicineBatchId: item.medicineBatchId,
            quantityReturned: item.quantityReturned,
            conditionCode: item.conditionCode.trim().toUpperCase(),
          })),
        },
      },
      include: {
        patient: true,
        pharmacyLocation: true,
        items: { include: { medicine: true, medicineBatch: true } },
      },
    });
  }

  async reviewReturn(
    id: number,
    dto: ReviewMedicineReturnDto,
    user: RequestUser,
  ) {
    const medicineReturn = await this.prisma.medicineReturn.findUnique({
      where: { id },
      include: { items: true, pharmacyLocation: true },
    });
    if (!medicineReturn) {
      throw new NotFoundException(`Medicine return with id ${id} not found`);
    }
    this.scope.assertBranchAccess(
      user,
      medicineReturn.facilityId,
      medicineReturn.branchId,
    );
    if (medicineReturn.statusCode !== 'PENDING_INSPECTION') {
      throw new ConflictException('This return has already been reviewed');
    }

    const decisions = new Map(dto.items.map((item) => [item.itemId, item]));
    if (
      decisions.size !== medicineReturn.items.length ||
      medicineReturn.items.some((item) => !decisions.has(item.id))
    ) {
      throw new BadRequestException(
        'A disposition is required for every returned item',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of medicineReturn.items) {
        const decision = decisions.get(item.id)!;
        if (
          decision.dispositionCode === 'RESTOCK' &&
          !RESTOCKABLE_CONDITIONS.has(item.conditionCode)
        ) {
          throw new BadRequestException(
            `Item ${item.id} cannot be restocked because its condition is ${item.conditionCode}`,
          );
        }

        let batchId = decision.medicineBatchId ?? item.medicineBatchId;
        if (decision.dispositionCode === 'RESTOCK') {
          if (!batchId) {
            throw new BadRequestException(
              `A valid batch is required to restock return item ${item.id}`,
            );
          }
          const batch = await tx.medicineBatch.findUnique({
            where: { id: batchId },
          });
          if (
            !batch ||
            batch.medicineId !== item.medicineId ||
            batch.pharmacyLocationId !== medicineReturn.pharmacyLocationId ||
            batch.expiresAt <= new Date() ||
            batch.statusCode !== 'ACTIVE'
          ) {
            throw new BadRequestException(
              `Return item ${item.id} cannot be assigned to the selected batch`,
            );
          }

          const branchStock = await tx.branchMedicineStock.findUniqueOrThrow({
            where: {
              branchId_medicineId: {
                branchId: medicineReturn.branchId,
                medicineId: item.medicineId,
              },
            },
          });
          const stockBefore = branchStock.stockQuantity;
          const updatedBranchStock = await tx.branchMedicineStock.update({
            where: { id: branchStock.id },
            data: { stockQuantity: { increment: item.quantityReturned } },
          });
          await tx.pharmacyLocationStock.upsert({
            where: {
              pharmacyLocationId_medicineId: {
                pharmacyLocationId: medicineReturn.pharmacyLocationId,
                medicineId: item.medicineId,
              },
            },
            create: {
              facilityId: medicineReturn.facilityId,
              branchId: medicineReturn.branchId,
              pharmacyLocationId: medicineReturn.pharmacyLocationId,
              medicineId: item.medicineId,
              branchStockId: branchStock.id,
              stockQuantity: item.quantityReturned,
            },
            update: {
              stockQuantity: { increment: item.quantityReturned },
            },
          });
          await tx.medicineBatch.update({
            where: { id: batch.id },
            data: { quantityAvailable: { increment: item.quantityReturned } },
          });
          await tx.pharmacyStockMovement.create({
            data: {
              facilityId: medicineReturn.facilityId,
              branchId: medicineReturn.branchId,
              pharmacyLocationId: medicineReturn.pharmacyLocationId,
              medicineId: item.medicineId,
              medicineBatchId: batch.id,
              medicineReturnItemId: item.id,
              branchStockId: branchStock.id,
              sourceType: 'PATIENT_RETURN',
              sourceEntityId: String(medicineReturn.id),
              movementType: 'RETURN_IN',
              quantity: item.quantityReturned,
              stockBefore,
              stockAfter: updatedBranchStock.stockQuantity,
              performedByStaffId: user.staffId ?? undefined,
              notes: decision.dispositionReason,
            },
          });
        } else {
          batchId = decision.medicineBatchId ?? item.medicineBatchId;
          const branchStock = await tx.branchMedicineStock.findUnique({
            where: {
              branchId_medicineId: {
                branchId: medicineReturn.branchId,
                medicineId: item.medicineId,
              },
            },
          });
          await tx.pharmacyStockMovement.create({
            data: {
              facilityId: medicineReturn.facilityId,
              branchId: medicineReturn.branchId,
              pharmacyLocationId: medicineReturn.pharmacyLocationId,
              medicineId: item.medicineId,
              medicineBatchId: batchId,
              medicineReturnItemId: item.id,
              branchStockId: branchStock?.id,
              sourceType: 'PATIENT_RETURN',
              sourceEntityId: String(medicineReturn.id),
              movementType: decision.dispositionCode,
              quantity: item.quantityReturned,
              stockBefore: branchStock?.stockQuantity ?? 0,
              stockAfter: branchStock?.stockQuantity ?? 0,
              performedByStaffId: user.staffId ?? undefined,
              notes: decision.dispositionReason,
            },
          });
        }

        await tx.medicineReturnItem.update({
          where: { id: item.id },
          data: {
            medicineBatchId: batchId,
            dispositionCode: decision.dispositionCode,
            dispositionReason: decision.dispositionReason?.trim(),
          },
        });
      }

      const dispositions = dto.items.map((item) => item.dispositionCode);
      const statusCode = dispositions.every((item) => item === 'RESTOCK')
        ? 'RESTOCKED'
        : dispositions.every((item) => item === 'WASTE')
          ? 'WASTED'
          : dispositions.every((item) => item === 'QUARANTINE')
            ? 'QUARANTINED'
            : 'PARTIALLY_ACCEPTED';

      return tx.medicineReturn.update({
        where: { id },
        data: {
          statusCode,
          inspectionNotes: dto.inspectionNotes.trim(),
          reviewedByStaffId: user.staffId ?? undefined,
          reviewedAt: new Date(),
        },
        include: {
          patient: true,
          pharmacyLocation: true,
          items: { include: { medicine: true, medicineBatch: true } },
        },
      });
    });
  }

  async getDashboard(
    user: RequestUser,
    options: { nearExpiryDays?: number; deadStockDays?: number },
  ) {
    const nearExpiryDays = positiveInteger(options.nearExpiryDays, 90);
    const deadStockDays = positiveInteger(options.deadStockDays, 90);
    const now = new Date();
    const nearExpiryAt = new Date(
      now.getTime() + nearExpiryDays * 24 * 60 * 60 * 1000,
    );
    const deadStockSince = new Date(
      now.getTime() - deadStockDays * 24 * 60 * 60 * 1000,
    );
    const where = this.scope.buildBranchScopeWhere(user);

    const [locations, batches, stocks, recentMovements] = await Promise.all([
      this.prisma.pharmacyLocation.findMany({
        where: { ...where, isActive: true },
        include: { branch: true },
      }),
      this.prisma.medicineBatch.findMany({
        where,
        include: {
          medicine: true,
          pharmacyLocation: true,
          branch: true,
        },
        orderBy: { expiresAt: 'asc' },
      }),
      this.prisma.pharmacyLocationStock.findMany({
        where: { ...where, isActive: true, stockQuantity: { gt: 0 } },
        include: {
          medicine: true,
          pharmacyLocation: true,
          branch: true,
        },
      }),
      this.prisma.pharmacyStockMovement.findMany({
        where: {
          ...where,
          createdAt: { gte: deadStockSince },
          pharmacyLocationId: { not: null },
        },
        select: { pharmacyLocationId: true, medicineId: true },
        distinct: ['pharmacyLocationId', 'medicineId'],
      }),
    ]);

    const recentlyMoved = new Set(
      recentMovements.map(
        (movement) => `${movement.pharmacyLocationId}:${movement.medicineId}`,
      ),
    );
    const expired = batches.filter(
      (batch) => batch.quantityAvailable > 0 && batch.expiresAt <= now,
    );
    const nearExpiry = batches.filter(
      (batch) =>
        batch.quantityAvailable > 0 &&
        batch.expiresAt > now &&
        batch.expiresAt <= nearExpiryAt,
    );
    const deadStock = stocks.filter(
      (stock) =>
        !recentlyMoved.has(`${stock.pharmacyLocationId}:${stock.medicineId}`),
    );

    return {
      filters: { nearExpiryDays, deadStockDays },
      summary: {
        locations: locations.length,
        activeBatches: batches.filter((batch) => batch.statusCode === 'ACTIVE')
          .length,
        expiredBatches: expired.length,
        nearExpiryBatches: nearExpiry.length,
        deadStockItems: deadStock.length,
      },
      locations,
      expired,
      nearExpiry,
      deadStock,
    };
  }
}
