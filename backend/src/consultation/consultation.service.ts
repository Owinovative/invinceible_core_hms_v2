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
import { SafeLoggerService } from '../resilience/safe-logger.service';

@Injectable()
export class ConsultationService {
  private readonly slowWorkspaceMs = Number(
    process.env.SLOW_CONSULTATION_WORKSPACE_MS ??
      process.env.SLOW_REQUEST_MS ??
      1000,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentService: AppointmentService,
    private readonly patientService: PatientService,
    private readonly staffService: StaffService,
    private readonly facilityService: FacilityService,
    private readonly scopeService: ScopeService,
    private readonly safeLogger: SafeLoggerService,
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

  async getWorkspaceScoped(id: number, user: RequestUser) {
    const startedAt = Date.now();
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      select: {
        id: true,
        consultationNumber: true,
        appointmentId: true,
        patientId: true,
        doctorId: true,
        facilityId: true,
        branchId: true,
        chiefComplaint: true,
        historyOfPresenting: true,
        examinationFindings: true,
        diagnosis: true,
        treatmentPlan: true,
        notes: true,
        statusCode: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        facility: {
          select: { id: true, code: true, name: true },
        },
        branch: {
          select: { id: true, code: true, name: true },
        },
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            gender: true,
            phonePrimary: true,
            dateOfBirth: true,
          },
        },
        doctor: {
          select: {
            id: true,
            staffCode: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            statusCode: true,
            appointmentDate: true,
            triagePriority: true,
            visitReason: true,
          },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with id ${id} not found`);
    }

    this.scopeService.assertBranchAccess(
      user,
      consultation.facilityId,
      consultation.branchId,
    );

    const scopeWhere = this.scopeService.buildReadScope(user);
    const [
      latestTriage,
      recentConsultations,
      consultationPrescriptions,
      patientPrescriptions,
      labOrders,
      activeAdmission,
    ] = await Promise.all([
        this.prisma.triage.findFirst({
        where: {
          appointmentId: consultation.appointmentId,
          patientId: consultation.patientId,
          facilityId: consultation.facilityId,
          ...(consultation.branchId ? { branchId: consultation.branchId } : {}),
        },
        select: {
          id: true,
          triageNumber: true,
          arrivalType: true,
          chiefComplaint: true,
          triagePriority: true,
          temperatureC: true,
          systolicBp: true,
          diastolicBp: true,
          pulseRate: true,
          respiratoryRate: true,
          oxygenSaturation: true,
          weightKg: true,
          heightCm: true,
          bmi: true,
          painScore: true,
          notes: true,
          statusCode: true,
          arrivedAt: true,
          startedAt: true,
          completedAt: true,
          clinic: { select: { id: true, name: true } },
          routedDoctor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { arrivedAt: 'desc' },
      }),
      this.prisma.consultation.findMany({
        where: {
          ...scopeWhere,
          patientId: consultation.patientId,
          NOT: { id: consultation.id },
        },
        select: {
          id: true,
          consultationNumber: true,
          chiefComplaint: true,
          diagnosis: true,
          treatmentPlan: true,
          statusCode: true,
          startedAt: true,
          completedAt: true,
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 8,
      }),
      this.prisma.prescription.findMany({
        where: { consultationId: consultation.id },
        select: this.prescriptionWorkspaceSelect(),
        orderBy: { prescribedAt: 'desc' },
        take: 6,
      }),
      this.prisma.prescription.findMany({
        where: {
          ...scopeWhere,
          patientId: consultation.patientId,
          NOT: { consultationId: consultation.id },
        },
        select: this.prescriptionWorkspaceSelect(),
        orderBy: { prescribedAt: 'desc' },
        take: 8,
      }),
      this.prisma.labOrder.findMany({
        where: {
          facilityId: consultation.facilityId,
          ...(consultation.branchId ? { branchId: consultation.branchId } : {}),
          patientId: consultation.patientId,
          OR: [
            { appointmentId: consultation.appointmentId },
            { encounterRef: consultation.consultationNumber },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          urgency: true,
          status: true,
          clinicalNotes: true,
          appointmentId: true,
          encounterRef: true,
          createdAt: true,
          requestedBy: {
            select: { id: true, firstName: true, lastName: true, staffCode: true },
          },
          items: {
            select: {
              id: true,
              status: true,
              instructions: true,
              test: {
                select: { id: true, testName: true, category: true },
              },
              results: {
                select: {
                  id: true,
                  resultValue: true,
                  remarks: true,
                  recordedAt: true,
                  attachmentFileName: true,
                  attachmentMimeType: true,
                  attachmentDataUrl: true,
                },
                orderBy: { recordedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.admission.findFirst({
        where: {
          ...scopeWhere,
          consultationId: consultation.id,
          statusCode: 'ADMITTED',
        },
        select: {
          id: true,
          admissionNumber: true,
          statusCode: true,
          admittedAt: true,
          ward: { select: { id: true, name: true } },
          bed: { select: { id: true, bedNumber: true, bedLabel: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: { admittedAt: 'desc' },
      }),
    ]);

    const durationMs = Date.now() - startedAt;
    if (durationMs >= this.slowWorkspaceMs) {
      this.safeLogger.warn('Slow consultation workspace load', {
        consultationId: id,
        facilityId: consultation.facilityId,
        branchId: consultation.branchId,
        durationMs,
        prescriptions: consultationPrescriptions.length,
        patientPrescriptionHistory: patientPrescriptions.length,
        labOrders: labOrders.length,
      });
    }

    return {
      consultation,
      latestTriage,
      recentConsultations,
      consultationPrescriptions,
      patientPrescriptions,
      labOrders,
      activeAdmission,
      meta: {
        durationMs,
        limitedHistory: true,
      },
    };
  }

  private prescriptionWorkspaceSelect() {
    return {
      id: true,
      prescriptionNumber: true,
      notes: true,
      statusCode: true,
      prescribedAt: true,
      dispensedAt: true,
      consultationId: true,
      patientId: true,
      prescribedByStaffId: true,
      facilityId: true,
      branchId: true,
      prescribedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffCode: true,
          designation: true,
        },
      },
      items: {
        select: {
          id: true,
          prescriptionId: true,
          medicineId: true,
          dosage: true,
          route: true,
          frequency: true,
          duration: true,
          quantity: true,
          instructions: true,
          medicineNameSnapshot: true,
          stockStatusAtPrescribing: true,
          acceptedAlternativeForMedicineId: true,
          statusCode: true,
          medicine: {
            select: {
              id: true,
              code: true,
              name: true,
              dosageForm: true,
              strength: true,
              manufacturer: true,
              unitPrice: true,
              stockQuantity: true,
              reorderLevel: true,
              isActive: true,
            },
          },
        },
      },
      dispenses: {
        select: {
          id: true,
          dispenseNumber: true,
          statusCode: true,
          notes: true,
          dispensedAt: true,
          dispensedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              staffCode: true,
            },
          },
          items: {
            select: {
              id: true,
              prescriptionItemId: true,
              medicineId: true,
              quantityPrescribed: true,
              quantityDispensed: true,
              unitPrice: true,
              lineTotal: true,
              notes: true,
              medicine: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  dosageForm: true,
                  strength: true,
                },
              },
            },
          },
        },
        orderBy: { dispensedAt: 'desc' as const },
        take: 4,
      },
    };
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
