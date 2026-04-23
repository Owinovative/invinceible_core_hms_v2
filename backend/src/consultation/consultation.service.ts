import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentService } from '../appointment/appointment.service';
import { PatientService } from '../patient/patient.service';
import { StaffService } from '../staff/staff.service';
import { FacilityService } from '../facility/facility.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { ScopeService } from '../auth/scope.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class ConsultationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentService: AppointmentService,
    private readonly patientService: PatientService,
    private readonly staffService: StaffService,
    private readonly facilityService: FacilityService,
    private readonly scopeService: ScopeService,
  ) {}

  async create(createConsultationDto: CreateConsultationDto) {
    const existingByNumber = await this.prisma.consultation.findFirst({
      where: {
        consultationNumber: createConsultationDto.consultationNumber,
      },
    });

    if (existingByNumber) {
      throw new BadRequestException('Consultation number already exists');
    }

    const existingByAppointment = await this.prisma.consultation.findFirst({
      where: {
        appointmentId: createConsultationDto.appointmentId,
      },
    });

    if (existingByAppointment) {
      throw new BadRequestException(
        'This appointment already has a consultation',
      );
    }

    const appointment = await this.appointmentService.findOne(
      createConsultationDto.appointmentId,
    );

    await this.facilityService.assertOperational(appointment.facilityId);

    await this.patientService.findOne(createConsultationDto.patientId);
    await this.staffService.findOne(createConsultationDto.doctorId);

    const consultation = await this.prisma.consultation.create({
      data: {
        facilityId: appointment.facilityId,
        branchId: appointment.branchId,
        consultationNumber: createConsultationDto.consultationNumber,
        appointmentId: createConsultationDto.appointmentId,
        patientId: createConsultationDto.patientId,
        doctorId: createConsultationDto.doctorId,
        chiefComplaint: createConsultationDto.chiefComplaint,
        historyOfPresenting: createConsultationDto.historyOfPresenting,
        examinationFindings: createConsultationDto.examinationFindings,
        diagnosis: createConsultationDto.diagnosis,
        treatmentPlan: createConsultationDto.treatmentPlan,
        notes: createConsultationDto.notes,
        statusCode: createConsultationDto.statusCode ?? 'IN_PROGRESS',
      },
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
    });

    await this.prisma.appointment.update({
      where: { id: createConsultationDto.appointmentId },
      data: {
        statusCode: 'IN_CONSULTATION',
        startedAt: new Date(),
      },
    });

    return consultation;
  }

  findAll() {
    return this.prisma.consultation.findMany({
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  findAllScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.consultation.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with id ${id} not found`);
    }

    return consultation;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const consultation = await this.findOne(id);

    this.scopeService.assertBranchAccess(
      user,
      consultation.facilityId,
      consultation.branchId,
    );

    return consultation;
  }

  async findByConsultationNumber(consultationNumber: string) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { consultationNumber },
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
    });

    if (!consultation) {
      throw new NotFoundException(
        `Consultation with number ${consultationNumber} not found`,
      );
    }

    return consultation;
  }

  async findByConsultationNumberScoped(
    consultationNumber: string,
    user: RequestUser,
  ) {
    const consultation = await this.findByConsultationNumber(consultationNumber);

    this.scopeService.assertBranchAccess(
      user,
      consultation.facilityId,
      consultation.branchId,
    );

    return consultation;
  }

  async findByAppointmentId(appointmentId: number) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { appointmentId },
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
    });

    if (!consultation) {
      throw new NotFoundException(
        `No consultation found for appointment ${appointmentId}`,
      );
    }

    return consultation;
  }

  async findByAppointmentIdScoped(
    appointmentId: number,
    user: RequestUser,
  ) {
    const consultation = await this.findByAppointmentId(appointmentId);

    this.scopeService.assertBranchAccess(
      user,
      consultation.facilityId,
      consultation.branchId,
    );

    return consultation;
  }

  async update(id: number, updateConsultationDto: UpdateConsultationDto) {
    const existing = await this.findOne(id);

    let appointment: any = null;
    if (updateConsultationDto.appointmentId) {
      appointment = await this.appointmentService.findOne(
        updateConsultationDto.appointmentId,
      );
    }

    if (updateConsultationDto.patientId) {
      await this.patientService.findOne(updateConsultationDto.patientId);
    }

    if (updateConsultationDto.doctorId) {
      await this.staffService.findOne(updateConsultationDto.doctorId);
    }

    const facilityId = appointment?.facilityId ?? existing.facilityId;
    await this.facilityService.assertOperational(facilityId);

    return this.prisma.consultation.update({
      where: { id },
      data: {
        ...updateConsultationDto,
        facilityId,
        branchId: appointment?.branchId ?? existing.branchId,
      },
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
    });
  }

  async complete(id: number) {
    const consultation = await this.findOne(id);
    await this.facilityService.assertOperational(consultation.facilityId);

    const updated = await this.prisma.consultation.update({
      where: { id },
      data: {
        statusCode: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        facility: true,
        branch: true,
        appointment: true,
        patient: true,
        doctor: true,
      },
    });

    await this.prisma.appointment.update({
      where: { id: consultation.appointmentId },
      data: {
        statusCode: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return updated;
  }
async findByPatientId(patientId: number) {
  await this.patientService.findOne(patientId);


  return this.prisma.consultation.findMany({
    where: { patientId },
    include: {
      facility: true,
      branch: true,
      appointment: true,
      patient: true,
      doctor: true,
    },
    orderBy: { id: 'desc' },
  });
}
async findByPatientIdScoped(patientId: number, user: RequestUser) {
  const items = await this.findByPatientId(patientId);


  return items.filter((item) => {
    try {
      this.scopeService.assertBranchAccess(user, item.facilityId, item.branchId);
      return true;
    } catch {
      return false;
    }
  });
}

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.consultation.delete({
      where: { id },
    });
  }
}
