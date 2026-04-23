import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationService } from '../consultation/consultation.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';


@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultationService: ConsultationService,
    private readonly scopeService: ScopeService,
  ) {}


  private async generatePrescriptionNumber(facilityId: number) {
    const year = new Date().getFullYear();


    const last = await this.prisma.prescription.findFirst({
      where: {
        facilityId,
        prescriptionNumber: {
          startsWith: `PRX-${facilityId}-${year}-`,
        },
      },
      orderBy: { id: 'desc' },
      select: { prescriptionNumber: true },
    });


    const lastSequence = last?.prescriptionNumber
      ? Number(last.prescriptionNumber.split('-').pop())
      : 0;


    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;


    return `PRX-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }


  async create(dto: CreatePrescriptionDto) {
    const consultation = await this.consultationService.findOne(dto.consultationId);


    const existing = await this.prisma.prescription.findFirst({
      where: {
        consultationId: dto.consultationId,
      },
    });


    if (existing) {
      throw new BadRequestException(
        'A prescription already exists for this consultation',
      );
    }


    const prescriptionNumber = await this.generatePrescriptionNumber(
      consultation.facilityId,
    );


    return this.prisma.prescription.create({
      data: {
        prescriptionNumber,
        notes: dto.notes,
        statusCode: dto.statusCode ?? 'PRESCRIBED',
        facilityId: consultation.facilityId,
        branchId: consultation.branchId,
        consultationId: consultation.id,
        patientId: consultation.patientId,
        prescribedByStaffId: consultation.doctorId,
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


  findAllScoped(user: RequestUser) {
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


  async findOne(id: number) {
    const item = await this.prisma.prescription.findUnique({
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
      },
    });


    if (!item) {
      throw new NotFoundException(`Prescription with id ${id} not found`);
    }


    return item;
  }


  async findOneScoped(id: number, user: RequestUser) {
    const item = await this.findOne(id);


    this.scopeService.assertBranchAccess(user, item.facilityId, item.branchId);


    return item;
  }


  async findByConsultationIdScoped(consultationId: number, user: RequestUser) {
    const consultation = await this.consultationService.findOneScoped(
      consultationId,
      user,
    );


    return this.prisma.prescription.findMany({
      where: {
        consultationId: consultation.id,
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
      orderBy: { id: 'desc' },
    });
  }


  async findByPatientIdScoped(patientId: number, user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);


    return this.prisma.prescription.findMany({
      where: {
        ...scope,
        patientId,
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
      orderBy: { id: 'desc' },
    });
  }


  async update(id: number, dto: UpdatePrescriptionDto) {
    await this.findOne(id);


    if (dto.consultationId) {
      throw new BadRequestException('Consultation cannot be changed');
    }


    return this.prisma.prescription.update({
      where: { id },
      data: {
        notes: dto.notes,
        statusCode: dto.statusCode,
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


  async remove(id: number) {
    await this.findOne(id);


    return this.prisma.prescription.delete({
      where: { id },
    });
  }
}
