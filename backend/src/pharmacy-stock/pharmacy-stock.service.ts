import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityService } from '../facility/facility.service';
import { BranchService } from '../branch/branch.service';
import { CreateBranchMedicineStockDto } from './dto/create-branch-medicine-stock.dto';
import { UpdateBranchMedicineStockDto } from './dto/update-branch-medicine-stock.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { RestockBranchMedicineDto } from './dto/restock-branch-medicine.dto';



@Injectable()
export class PharmacyStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    private readonly branchService: BranchService,
    private readonly scopeService: ScopeService,
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
    async restockBranchMedicine(
      stockId: number,
      dto: RestockBranchMedicineDto,
    ) {
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
      throw new NotFoundException(`Medicine with id ${dto.medicineId} not found`);
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

  findAllScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.branchMedicineStock.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
      orderBy: { id: 'asc' },
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

  async findByBranchScoped(branchId: number, user: RequestUser) {
    this.scopeService.assertBranchAccess(user, user.homeFacilityId!, branchId);

    return this.prisma.branchMedicineStock.findMany({
      where: {
        facilityId: user.homeFacilityId!,
        branchId,
      },
      include: {
        facility: true,
        branch: true,
        medicine: true,
      },
      orderBy: { id: 'asc' },
    });
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
    const where: any = {
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
