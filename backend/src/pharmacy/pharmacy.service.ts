import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { StaffService } from '../staff/staff.service';
import { ConsultationService } from '../consultation/consultation.service';
import { NotificationService } from '../notification/notification.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { BillingService } from '../billing/billing.service';

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
  ) {}


  async createMedicine(createMedicineDto: CreateMedicineDto) {
    const existing = await this.prisma.medicine.findFirst({
      where: {
        OR: [{ code: createMedicineDto.code }, { name: createMedicineDto.name }],
      },
    });

    if (existing) {
      throw new BadRequestException('Medicine code or name already exists');
    }

    return this.prisma.medicine.create({
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
  }

  getAllMedicines() {
    return this.prisma.medicine.findMany({
      orderBy: { id: 'asc' },
    });
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

  async createPrescription(createPrescriptionDto: CreatePrescriptionDto) {
    const latestPrescription = await this.prisma.prescription.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const nextNumber = (latestPrescription?.id ?? 0) + 1;
    const generatedPrescriptionNumber = `RX-${String(nextNumber).padStart(6, '0')}`;


    const consultation = await this.consultationService.findOne(
      createPrescriptionDto.consultationId,
    );

    const patient = await this.patientService.findOne(
      createPrescriptionDto.patientId,
    );

    await this.staffService.findOne(createPrescriptionDto.prescribedByStaffId);

    if (consultation.patientId !== patient.id) {
      throw new BadRequestException(
        'Consultation does not belong to the selected patient',
      );
    }

    for (const item of createPrescriptionDto.items) {
      const medicine = await this.prisma.medicine.findUnique({
        where: { id: item.medicineId },
      });

      if (!medicine) {
        throw new NotFoundException(
          `Medicine with id ${item.medicineId} not found`,
        );
      }
    }

    return this.prisma.prescription.create({
      data: {
        facilityId: consultation.facilityId,
        branchId: consultation.branchId,
        prescriptionNumber: generatedPrescriptionNumber,
        consultationId: createPrescriptionDto.consultationId,
        patientId: createPrescriptionDto.patientId,
        prescribedByStaffId: createPrescriptionDto.prescribedByStaffId,
        notes: createPrescriptionDto.notes,
        statusCode: 'PRESCRIBED',
        items: {
          create: createPrescriptionDto.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity ?? 1,
            instructions: item.instructions,
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
  });
}

 async dispensePrescription(id: number, user: RequestUser) {
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
  const itemsToDispense = prescription.items.filter(
    (item) =>
      !nonDispensableItemStatuses.includes(
        (item.statusCode || '').toUpperCase(),
      ),
  );

  if (itemsToDispense.length === 0) {
    throw new BadRequestException(
      'All prescription items have already been dispensed.',
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

    if (branchStock.stockQuantity < item.quantity) {
      throw new BadRequestException(
        `Insufficient branch stock for ${branchStock.medicine.name} at ${branchStock.branch.name}. Available: ${branchStock.stockQuantity}, required: ${item.quantity}`,
      );
    }
  }

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
        statusCode: 'DISPENSED',
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
            gte: item.quantity,
          },
        },
        data: {
          stockQuantity: {
            decrement: item.quantity,
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

      await tx.prescriptionItem.update({
        where: { id: item.id },
        data: {
          statusCode: 'DISPENSED',
        },
      });

      const unitPrice = updatedStock.unitPrice ?? item.medicine?.unitPrice ?? 0;

      await tx.dispenseItem.create({
        data: {
          dispenseId: createdDispense.id,
          prescriptionItemId: item.id,
          medicineId: item.medicineId,
          quantityPrescribed: item.quantity,
          quantityDispensed: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
          notes: item.instructions,
        },
      });

      billedItems.push({
        description: `Drug Dispensed: ${item.medicine?.name || `Medicine #${item.medicineId}`}`,
        quantity: item.quantity,
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
        statusCode: 'DISPENSED',
        dispensedAt: new Date(),
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

  await this.notificationService.create({
    title: 'Prescription Dispensed',
    message: `Prescription ${prescription.prescriptionNumber} has been dispensed.`,
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


}
