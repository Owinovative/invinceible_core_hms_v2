import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityService } from '../facility/facility.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    private readonly scopeService: ScopeService,
  ) {}

  private async generatePatientNumber(facilityId: number) {
    const year = new Date().getFullYear();

    const lastPatient = await this.prisma.patient.findFirst({
      where: {
        facilityId,
        patientNumber: {
          startsWith: `PAT-${facilityId}-${year}-`,
        },
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        patientNumber: true,
      },
    });

    const lastSequence = lastPatient?.patientNumber
      ? Number(lastPatient.patientNumber.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `PAT-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  async create(createPatientDto: CreatePatientDto) {
    await this.facilityService.findOne(createPatientDto.facilityId);
    await this.facilityService.assertOperational(createPatientDto.facilityId);

    if (createPatientDto.email) {
      const existingByEmail = await this.prisma.patient.findFirst({
        where: { email: createPatientDto.email },
      });

      if (existingByEmail) {
        throw new BadRequestException('Patient email already exists');
      }
    }

    const patientNumber =
      createPatientDto.patientNumber?.trim() ||
      (await this.generatePatientNumber(createPatientDto.facilityId));

    const existingByNumber = await this.prisma.patient.findFirst({
      where: {
        patientNumber,
      },
    });

    if (existingByNumber) {
      throw new BadRequestException('Patient number already exists');
    }

    return this.prisma.patient.create({
      data: {
        patientNumber,
        firstName: createPatientDto.firstName,
        middleName: createPatientDto.middleName,
        lastName: createPatientDto.lastName,
        gender: createPatientDto.gender,
        dateOfBirth: createPatientDto.dateOfBirth
          ? new Date(createPatientDto.dateOfBirth)
          : undefined,
        phonePrimary: createPatientDto.phonePrimary,
        phoneSecondary: createPatientDto.phoneSecondary,
        email: createPatientDto.email,
        occupation: createPatientDto.occupation,
        facilityId: createPatientDto.facilityId,
        isDeceased: createPatientDto.isDeceased ?? false,
        isActive: createPatientDto.isActive ?? true,
      },
      include: {
        facility: true,
      },
    });
  }

  findAll() {
    return this.prisma.patient.findMany({
      include: {
        facility: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  findAllScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.patient.findMany({
      where: {
        facilityId: scope.facilityId,
      },
      include: {
        facility: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }

    return patient;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }

    this.scopeService.assertFacilityAccess(user, patient.facilityId);

    return patient;
  }

  async findByPatientNumber(patientNumber: string) {
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

    return patient;
  }

  async findByPatientNumberScoped(patientNumber: string, user: RequestUser) {
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

    this.scopeService.assertFacilityAccess(user, patient.facilityId);

    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);

    if (updatePatientDto.facilityId) {
      await this.facilityService.findOne(updatePatientDto.facilityId);
      await this.facilityService.assertOperational(updatePatientDto.facilityId);
    }

    const data: any = {
      ...updatePatientDto,
    };

    if (updatePatientDto.dateOfBirth) {
      data.dateOfBirth = new Date(updatePatientDto.dateOfBirth);
    }

    return this.prisma.patient.update({
      where: { id },
      data,
      include: {
        facility: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.patient.delete({
      where: { id },
    });
  }
}
