import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { StaffService } from '../staff/staff.service';
import { ConsultationService } from '../consultation/consultation.service';
import { NotificationService } from '../notification/notification.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateDispenseDto } from './dto/create-dispense.dto';
import { DirectMedicineAdministrationDto } from './dto/direct-medicine-administration.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { BillingService } from '../billing/billing.service';
import { CacheService } from '../resilience/cache.service';
import { SafeLoggerService } from '../resilience/safe-logger.service';

function stockStatus(stockQuantity?: number | null, reorderLevel?: number | null) {
  const quantity = Number(stockQuantity ?? 0);
  const reorder = Number(reorderLevel ?? 0);

  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (reorder > 0 && quantity <= reorder) return 'LOW_STOCK';
  return 'IN_STOCK';
}

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientService: PatientService,
    private readonly staffService: StaffService,
    private readonly consultationService: ConsultationService,
    private readonly notificationService: NotificationService,
    private readonly scopeService: ScopeService,
    private readonly billingService: BillingService,
    private readonly cacheService: CacheService,
    private readonly safeLogger: SafeLoggerService,
  ) {}

  private async recordPrescriptionAudit(params: {
    actionName: string;
    prescription: {
      id: number;
      prescriptionNumber?: string | null;
      facilityId: number;
      branchId?: number | null;
      consultationId?: number | null;
      patientId?: number | null;
    };
    user?: RequestUser;
    afterData?: unknown;
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
          description: `Prescription ${params.prescription.prescriptionNumber ?? params.prescription.id} sent to pharmacy.`,
          afterData: params.afterData
            ? JSON.stringify(params.afterData)
            : undefined,
        },
      });
    } catch {
      // Prescribing should continue if audit storage is temporarily unavailable.
    }
  }


  async createMedicine(createMedicineDto: CreateMedicineDto) {
    const existing = await this.prisma.medicine.findFirst({
      where: {
        OR: [{ code: createMedicineDto.code }, { name: createMedicineDto.name }],
      },
    });

    if (existing) {
      throw new BadRequestException('Medicine code or name already exists');
    }

    const medicine = await this.prisma.medicine.create({
      data: {
        code: createMedicineDto.code,
        name: createMedicineDto.name,
        dosageForm: createMedicineDto.dosageForm,
        strength: createMedicineDto.strength,
        manufacturer: createMedicineDto.manufacturer,
        unitPrice: createMedicineDto.unitPrice ?? 0,
        stockQuantity: createMedicineDto.stockQuantity ?? 0,
        reorderLevel: createMedicineDto.reorderLevel ?? 0,
        isActive: createMedicineDto.isActive ?? true,
      },
    });

    await this.cacheService.invalidatePattern(
      this.cacheService.makeKey(['medicine-reference']) + '*',
    );
    return medicine;
  }

  getAllMedicines() {
    return this.cacheService.getOrSet(
      this.cacheService.makeKey(['medicine-reference', 'first-page']),
      Number(process.env.CACHE_REFERENCE_TTL_SECONDS ?? 300),
      () =>
        this.prisma.medicine.findMany({
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          take: 100,
        }),
    );
  }

  async getMedicineById(id: number) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with id ${id} not found`);
    }

    return medicine;
  }

  async createPrescription(
    createPrescriptionDto: CreatePrescriptionDto,
    user?: RequestUser,
  ) {
    const temporaryPrescriptionNumber = `RX-TMP-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;


    const consultation = await this.consultationService.findOne(
      createPrescriptionDto.consultationId,
    );

    const patient = await this.patientService.findOne(
      createPrescriptionDto.patientId,
    );

    if (consultation.patientId !== patient.id) {
      throw new BadRequestException(
        'Consultation does not belong to the selected patient',
      );
    }

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        consultation.facilityId,
        consultation.branchId,
      );
    }

    const prescribedByStaffId =
      user?.staffId ?? createPrescriptionDto.prescribedByStaffId;
    await this.staffService.findOne(prescribedByStaffId);

    const medicineIds = Array.from(
      new Set(createPrescriptionDto.items.map((item) => item.medicineId)),
    );
    const medicines = await this.prisma.medicine.findMany({
      where: { id: { in: medicineIds } },
    });
    const medicineById = new Map(
      medicines.map((medicine) => [medicine.id, medicine]),
    );

    for (const item of createPrescriptionDto.items) {
      const medicine = medicineById.get(item.medicineId);
      if (!medicine) {
        throw new NotFoundException(
          `Medicine with id ${item.medicineId} not found`,
        );
      }
    }

    const branchStocks = consultation.branchId
      ? await this.prisma.branchMedicineStock.findMany({
          where: {
            branchId: consultation.branchId,
            medicineId: { in: medicineIds },
          },
          select: {
            medicineId: true,
            stockQuantity: true,
            reorderLevel: true,
          },
        })
      : [];
    const stockByMedicineId = new Map(
      branchStocks.map((stock) => [stock.medicineId, stock]),
    );

    const created = await this.prisma.prescription.create({
      data: {
        facilityId: consultation.facilityId,
        branchId: consultation.branchId,
        prescriptionNumber: temporaryPrescriptionNumber,
        consultationId: createPrescriptionDto.consultationId,
        patientId: createPrescriptionDto.patientId,
        prescribedByStaffId,
        notes: createPrescriptionDto.notes,
        statusCode: 'PRESCRIBED',
        items: {
          create: createPrescriptionDto.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage,
            route: item.route,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity ?? 1,
            instructions: item.instructions,
            medicineNameSnapshot: medicineById.get(item.medicineId)?.name,
            stockStatusAtPrescribing: stockStatus(
              stockByMedicineId.get(item.medicineId)?.stockQuantity,
              stockByMedicineId.get(item.medicineId)?.reorderLevel,
            ),
            acceptedAlternativeForMedicineId:
              item.acceptedAlternativeForMedicineId,
            statusCode: 'PRESCRIBED',
          })),
        },
      },
      include: {
        facility: true,
        branch: true,
        consultation: true,
        patient: true,
        prescribedBy: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });

    const prescription = await this.prisma.prescription.update({
      where: { id: created.id },
      data: {
        prescriptionNumber: `RX-${String(created.id).padStart(6, '0')}`,
      },
      include: {
        facility: true,
        branch: true,
        consultation: true,
        patient: true,
        prescribedBy: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });

    await this.recordPrescriptionAudit({
      actionName: createPrescriptionDto.items.some(
        (item) => item.acceptedAlternativeForMedicineId,
      )
        ? 'PRESCRIPTION_SENT_WITH_ALTERNATIVE'
        : 'PRESCRIPTION_SENT_TO_PHARMACY',
      prescription,
      user,
      afterData: {
        prescriptionId: prescription.id,
        consultationId: prescription.consultationId,
        patientId: prescription.patientId,
        itemCount: prescription.items.length,
        acceptedAlternativeCount: prescription.items.filter(
          (item) => item.acceptedAlternativeForMedicineId,
        ).length,
      },
    });

    return prescription;
  }

  getAllPrescriptions() {
    return this.prisma.prescription.findMany({
      include: {
        facility: true,
        branch: true,
        consultation: true,
        patient: true,
        prescribedBy: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getPrescriptionById(id: number) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        consultation: true,
        patient: true,
        prescribedBy: true,
        items: {
          include: {
            medicine: true,
          },
        },
        dispenses: {
          include: {
            dispensedBy: true,
            items: {
              include: {
                medicine: true,
                prescriptionItem: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },

    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with id ${id} not found`);
    }

    return prescription;
  }

  async getPharmacyQueue() {
    return this.prisma.prescription.findMany({
      where: {
        statusCode: {
          in: ['PRESCRIBED', 'PARTIALLY_DISPENSED'],
        },
      },
      include: {
        facility: true,
        branch: true,
        consultation: true,
        patient: true,
        prescribedBy: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: { prescribedAt: 'asc' },
    });
  }

  private async notificationExistsForStaff(params: {
    notificationType: string;
    entityType: string;
    entityId: string;
    facilityId: number;
    branchId: number;
    targetStaffId: number;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        notificationType: params.notificationType,
        entityType: params.entityType,
        entityId: params.entityId,
        facilityId: params.facilityId,
        branchId: params.branchId,
        targetStaffId: params.targetStaffId,
        isRead: false,
      },
    });

    return !!existing;
  }

  private async notificationExistsForUser(params: {
    notificationType: string;
    entityType: string;
    entityId: string;
    facilityId: number;
    branchId: number;
    targetUserId: number;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        notificationType: params.notificationType,
        entityType: params.entityType,
        entityId: params.entityId,
        facilityId: params.facilityId,
        branchId: params.branchId,
        targetUserId: params.targetUserId,
        isRead: false,
      },
    });

    return !!existing;
  }

  private async notifyLowOrOutOfStock(params: {
    stockId: number;
    facilityId: number;
    branchId: number;
    medicineName: string;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
  }) {
    const {
      stockId,
      facilityId,
      branchId,
      medicineName,
      branchName,
      stockQuantity,
      reorderLevel,
    } = params;

    let title = '';
    let message = '';
    let notificationType = '';
    let severity = '';

    if (stockQuantity <= 0) {
      title = 'Medicine Out of Stock';
      message = `${medicineName} is now out of stock at ${branchName}.`;
      notificationType = 'OUT_OF_STOCK';
      severity = 'CRITICAL';
    } else if (stockQuantity <= reorderLevel) {
      title = 'Low Medicine Stock';
      message = `${medicineName} is low in stock at ${branchName}. Remaining quantity: ${stockQuantity}.`;
      notificationType = 'LOW_STOCK';
    } else {
      return;
    }

    const entityType = 'BRANCH_MEDICINE_STOCK';
    const entityId = String(stockId);

    const pharmacists = await this.prisma.staff.findMany({
      where: {
        facilityId,
        branchId,
        isActive: true,
        role: {
          code: 'PHARMACIST',
        },
      },
      include: {
        role: true,
        user: true,
      },
    });

    const adminUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          code: {
            in: ['ADMIN', 'SUPER_ADMIN'],
          },
        },
        OR: [
          {
            canAccessAllBranchesInFacility: true,
            homeFacilityId: facilityId,
          },
          {
            branchAccesses: {
              some: {
                branchId,
                facilityId,
                isActive: true,
              },
            },
          },
        ],
      },
      include: {
        role: true,
      },
    });

    const notifiedStaffIds = new Set<number>();
    const notifiedUserIds = new Set<number>();

    for (const pharmacist of pharmacists) {
      if (notifiedStaffIds.has(pharmacist.id)) continue;
      notifiedStaffIds.add(pharmacist.id);

      const exists = await this.notificationExistsForStaff({
        notificationType,
        entityType,
        entityId,
        facilityId,
        branchId,
        targetStaffId: pharmacist.id,
      });

      if (!exists) {
        await this.notificationService.create({
          title,
          message,
          notificationType,
          severity,
          moduleName: 'PHARMACY',
          entityType,
          entityId,
          facilityId,
          branchId,
          targetStaffId: pharmacist.id,
        });
      }

      if (pharmacist.userId) {
        notifiedUserIds.add(pharmacist.userId);
      }
    }

    for (const adminUser of adminUsers) {
      if (notifiedUserIds.has(adminUser.id)) continue;
      notifiedUserIds.add(adminUser.id);

      const exists = await this.notificationExistsForUser({
        notificationType,
        entityType,
        entityId,
        facilityId,
        branchId,
        targetUserId: adminUser.id,
      });

      if (!exists) {
        await this.notificationService.create({
          title,
          message,
          notificationType,
          severity,
          moduleName: 'PHARMACY',
          entityType,
          entityId,
          facilityId,
          branchId,
          targetUserId: adminUser.id,
        });
      }
    }
  }
  getAllPrescriptionsScoped(user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);

  return this.prisma.prescription.findMany({
    where: scope,
    include: {
      facility: true,
      branch: true,
      consultation: true,
      patient: true,
      prescribedBy: true,
      items: {
        include: {
          medicine: true,
        },
      },
    },
    orderBy: { id: 'desc' },
    take: 100,
  });
}

async getPrescriptionByIdScoped(id: number, user: RequestUser) {
  const prescription = await this.getPrescriptionById(id);

  this.scopeService.assertBranchAccess(
    user,
    prescription.facilityId,
    prescription.branchId,
  );

  return prescription;
}

async getPharmacyQueueScoped(user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);

  return this.prisma.prescription.findMany({
    where: {
      ...scope,
      statusCode: {
        in: ['PRESCRIBED', 'PARTIALLY_DISPENSED'],
      },
    },
    include: {
      facility: true,
      branch: true,
      consultation: true,
      patient: true,
      prescribedBy: true,
      items: {
        include: {
          medicine: true,
        },
      },
    },
    orderBy: { prescribedAt: 'asc' },
    take: 100,
  });
}

 async dispensePrescription(
  id: number,
  user: RequestUser,
  dto?: Partial<CreateDispenseDto>,
) {
  const prescription = await this.getPrescriptionById(id);

  if (!prescription.branchId) {
    throw new BadRequestException(
      'Prescription has no branch assigned. Cannot dispense branch stock.',
    );
  }

  const staff = await this.prisma.staff.findFirst({
    where: {
      userId: user.userId,
      isActive: true,
    },
  });

  if (!staff) {
    throw new BadRequestException(
      'Logged in user is not linked to an active staff profile.',
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

  this.scopeService.assertBranchAccess(
    user,
    prescription.facilityId,
    prescription.branchId,
  );

  const nonDispensableItemStatuses = ['DISPENSED', 'CANCELLED', 'DISPENSING'];
  const alreadyDispensedByItemId = new Map<number, number>();
  for (const dispense of prescription.dispenses ?? []) {
    for (const item of dispense.items ?? []) {
      alreadyDispensedByItemId.set(
        item.prescriptionItemId,
        (alreadyDispensedByItemId.get(item.prescriptionItemId) ?? 0) +
          item.quantityDispensed,
      );
    }
  }

  const requestedByItemId = new Map<number, number>();
  for (const item of dto?.items ?? []) {
    requestedByItemId.set(item.prescriptionItemId, item.quantityDispensed);
  }

  const itemsToDispense = prescription.items
    .filter(
      (item) =>
        !nonDispensableItemStatuses.includes(
          (item.statusCode || '').toUpperCase(),
        ),
    )
    .map((item) => {
      const alreadyDispensed = alreadyDispensedByItemId.get(item.id) ?? 0;
      const remaining = Math.max(0, item.quantity - alreadyDispensed);
      const requested = requestedByItemId.has(item.id)
        ? Number(requestedByItemId.get(item.id))
        : remaining;

      return {
        ...item,
        alreadyDispensed,
        remaining,
        quantityToDispense: Math.max(0, Math.min(requested, remaining)),
      };
    })
    .filter((item) => item.remaining > 0 && item.quantityToDispense > 0);

  if (itemsToDispense.length === 0) {
    throw new BadRequestException(
      'No prescription item quantity is available to dispense.',
    );
  }

  for (const item of itemsToDispense) {
    const branchStock = await this.prisma.branchMedicineStock.findFirst({
      where: {
        facilityId: prescription.facilityId,
        branchId: prescription.branchId,
        medicineId: item.medicineId,
        isActive: true,
      },
      include: {
        medicine: true,
        branch: true,
      },
    });

    if (!branchStock) {
      throw new NotFoundException(
        `No branch stock found for medicine ${item.medicineId} in branch ${prescription.branchId}`,
      );
    }

    if (branchStock.stockQuantity < item.quantityToDispense) {
      throw new BadRequestException(
        `Insufficient branch stock for ${branchStock.medicine.name} at ${branchStock.branch.name}. Available: ${branchStock.stockQuantity}, required: ${item.quantityToDispense}`,
      );
    }
  }

  const quantityToDispenseByItemId = new Map(
    itemsToDispense.map((item) => [item.id, item.quantityToDispense]),
  );
  const willAllItemsBeFullyDispensed = prescription.items.every((item) => {
    const status = (item.statusCode || '').toUpperCase();
    if (status === 'CANCELLED') return true;
    const alreadyDispensed = alreadyDispensedByItemId.get(item.id) ?? 0;
    const currentDispense = quantityToDispenseByItemId.get(item.id) ?? 0;
    return alreadyDispensed + currentDispense >= item.quantity;
  });
  const finalPrescriptionStatus = willAllItemsBeFullyDispensed
    ? 'DISPENSED'
    : 'PARTIALLY_DISPENSED';

  const temporaryDispenseNumber = `DSP-TMP-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  const lowStockChecks: Array<{
    stockId: number;
    facilityId: number;
    branchId: number;
    medicineName: string;
    branchName: string;
    stockQuantity: number;
    reorderLevel: number;
  }> = [];

  const billedItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    sourceEntityId: string;
  }> = [];

  const result = await this.prisma.$transaction(async (tx) => {
    let createdDispense = await tx.dispense.create({
      data: {
        dispenseNumber: temporaryDispenseNumber,
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        facilityId: prescription.facilityId,
        branchId: prescription.branchId,
        dispensedByStaffId: staff.id,
        statusCode: finalPrescriptionStatus,
        notes: dto?.notes,
        dispensedAt: new Date(),
      },
    });

    createdDispense = await tx.dispense.update({
      where: { id: createdDispense.id },
      data: {
        dispenseNumber: `DSP-${String(createdDispense.id).padStart(6, '0')}`,
      },
    });

    for (const item of itemsToDispense) {
      const reservedItem = await tx.prescriptionItem.updateMany({
        where: {
          id: item.id,
          statusCode: {
            notIn: nonDispensableItemStatuses,
          },
        },
        data: {
          statusCode: 'DISPENSING',
        },
      });

      if (reservedItem.count !== 1) {
        throw new BadRequestException(
          `Prescription item ${item.id} has already been dispensed or is being dispensed by another session.`,
        );
      }

      const branchStock = await tx.branchMedicineStock.findFirst({
        where: {
          facilityId: prescription.facilityId,
          branchId: prescription.branchId!,
          medicineId: item.medicineId,
          isActive: true,
        },
        include: {
          medicine: true,
          branch: true,
        },
      });

      if (!branchStock) {
        throw new NotFoundException(
          `No branch stock found for medicine ${item.medicineId} in branch ${prescription.branchId}`,
        );
      }

      const reservedStock = await tx.branchMedicineStock.updateMany({
        where: {
          id: branchStock.id,
          stockQuantity: {
            gte: item.quantityToDispense,
          },
        },
        data: {
          stockQuantity: {
            decrement: item.quantityToDispense,
          },
        },
      });

      if (reservedStock.count !== 1) {
        throw new BadRequestException(
          `Insufficient branch stock for ${branchStock.medicine.name}. Another dispensing action may have used the stock first.`,
        );
      }

      const updatedStock = await tx.branchMedicineStock.findUniqueOrThrow({
        where: { id: branchStock.id },
        include: {
          medicine: true,
          branch: true,
        },
      });

      const itemStatus =
        item.alreadyDispensed + item.quantityToDispense >= item.quantity
          ? 'DISPENSED'
          : 'PARTIALLY_DISPENSED';

      await tx.prescriptionItem.update({
        where: { id: item.id },
        data: {
          statusCode: itemStatus,
        },
      });

      const unitPrice = updatedStock.unitPrice ?? item.medicine?.unitPrice ?? 0;

      await tx.dispenseItem.create({
        data: {
          dispenseId: createdDispense.id,
          prescriptionItemId: item.id,
          medicineId: item.medicineId,
          quantityPrescribed: item.quantity,
          quantityDispensed: item.quantityToDispense,
          unitPrice,
          lineTotal: unitPrice * item.quantityToDispense,
          notes: item.instructions,
        },
      });

      billedItems.push({
        description: `Drug Dispensed: ${item.medicine?.name || `Medicine #${item.medicineId}`}`,
        quantity: item.quantityToDispense,
        unitPrice,
        notes: item.instructions || undefined,
        sourceEntityId: String(item.id),
      });

      lowStockChecks.push({
        stockId: updatedStock.id,
        facilityId: updatedStock.facilityId,
        branchId: updatedStock.branchId,
        medicineName: updatedStock.medicine.name,
        branchName: updatedStock.branch.name,
        stockQuantity: updatedStock.stockQuantity,
        reorderLevel: updatedStock.reorderLevel,
      });
    }

    await tx.prescription.update({
      where: { id: prescription.id },
      data: {
        statusCode: finalPrescriptionStatus,
        dispensedAt: willAllItemsBeFullyDispensed ? new Date() : null,
      },
    });

    return tx.prescription.findUnique({
      where: { id: prescription.id },
      include: {
        facility: true,
        branch: true,
        consultation: true,
        patient: true,
        prescribedBy: true,
        items: {
          include: {
            medicine: true,
          },
        },
        dispenses: {
          include: {
            dispensedBy: true,
            items: {
              include: {
                medicine: true,
                prescriptionItem: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  });

  for (const billedItem of billedItems) {
    await this.billingService.addAutoInvoiceItem({
      patientId: prescription.patientId,
      facilityId: prescription.facilityId,
      branchId: prescription.branchId,
      consultationId: prescription.consultationId,
      createdByStaffId: staff.id,
      description: billedItem.description,
      quantity: billedItem.quantity,
      unitPrice: billedItem.unitPrice,
      notes: billedItem.notes,
      sourceModule: 'PHARMACY',
      sourceEntityType: 'PRESCRIPTION_ITEM',
      sourceEntityId: billedItem.sourceEntityId,
    });
  }

  for (const stockCheck of lowStockChecks) {
    await this.notifyLowOrOutOfStock(stockCheck);
  }

  await this.prisma.auditLog
    .create({
      data: {
        moduleName: 'PHARMACY',
        actionName:
          finalPrescriptionStatus === 'DISPENSED'
            ? 'PRESCRIPTION_DISPENSED'
            : 'PRESCRIPTION_PARTIALLY_DISPENSED',
        entityType: 'PRESCRIPTION',
        entityId: String(prescription.id),
        facilityId: prescription.facilityId,
        branchId: prescription.branchId ?? undefined,
        actorUserId: user.userId,
        actorStaffId: staff.id,
        afterData: JSON.stringify({
          prescriptionNumber: prescription.prescriptionNumber,
          finalPrescriptionStatus,
          items: itemsToDispense.map((item) => ({
            prescriptionItemId: item.id,
            medicineId: item.medicineId,
            quantityPrescribed: item.quantity,
            alreadyDispensed: item.alreadyDispensed,
            quantityDispensedNow: item.quantityToDispense,
          })),
        }),
      },
    })
    .catch(() => undefined);

  await this.notificationService.create({
    title:
      finalPrescriptionStatus === 'DISPENSED'
        ? 'Prescription Dispensed'
        : 'Prescription Partially Dispensed',
    message: `Prescription ${prescription.prescriptionNumber} is ${finalPrescriptionStatus.toLowerCase().replace(/_/g, ' ')}.`,
    notificationType: 'PRESCRIPTION_DISPENSED',
    severity: 'INFO',
    moduleName: 'PHARMACY',
    entityType: 'PRESCRIPTION',
    entityId: String(prescription.id),
    facilityId: prescription.facilityId,
    branchId: prescription.branchId ?? undefined,
    targetStaffId: prescription.prescribedByStaffId,
  });

  return result;
}

  async directMedicineAdministration(
    dto: DirectMedicineAdministrationDto,
    user: RequestUser,
  ) {
    const consultation = await this.consultationService.findOne(
      dto.consultationId,
    );

    if (consultation.patientId !== dto.patientId) {
      throw new BadRequestException(
        'Consultation does not belong to the selected patient',
      );
    }

    if (!consultation.branchId) {
      throw new BadRequestException(
        'Consultation has no branch assigned. Direct stock administration requires branch stock.',
      );
    }

    this.scopeService.assertBranchAccess(
      user,
      consultation.facilityId,
      consultation.branchId,
    );

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
        facilityId: consultation.facilityId,
        branchId: consultation.branchId,
        medicineId: dto.medicineId,
        isActive: true,
      },
      include: { medicine: true, branch: true },
    });

    if (!stock) {
      throw new NotFoundException(
        `No branch stock found for medicine ${dto.medicineId} in this consultation branch.`,
      );
    }

    if (stock.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient consultation-room stock for ${stock.medicine.name}. Available: ${stock.stockQuantity}, required: ${dto.quantity}`,
      );
    }

    const temporaryPrescriptionNumber = `RX-DIRECT-TMP-${Date.now()}-${randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
    const temporaryDispenseNumber = `DSP-DIRECT-TMP-${Date.now()}-${randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;
    const startedAt = Date.now();

    const result = await this.prisma.$transaction(async (tx) => {
      const reservedStock = await tx.branchMedicineStock.updateMany({
        where: {
          id: stock.id,
          stockQuantity: { gte: dto.quantity },
        },
        data: { stockQuantity: { decrement: dto.quantity } },
      });

      if (reservedStock.count !== 1) {
        throw new BadRequestException(
          `Insufficient consultation-room stock for ${stock.medicine.name}. Another action may have used the stock first.`,
        );
      }

      let prescription = await tx.prescription.create({
        data: {
          prescriptionNumber: temporaryPrescriptionNumber,
          consultationId: consultation.id,
          patientId: consultation.patientId,
          facilityId: consultation.facilityId,
          branchId: consultation.branchId,
          prescribedByStaffId: staff.id,
          notes:
            dto.mode === 'INJECTION'
              ? `Doctor-room injection/administered medicine. ${dto.notes ?? ''}`.trim()
              : `Doctor-room direct dispense. ${dto.notes ?? ''}`.trim(),
          statusCode: 'DISPENSED',
          dispensedAt: new Date(),
        },
      });

      prescription = await tx.prescription.update({
        where: { id: prescription.id },
        data: {
          prescriptionNumber: `RX-DIRECT-${String(prescription.id).padStart(6, '0')}`,
        },
      });

      const prescriptionItem = await tx.prescriptionItem.create({
        data: {
          prescriptionId: prescription.id,
          medicineId: dto.medicineId,
          medicineNameSnapshot: stock.medicine.name,
          dosage: dto.dosage,
          route: dto.route,
          frequency: dto.frequency,
          duration: dto.duration,
          quantity: dto.quantity,
          instructions: dto.instructions,
          stockStatusAtPrescribing: stockStatus(
            stock.stockQuantity,
            stock.reorderLevel,
          ),
          statusCode: 'DISPENSED',
        },
      });

      let dispense = await tx.dispense.create({
        data: {
          dispenseNumber: temporaryDispenseNumber,
          prescriptionId: prescription.id,
          patientId: consultation.patientId,
          facilityId: consultation.facilityId,
          branchId: consultation.branchId,
          dispensedByStaffId: staff.id,
          statusCode: 'DISPENSED',
          notes:
            dto.mode === 'INJECTION'
              ? 'Administered in consultation room'
              : 'Directly dispensed in consultation room',
          dispensedAt: new Date(),
        },
      });

      dispense = await tx.dispense.update({
        where: { id: dispense.id },
        data: {
          dispenseNumber: `DSP-DIRECT-${String(dispense.id).padStart(6, '0')}`,
        },
      });

      await tx.dispenseItem.create({
        data: {
          dispenseId: dispense.id,
          prescriptionItemId: prescriptionItem.id,
          medicineId: dto.medicineId,
          quantityPrescribed: dto.quantity,
          quantityDispensed: dto.quantity,
          unitPrice: stock.unitPrice ?? stock.medicine.unitPrice ?? 0,
          lineTotal: (stock.unitPrice ?? stock.medicine.unitPrice ?? 0) * dto.quantity,
          notes: dto.instructions ?? dto.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          moduleName: 'CONSULTATION',
          actionName:
            dto.mode === 'INJECTION'
              ? 'DOCTOR_ROOM_INJECTION_ADMINISTERED'
              : 'DOCTOR_ROOM_DIRECT_DISPENSED',
          entityType: 'PRESCRIPTION',
          entityId: String(prescription.id),
          facilityId: consultation.facilityId,
          branchId: consultation.branchId ?? undefined,
          actorUserId: user.userId,
          actorStaffId: staff.id,
          afterData: JSON.stringify({
            mode: dto.mode,
            consultationId: consultation.id,
            patientId: consultation.patientId,
            medicineId: dto.medicineId,
            quantity: dto.quantity,
          }),
        },
      });

      return tx.prescription.findUnique({
        where: { id: prescription.id },
        include: {
          patient: true,
          prescribedBy: true,
          items: { include: { medicine: true } },
          dispenses: {
            include: {
              dispensedBy: true,
              items: { include: { medicine: true, prescriptionItem: true } },
            },
          },
        },
      });
    });

    const unitPrice = stock.unitPrice ?? stock.medicine.unitPrice ?? 0;
    await this.billingService.addAutoInvoiceItem({
      patientId: consultation.patientId,
      facilityId: consultation.facilityId,
      branchId: consultation.branchId,
      consultationId: consultation.id,
      createdByStaffId: staff.id,
      description:
        dto.mode === 'INJECTION'
          ? `Injection/Administered: ${stock.medicine.name}`
          : `Doctor Room Dispensed: ${stock.medicine.name}`,
      quantity: dto.quantity,
      unitPrice,
      notes: dto.instructions ?? dto.notes,
      sourceModule: 'CONSULTATION_ROOM',
      sourceEntityType: dto.mode,
      sourceEntityId: result?.id ? String(result.id) : String(dto.medicineId),
    });

    await this.notifyLowOrOutOfStock({
      stockId: stock.id,
      facilityId: stock.facilityId,
      branchId: stock.branchId,
      medicineName: stock.medicine.name,
      branchName: stock.branch.name,
      stockQuantity: stock.stockQuantity - dto.quantity,
      reorderLevel: stock.reorderLevel,
    });

    this.safeLogger.info('Doctor-room medicine administration completed', {
      mode: dto.mode,
      consultationId: consultation.id,
      patientId: consultation.patientId,
      medicineId: dto.medicineId,
      quantity: dto.quantity,
      facilityId: consultation.facilityId,
      branchId: consultation.branchId,
      actorUserId: user.userId,
      actorStaffId: staff.id,
      durationMs: Date.now() - startedAt,
    });

    return result;
  }

}
