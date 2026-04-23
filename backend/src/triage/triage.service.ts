import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { StaffService } from '../staff/staff.service';
import { FacilityService } from '../facility/facility.service';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateTriageDto } from './dto/create-triage.dto';
import { UpdateTriageDto } from './dto/update-triage.dto';
import { AppointmentService} from '../appointment/appointment.service';

@Injectable()
export class TriageService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly patientService: PatientService,
  private readonly staffService: StaffService,
  private readonly facilityService: FacilityService,
  private readonly appointmentService: AppointmentService,
  private readonly scopeService: ScopeService,
) {}


  private async generateTriageNumber(facilityId: number) {
    const year = new Date().getFullYear();

    const lastTriage = await this.prisma.triage.findFirst({
      where: {
        facilityId,
        triageNumber: {
          startsWith: `TRI-${facilityId}-${year}-`,
        },
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        triageNumber: true,
      },
    });

    const lastSequence = lastTriage?.triageNumber
      ? Number(lastTriage.triageNumber.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `TRI-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  private calculateBmi(weightKg?: number, heightCm?: number) {
    if (!weightKg || !heightCm || heightCm <= 0) {
      return undefined;
    }

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    return Number(bmi.toFixed(2));
  }

  async create(dto: CreateTriageDto, user: RequestUser) {
    this.scopeService.assertBranchAccess(user, dto.facilityId, dto.branchId);
    await this.facilityService.assertOperational(dto.facilityId);

    const patient = await this.patientService.findOne(dto.patientId);

    if (patient.facilityId !== dto.facilityId) {
      throw new BadRequestException(
        'Selected patient does not belong to the selected facility',
      );
    }

    if (dto.performedByStaffId) {
      await this.staffService.findOne(dto.performedByStaffId);
    }

    if (dto.routedDoctorId) {
      const doctor = await this.staffService.findOne(dto.routedDoctorId);

      if (!doctor.isClinician) {
        throw new BadRequestException('Selected routed doctor is not a clinician');
      }
    }

    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: dto.clinicId },
      });

      if (!clinic) {
        throw new NotFoundException(`Clinic with id ${dto.clinicId} not found`);
      }

      if (clinic.facilityId !== dto.facilityId) {
        throw new BadRequestException(
          'Selected clinic does not belong to the selected facility',
        );
      }

      if (dto.branchId && clinic.branchId && clinic.branchId !== dto.branchId) {
        throw new BadRequestException(
          'Selected clinic does not belong to the selected branch',
        );
      }
    }

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
      });

      if (!appointment) {
        throw new NotFoundException(
          `Appointment with id ${dto.appointmentId} not found`,
        );
      }

      if (appointment.patientId !== dto.patientId) {
        throw new BadRequestException(
          'Selected appointment does not belong to the selected patient',
        );
      }
    }

    const triageNumber = await this.generateTriageNumber(dto.facilityId);
    const bmi = this.calculateBmi(dto.weightKg, dto.heightCm);

    return this.prisma.triage.create({
      data: {
        triageNumber,
        arrivalType: dto.arrivalType ?? 'WALK_IN',
        chiefComplaint: dto.chiefComplaint,
        temperatureC: dto.temperatureC,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        pulseRate: dto.pulseRate,
        respiratoryRate: dto.respiratoryRate,
        oxygenSaturation: dto.oxygenSaturation,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bmi,
        painScore: dto.painScore,
        triagePriority: dto.triagePriority ?? 'NORMAL',
        statusCode: dto.statusCode ?? 'WAITING_TRIAGE',
        notes: dto.notes,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        patientId: dto.patientId,
        clinicId: dto.clinicId,
        appointmentId: dto.appointmentId,
        performedByStaffId: dto.performedByStaffId,
        routedDoctorId: dto.routedDoctorId,
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        clinic: true,
        appointment: true,
        performedBy: true,
        routedDoctor: true,
      },
    });
  }

  findAllScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.triage.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        patient: true,
        clinic: true,
        appointment: true,
        performedBy: true,
        routedDoctor: true,
      },
      orderBy: { id: 'desc' },
    });
  }
async findReadyForDoctorScoped(user: RequestUser) {
  const scope = this.scopeService.buildReadScope(user);


  const items = await this.prisma.triage.findMany({
    where: {
      ...scope,
      statusCode: 'READY_FOR_DOCTOR',
    },
    include: {
      facility: true,
      branch: true,
      patient: true,
      clinic: true,
      appointment: true,
      performedBy: true,
      routedDoctor: true,
    },
    orderBy: {
      completedAt: 'asc',
    },
  });


  const priorityRank: Record<string, number> = {
    CRITICAL: 0,
    EMERGENCY: 1,
    URGENT: 2,
    NORMAL: 3,
  };


  return items.sort((a, b) => {
  const aRank = priorityRank[a.triagePriority ?? 'NORMAL'] ?? 99;
  const bRank = priorityRank[b.triagePriority ?? 'NORMAL'] ?? 99;


  if (aRank !== bRank) {
    return aRank - bRank;
  }


  const aTime = new Date(a.completedAt ?? a.arrivedAt ?? 0).getTime();
  const bTime = new Date(b.completedAt ?? b.arrivedAt ?? 0).getTime();


  return aTime - bTime;
});
}

  findWaitingScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.triage.findMany({
      where: {
        ...scope,
        statusCode: {
          in: ['WAITING_TRIAGE', 'IN_TRIAGE'],
        },
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        clinic: true,
        appointment: true,
        performedBy: true,
        routedDoctor: true,
      },
      orderBy: { arrivedAt: 'asc' },
    });
  }
async findByAppointmentIdScoped(appointmentId: number, user: RequestUser) {
  const triage = await this.prisma.triage.findFirst({
    where: { appointmentId },
    include: {
      facility: true,
      branch: true,
      patient: true,
      clinic: true,
      appointment: true,
      performedBy: true,
      routedDoctor: true,
    },
    orderBy: { id: 'desc' },
  });


  if (!triage) {
    throw new NotFoundException(
      `No triage record found for appointment ${appointmentId}`,
    );
  }


  this.scopeService.assertBranchAccess(user, triage.facilityId, triage.branchId);


  return triage;
}

  async findOneScoped(id: number, user: RequestUser) {
    const triage = await this.prisma.triage.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        patient: true,
        clinic: true,
        appointment: true,
        performedBy: true,
        routedDoctor: true,
      },
    });

    if (!triage) {
      throw new NotFoundException(`Triage record with id ${id} not found`);
    }

    this.scopeService.assertBranchAccess(
      user,
      triage.facilityId,
      triage.branchId,
    );

    return triage;
  }

  async startTriage(id: number, user: RequestUser) {
    const existing = await this.findOneScoped(id, user);

    return this.prisma.triage.update({
      where: { id },
      data: {
        statusCode: 'IN_TRIAGE',
        startedAt: existing.startedAt ?? new Date(),
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        clinic: true,
        appointment: true,
        performedBy: true,
        routedDoctor: true,
      },
    });
  }

  async completeTriage(id: number, dto: UpdateTriageDto, user: RequestUser) {
  const existing = await this.findOneScoped(id, user);
  await this.facilityService.assertOperational(existing.facilityId);


  if (dto.routedDoctorId) {
    const doctor = await this.staffService.findOne(dto.routedDoctorId);
    if (!doctor.isClinician) {
      throw new BadRequestException('Selected routed doctor is not a clinician');
    }
  }


  if (dto.clinicId) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });


    if (!clinic) {
      throw new NotFoundException(`Clinic with id ${dto.clinicId} not found`);
    }


    if (clinic.facilityId !== existing.facilityId) {
      throw new BadRequestException(
        'Selected clinic does not belong to the selected facility',
      );
    }


    if (existing.branchId && clinic.branchId && clinic.branchId !== existing.branchId) {
      throw new BadRequestException(
        'Selected clinic does not belong to the selected branch',
      );
    }
  }


  const weightKg = dto.weightKg ?? existing.weightKg ?? undefined;
  const heightCm = dto.heightCm ?? existing.heightCm ?? undefined;
  const bmi = this.calculateBmi(weightKg, heightCm);


  const finalPriority =
    dto.triagePriority ?? existing.triagePriority ?? 'NORMAL';


  let appointmentId = dto.appointmentId ?? existing.appointmentId ?? undefined;


  if (!appointmentId) {
    const createdAppointment = await this.appointmentService.createFromTriage({
      facilityId: existing.facilityId,
      branchId: existing.branchId,
      patientId: existing.patientId,
      doctorId: dto.routedDoctorId ?? existing.routedDoctorId ?? null,
      clinicId: dto.clinicId ?? existing.clinicId ?? null,
      triageId: existing.id,
      triagePriority: finalPriority,
      visitReason: dto.chiefComplaint ?? existing.chiefComplaint ?? null,
      notes: dto.notes ?? existing.notes ?? null,
    });


    appointmentId = createdAppointment.id;
  }


  return this.prisma.triage.update({
    where: { id },
    data: {
      chiefComplaint: dto.chiefComplaint ?? existing.chiefComplaint,
      temperatureC: dto.temperatureC ?? existing.temperatureC,
      systolicBp: dto.systolicBp ?? existing.systolicBp,
      diastolicBp: dto.diastolicBp ?? existing.diastolicBp,
      pulseRate: dto.pulseRate ?? existing.pulseRate,
      respiratoryRate: dto.respiratoryRate ?? existing.respiratoryRate,
      oxygenSaturation: dto.oxygenSaturation ?? existing.oxygenSaturation,
      weightKg,
      heightCm,
      bmi,
      painScore: dto.painScore ?? existing.painScore,
      triagePriority: finalPriority,
      notes: dto.notes ?? existing.notes,
      clinicId: dto.clinicId ?? existing.clinicId,
      appointmentId,
      performedByStaffId:
        dto.performedByStaffId ?? existing.performedByStaffId,
      routedDoctorId: dto.routedDoctorId ?? existing.routedDoctorId,
      statusCode: dto.statusCode ?? 'READY_FOR_DOCTOR',
      completedAt: new Date(),
      startedAt: existing.startedAt ?? new Date(),
    },
    include: {
      facility: true,
      branch: true,
      patient: true,
      clinic: true,
      appointment: true,
      performedBy: true,
      routedDoctor: true,
    },
  });
}

}
