import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { StaffService } from '../staff/staff.service';
import { FacilityService } from '../facility/facility.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientService: PatientService,
    private readonly staffService: StaffService,
    private readonly facilityService: FacilityService,
    private readonly scopeService: ScopeService,
  ) {}

  private async generateAppointmentNumber(facilityId: number) {
    const year = new Date().getFullYear();

    const lastAppointment = await this.prisma.appointment.findFirst({
      where: {
        facilityId,
        appointmentNumber: {
          startsWith: `APT-${facilityId}-${year}-`,
        },
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        appointmentNumber: true,
      },
    });

    const lastSequence = lastAppointment?.appointmentNumber
      ? Number(lastAppointment.appointmentNumber.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `APT-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  async create(createAppointmentDto: CreateAppointmentDto) {
    const patient = await this.patientService.findOne(createAppointmentDto.patientId);

    let doctor: any = null;
    if (createAppointmentDto.doctorId) {
      doctor = await this.staffService.findOne(createAppointmentDto.doctorId);
    }

    let clinic: any = null;
    if (createAppointmentDto.clinicId) {
      const foundClinic = await this.prisma.clinic.findUnique({
        where: { id: createAppointmentDto.clinicId },
      });

      if (!foundClinic) {
        throw new NotFoundException(
          `Clinic with id ${createAppointmentDto.clinicId} not found`,
        );
      }

      clinic = foundClinic;
    }

    const facilityId = clinic?.facilityId ?? patient.facilityId;
    const branchId = clinic?.branchId ?? doctor?.branchId ?? null;

    await this.facilityService.assertOperational(facilityId);

    const appointmentNumber =
      createAppointmentDto.appointmentNumber?.trim() ||
      (await this.generateAppointmentNumber(facilityId));

    const existingAppointment = await this.prisma.appointment.findFirst({
      where: { appointmentNumber },
    });

    if (existingAppointment) {
      throw new BadRequestException('Appointment number already exists');
    }

    return this.prisma.appointment.create({
      data: {
        facilityId,
        branchId,
        appointmentNumber,
        appointmentDate: new Date(createAppointmentDto.appointmentDate),
        patientId: createAppointmentDto.patientId,
        doctorId: createAppointmentDto.doctorId,
        clinicId: createAppointmentDto.clinicId,
        startTime: createAppointmentDto.startTime,
        endTime: createAppointmentDto.endTime,
        visitReason: createAppointmentDto.visitReason,
        statusCode: createAppointmentDto.statusCode ?? 'BOOKED',
        triagePriority: createAppointmentDto.triagePriority,
        notes: createAppointmentDto.notes,
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }

  findAll() {
    return this.prisma.appointment.findMany({
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }

    return appointment;
  }

  async findByAppointmentNumber(appointmentNumber: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { appointmentNumber },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with number ${appointmentNumber} not found`,
      );
    }

    return appointment;
  }

  async update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    const existing = await this.findOne(id);

    let patient: any = null;
    if (updateAppointmentDto.patientId) {
      patient = await this.patientService.findOne(updateAppointmentDto.patientId);
    }

    let doctor: any = null;
    if (updateAppointmentDto.doctorId) {
      doctor = await this.staffService.findOne(updateAppointmentDto.doctorId);
    }

    let clinic: any = null;
    if (updateAppointmentDto.clinicId) {
      clinic = await this.prisma.clinic.findUnique({
        where: { id: updateAppointmentDto.clinicId },
      });

      if (!clinic) {
        throw new NotFoundException(
          `Clinic with id ${updateAppointmentDto.clinicId} not found`,
        );
      }
    }

    const data: any = {
      ...updateAppointmentDto,
    };

    if (updateAppointmentDto.appointmentDate) {
      data.appointmentDate = new Date(updateAppointmentDto.appointmentDate);
    }

    data.facilityId = clinic?.facilityId ?? patient?.facilityId ?? existing.facilityId;
    data.branchId = clinic?.branchId ?? doctor?.branchId ?? existing.branchId;

    await this.facilityService.assertOperational(data.facilityId);

    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }

  findAllScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.appointment.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async findOneScoped(id: number, user: RequestUser) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }

    this.scopeService.assertBranchAccess(
      user,
      appointment.facilityId,
      appointment.branchId,
    );

    return appointment;
  }

  async findByAppointmentNumberScoped(
    appointmentNumber: string,
    user: RequestUser,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { appointmentNumber },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with number ${appointmentNumber} not found`,
      );
    }

    this.scopeService.assertBranchAccess(
      user,
      appointment.facilityId,
      appointment.branchId,
    );

    return appointment;
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  async checkIn(id: number) {
    await this.findOne(id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        statusCode: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }

  async startConsultation(id: number) {
    await this.findOne(id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        statusCode: 'IN_CONSULTATION',
        startedAt: new Date(),
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }
async createFromTriage(params: {
  facilityId: number;
  branchId?: number | null;
  patientId: number;
  doctorId?: number | null;
  clinicId?: number | null;
  triageId: number;
  triagePriority?: string | null;
  visitReason?: string | null;
  notes?: string | null;
}) {
  await this.facilityService.assertOperational(params.facilityId);


  await this.patientService.findOne(params.patientId);


  if (params.doctorId) {
    await this.staffService.findOne(params.doctorId);
  }


  if (params.clinicId) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: params.clinicId },
    });


    if (!clinic) {
      throw new NotFoundException(`Clinic with id ${params.clinicId} not found`);
    }


    if (clinic.facilityId !== params.facilityId) {
      throw new BadRequestException(
        'Selected clinic does not belong to the selected facility',
      );
    }


    if (params.branchId && clinic.branchId && clinic.branchId !== params.branchId) {
      throw new BadRequestException(
        'Selected clinic does not belong to the selected branch',
      );
    }
  }


  const existing = await this.prisma.appointment.findFirst({
    where: {
      patientId: params.patientId,
      statusCode: {
        in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR', 'IN_CONSULTATION'],
      },
      OR: [
        { notes: { contains: `TRIAGE_ID:${params.triageId}` } },
      ],
    },
    include: {
      facility: true,
      branch: true,
      patient: true,
      doctor: true,
      clinic: true,
    },
  });


  if (existing) {
    return existing;
  }


  const appointmentNumber = await this.generateAppointmentNumber(params.facilityId);


  return this.prisma.appointment.create({
    data: {
      facilityId: params.facilityId,
      branchId: params.branchId ?? null,
      appointmentNumber,
      appointmentDate: new Date(),
      patientId: params.patientId,
      doctorId: params.doctorId ?? undefined,
      clinicId: params.clinicId ?? undefined,
      visitReason: params.visitReason ?? undefined,
      triagePriority: params.triagePriority ?? undefined,
      statusCode: 'READY_FOR_DOCTOR',
      notes: [params.notes, `TRIAGE_ID:${params.triageId}`]
        .filter(Boolean)
        .join('\n'),
    },
    include: {
      facility: true,
      branch: true,
      patient: true,
      doctor: true,
      clinic: true,
    },
  });
}

  async completeAppointment(id: number) {
    await this.findOne(id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        statusCode: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }
}
