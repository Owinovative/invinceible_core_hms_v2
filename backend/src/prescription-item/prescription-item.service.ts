import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { UpdatePrescriptionItemDto } from './dto/update-prescription-item.dto';


@Injectable()
export class PrescriptionItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}


  async create(dto: CreatePrescriptionItemDto) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: dto.prescriptionId },
    });


    if (!prescription) {
      throw new NotFoundException(
        `Prescription with id ${dto.prescriptionId} not found`,
      );
    }


    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });


    if (!medicine) {
      throw new NotFoundException(`Medicine with id ${dto.medicineId} not found`);
    }


    return this.prisma.prescriptionItem.create({
      data: {
        prescriptionId: dto.prescriptionId,
        medicineId: dto.medicineId,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration,
        quantity: dto.quantity ?? 1,
        instructions: dto.instructions,
        statusCode: dto.statusCode ?? 'PRESCRIBED',
      },
      include: {
        prescription: true,
        medicine: true,
      },
    });
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


  async update(id: number, dto: UpdatePrescriptionItemDto) {
    await this.findOne(id);


    if (dto.prescriptionId) {
      throw new BadRequestException('Prescription cannot be changed');
    }


    if (dto.medicineId) {
      const medicine = await this.prisma.medicine.findUnique({
        where: { id: dto.medicineId },
      });


      if (!medicine) {
        throw new NotFoundException(`Medicine with id ${dto.medicineId} not found`);
      }
    }


    return this.prisma.prescriptionItem.update({
      where: { id },
      data: {
        medicineId: dto.medicineId,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration,
        quantity: dto.quantity,
        instructions: dto.instructions,
        statusCode: dto.statusCode,
      },
      include: {
        prescription: true,
        medicine: true,
      },
    });
  }


  async remove(id: number) {
    await this.findOne(id);


    return this.prisma.prescriptionItem.delete({
      where: { id },
    });
  }
}
