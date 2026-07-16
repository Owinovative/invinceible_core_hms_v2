import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientService } from '../patient/patient.service';
import { AppointmentService } from '../appointment/appointment.service';
import { ConsultationService } from '../consultation/consultation.service';
import { StaffService } from '../staff/staff.service';
import { NotificationService } from '../notification/notification.service';
import { CreateWardDto } from './dto/create-ward.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { UpdateWardDto } from './dto/update-ward.dto';
import { UpdateBedDto } from './dto/update-bed.dto';
import { ScopeService } from '../auth/scope.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { TransferAdmissionBedDto } from './dto/transfer-admission-bed.dto';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class IpdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientService: PatientService,
    private readonly appointmentService: AppointmentService,
    private readonly consultationService: ConsultationService,
    private readonly staffService: StaffService,
    private readonly notificationService: NotificationService,
    private readonly scopeService: ScopeService,
    private readonly billingService: BillingService,
  ) {}

  async createWardScoped(createWardDto: CreateWardDto, user: RequestUser) {
    const facilityId =
      createWardDto.facilityId ?? user.homeFacilityId ?? undefined;
    const branchId = createWardDto.branchId ?? user.homeBranchId ?? undefined;

    if (!facilityId) {
      throw new ForbiddenException('A facilityId is required to create a ward');
    }
    this.scopeService.assertBranchAccess(user, facilityId, branchId);

    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, facilityId, isActive: true },
        select: { id: true },
      });
      if (!branch) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    const existing = await this.prisma.ward.findFirst({
      where: {
        OR: [{ code: createWardDto.code }, { name: createWardDto.name }],
      },
    });

    if (existing) {
      throw new BadRequestException('Ward code or name already exists');
    }

    return this.prisma.ward.create({
      data: {
        code: createWardDto.code,
        name: createWardDto.name,
        wardType: createWardDto.wardType,
        capacity: createWardDto.capacity ?? 0,
        facilityId,
        branchId,
        isActive: createWardDto.isActive ?? true,
      },
    });
  }
  async updateBedScoped(
    id: number,
    updateBedDto: UpdateBedDto,
    user: RequestUser,
  ) {
    const scope = this.scopeService.buildReadScope(user);
    const bed = await this.prisma.bed.findFirst({
      where: { id, ...scope },
    });

    if (!bed) {
      throw new NotFoundException(`Bed with id ${id} not found`);
    }

    if (updateBedDto.bedNumber) {
      const existing = await this.prisma.bed.findFirst({
        where: {
          id: { not: id },
          bedNumber: updateBedDto.bedNumber,
        },
      });

      if (existing) {
        throw new BadRequestException('Bed number already exists');
      }
    }

    let ward: {
      id: number;
      facilityId: number | null;
      branchId: number | null;
    } | null = null;

    if (updateBedDto.wardId !== undefined) {
      ward = await this.prisma.ward.findFirst({
        where: { id: updateBedDto.wardId, ...scope },
        select: {
          id: true,
          facilityId: true,
          branchId: true,
        },
      });

      if (!ward) {
        throw new NotFoundException(
          `Ward with id ${updateBedDto.wardId} not found`,
        );
      }
    }

    return this.prisma.bed.update({
      where: { id },
      data: {
        ...(updateBedDto.bedNumber !== undefined && {
          bedNumber: updateBedDto.bedNumber,
        }),
        ...(updateBedDto.bedLabel !== undefined && {
          bedLabel: updateBedDto.bedLabel,
        }),
        ...(updateBedDto.wardId !== undefined && {
          wardId: updateBedDto.wardId,
        }),
        ...(updateBedDto.statusCode !== undefined && {
          statusCode: updateBedDto.statusCode,
        }),
        ...(updateBedDto.isActive !== undefined && {
          isActive: updateBedDto.isActive,
        }),
        ...(ward && {
          facilityId: ward.facilityId ?? undefined,
          branchId: ward.branchId ?? undefined,
        }),
      },
      include: {
        facility: true,
        branch: true,
        ward: true,
      },
    });
  }

  async updateBedStatusScoped(
    id: number,
    statusCode: string,
    user: RequestUser,
  ) {
    const scope = this.scopeService.buildReadScope(user);
    const bed = await this.prisma.bed.findFirst({
      where: { id, ...scope },
    });

    if (!bed) {
      throw new NotFoundException(`Bed with id ${id} not found`);
    }

    const normalizedStatus = (statusCode || '').toUpperCase();

    if (!['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'].includes(normalizedStatus)) {
      throw new BadRequestException('Invalid bed status');
    }

    if (normalizedStatus === 'AVAILABLE') {
      const activeAdmissionUsingBed = await this.prisma.admission.findFirst({
        where: {
          bedId: id,
          statusCode: 'ADMITTED',
        },
      });

      if (activeAdmissionUsingBed) {
        throw new BadRequestException(
          'Cannot mark this bed as AVAILABLE while an admitted patient is still assigned to it',
        );
      }
    }

    if (normalizedStatus === 'MAINTENANCE') {
      const activeAdmissionUsingBed = await this.prisma.admission.findFirst({
        where: {
          bedId: id,
          statusCode: 'ADMITTED',
        },
      });

      if (activeAdmissionUsingBed) {
        throw new BadRequestException(
          'Cannot move this bed to MAINTENANCE while an admitted patient is still assigned to it',
        );
      }
    }

    return this.prisma.bed.update({
      where: { id },
      data: {
        statusCode: normalizedStatus,
      },
      include: {
        facility: true,
        branch: true,
        ward: true,
      },
    });
  }

  getAllWardsScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);
    return this.prisma.ward.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        beds: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async createBedScoped(createBedDto: CreateBedDto, user: RequestUser) {
    const existing = await this.prisma.bed.findFirst({
      where: { bedNumber: createBedDto.bedNumber },
    });

    if (existing) {
      throw new BadRequestException('Bed number already exists');
    }

    const scope = this.scopeService.buildReadScope(user);
    const ward = await this.prisma.ward.findFirst({
      where: { id: createBedDto.wardId, ...scope },
    });

    if (!ward) {
      throw new NotFoundException(
        `Ward with id ${createBedDto.wardId} not found`,
      );
    }

    return this.prisma.bed.create({
      data: {
        facilityId: ward.facilityId ?? undefined,
        branchId: ward.branchId ?? undefined,
        bedNumber: createBedDto.bedNumber,
        bedLabel: createBedDto.bedLabel,
        wardId: createBedDto.wardId,
        statusCode: createBedDto.statusCode ?? 'AVAILABLE',
        isActive: createBedDto.isActive ?? true,
      },
      include: {
        facility: true,
        branch: true,
        ward: true,
      },
    });
  }

  getAllBedsScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);
    return this.prisma.bed.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        ward: true,
      },
      orderBy: { id: 'asc' },
    });
  }
  async updateWardScoped(
    id: number,
    updateWardDto: UpdateWardDto,
    user: RequestUser,
  ) {
    const scope = this.scopeService.buildReadScope(user);
    const ward = await this.prisma.ward.findFirst({
      where: { id, ...scope },
    });

    if (!ward) {
      throw new NotFoundException(`Ward with id ${id} not found`);
    }

    if (updateWardDto.code || updateWardDto.name) {
      const existing = await this.prisma.ward.findFirst({
        where: {
          id: { not: id },
          OR: [
            updateWardDto.code ? { code: updateWardDto.code } : undefined,
            updateWardDto.name ? { name: updateWardDto.name } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (existing) {
        throw new BadRequestException('Ward code or name already exists');
      }
    }

    return this.prisma.ward.update({
      where: { id },
      data: {
        code: updateWardDto.code,
        name: updateWardDto.name,
        wardType: updateWardDto.wardType,
        capacity: updateWardDto.capacity,
        isActive: updateWardDto.isActive,
      },
      include: {
        facility: true,
        branch: true,
        beds: true,
      },
    });
  }

  async createAdmissionScoped(
    createAdmissionDto: CreateAdmissionDto,
    user: RequestUser,
  ) {
    const existing = await this.prisma.admission.findFirst({
      where: { admissionNumber: createAdmissionDto.admissionNumber },
    });

    if (existing) {
      throw new BadRequestException('Admission number already exists');
    }

    const patient = await this.patientService.findOneScoped(
      createAdmissionDto.patientId,
      user,
    );

    let appointment: any = null;
    if (createAdmissionDto.appointmentId) {
      appointment = await this.appointmentService.findOneScoped(
        createAdmissionDto.appointmentId,
        user,
      );
    }
    const existingActiveAdmission = await this.prisma.admission.findFirst({
      where: {
        patientId: createAdmissionDto.patientId,
        statusCode: 'ADMITTED',
      },
      include: {
        ward: true,
        bed: true,
      },
    });

    if (existingActiveAdmission) {
      throw new BadRequestException(
        `Patient already has an active admission (${existingActiveAdmission.admissionNumber})`,
      );
    }

    let consultation: any = null;
    if (createAdmissionDto.consultationId) {
      consultation = await this.consultationService.findOneScoped(
        createAdmissionDto.consultationId,
        user,
      );
    }

    let admittedBy: any = null;
    if (createAdmissionDto.admittedByStaffId) {
      admittedBy = await this.staffService.findOneScoped(
        createAdmissionDto.admittedByStaffId,
        user,
      );
    }

    const scope = this.scopeService.buildReadScope(user);
    const ward = await this.prisma.ward.findFirst({
      where: { id: createAdmissionDto.wardId, ...scope },
    });

    if (!ward) {
      throw new NotFoundException(
        `Ward with id ${createAdmissionDto.wardId} not found`,
      );
    }

    if (createAdmissionDto.bedId) {
      const bed = await this.prisma.bed.findFirst({
        where: {
          id: createAdmissionDto.bedId,
          wardId: createAdmissionDto.wardId,
          ...scope,
        },
      });

      if (!bed) {
        throw new NotFoundException(
          `Bed with id ${createAdmissionDto.bedId} not found`,
        );
      }

      if (bed.statusCode !== 'AVAILABLE') {
        await this.notificationService.create({
          title: 'No Bed Available',
          message: `Admission ${createAdmissionDto.admissionNumber} attempted with unavailable bed ${bed.bedNumber}.`,
          notificationType: 'NO_BED_AVAILABLE',
          severity: 'WARNING',
          moduleName: 'IPD',
          entityType: 'BED',
          entityId: String(bed.id),
          facilityId:
            bed.facilityId ??
            consultation?.facilityId ??
            appointment?.facilityId ??
            patient.facilityId,
          branchId:
            bed.branchId ??
            consultation?.branchId ??
            appointment?.branchId ??
            admittedBy?.branchId ??
            undefined,
          targetStaffId: createAdmissionDto.admittedByStaffId,
        });

        throw new BadRequestException('Selected bed is not available');
      }
    }

    const facilityId =
      consultation?.facilityId ?? appointment?.facilityId ?? patient.facilityId;

    const branchId =
      consultation?.branchId ??
      appointment?.branchId ??
      admittedBy?.branchId ??
      ward.branchId ??
      null;

    this.scopeService.assertBranchAccess(user, facilityId, branchId);

    if (
      ward.facilityId !== facilityId ||
      (ward.branchId && ward.branchId !== branchId)
    ) {
      throw new BadRequestException(
        'Selected ward does not belong to the admission facility and branch',
      );
    }

    const admission = await this.prisma.admission.create({
      data: {
        facilityId,
        branchId,
        admissionNumber: createAdmissionDto.admissionNumber,
        patientId: createAdmissionDto.patientId,
        appointmentId: createAdmissionDto.appointmentId,
        consultationId: createAdmissionDto.consultationId,
        admittedByStaffId: createAdmissionDto.admittedByStaffId,
        wardId: createAdmissionDto.wardId,
        bedId: createAdmissionDto.bedId,
        admissionReason: createAdmissionDto.admissionReason,
        admissionSource: createAdmissionDto.admissionSource,
        expectedDischargeAt: createAdmissionDto.expectedDischargeAt
          ? new Date(createAdmissionDto.expectedDischargeAt)
          : undefined,
        notes: createAdmissionDto.notes,
        statusCode: 'ADMITTED',
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admittedBy: true,
        ward: true,
        bed: true,
      },
    });

    if (createAdmissionDto.bedId) {
      await this.prisma.bed.update({
        where: { id: createAdmissionDto.bedId },
        data: { statusCode: 'OCCUPIED' },
      });
    }

    if (createAdmissionDto.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: createAdmissionDto.appointmentId },
        data: { statusCode: 'ADMITTED' },
      });
    }

    if (createAdmissionDto.consultationId) {
      await this.prisma.consultation.update({
        where: { id: createAdmissionDto.consultationId },
        data: { statusCode: 'ADMITTED' },
      });
    }

    await this.notificationService.create({
      title: 'Admission Created',
      message: `Admission ${admission.admissionNumber} has been created for patient ${admission.patientId}.`,
      notificationType: 'ADMISSION_CREATED',
      severity: 'INFO',
      moduleName: 'IPD',
      entityType: 'ADMISSION',
      entityId: String(admission.id),
      facilityId: admission.facilityId,
      branchId: admission.branchId ?? undefined,
      targetStaffId: admission.admittedByStaffId ?? undefined,
    });

    await this.billingService.billAdmissionBedDay(admission.id, {
      createdByStaffId: admission.admittedByStaffId ?? null,
      notes: 'Automatically posted on admission.',
    });

    return admission;
  }

  getAllAdmissionsScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.admission.findMany({
      where: scope,
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admittedBy: true,
        ward: true,
        bed: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  getAdmissionScope(user: RequestUser) {
    return this.scopeService.buildReadScope(user);
  }

  async getAdmissionByIdScoped(id: number, user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);
    const admission = await this.prisma.admission.findFirst({
      where: { id, ...scope },
      include: {
        facility: true,
        branch: true,
        patient: true,
        appointment: true,
        consultation: true,
        admittedBy: true,
        ward: true,
        bed: true,
      },
    });

    if (!admission) {
      throw new NotFoundException(`Admission with id ${id} not found`);
    }

    return admission;
  }

  async getActiveAdmissionsScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.admission.findMany({
      where: {
        ...scope,
        statusCode: 'ADMITTED',
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        ward: true,
        bed: true,
        admittedBy: true,
      },
      orderBy: { admittedAt: 'desc' },
    });
  }
  async transferAdmissionBedScoped(
    id: number,
    transferDto: TransferAdmissionBedDto,
    user: RequestUser,
  ) {
    const admission = await this.getAdmissionByIdScoped(id, user);

    if ((admission.statusCode || '').toUpperCase() !== 'ADMITTED') {
      throw new BadRequestException(
        'Only active admitted patients can be transferred',
      );
    }

    const scope = this.scopeService.buildReadScope(user);
    const targetWard = await this.prisma.ward.findFirst({
      where: {
        id: transferDto.wardId,
        ...scope,
        facilityId: admission.facilityId,
        ...(admission.branchId ? { branchId: admission.branchId } : {}),
      },
    });

    if (!targetWard) {
      throw new NotFoundException(
        `Ward with id ${transferDto.wardId} not found`,
      );
    }

    let targetBed: {
      id: number;
      bedNumber: string;
      wardId: number;
      statusCode: string | null;
    } | null = null;

    if (transferDto.bedId) {
      targetBed = await this.prisma.bed.findFirst({
        where: {
          id: transferDto.bedId,
          wardId: transferDto.wardId,
          ...scope,
          facilityId: admission.facilityId,
          ...(admission.branchId ? { branchId: admission.branchId } : {}),
        },
        select: {
          id: true,
          bedNumber: true,
          wardId: true,
          statusCode: true,
        },
      });

      if (!targetBed) {
        throw new NotFoundException(
          `Bed with id ${transferDto.bedId} not found`,
        );
      }

      if (targetBed.wardId !== transferDto.wardId) {
        throw new BadRequestException(
          'Selected bed does not belong to the selected ward',
        );
      }

      if ((targetBed.statusCode || '').toUpperCase() !== 'AVAILABLE') {
        throw new BadRequestException('Selected transfer bed is not available');
      }
    }

    if (
      admission.wardId === transferDto.wardId &&
      (admission.bedId ?? null) === (transferDto.bedId ?? null)
    ) {
      throw new BadRequestException(
        'Patient is already assigned to this ward/bed',
      );
    }

    const previousBedId = admission.bedId ?? null;

    const updatedAdmission = await this.prisma.$transaction(async (tx) => {
      if (previousBedId) {
        await tx.bed.update({
          where: { id: previousBedId },
          data: {
            statusCode: 'AVAILABLE',
          },
        });
      }

      if (transferDto.bedId) {
        await tx.bed.update({
          where: { id: transferDto.bedId },
          data: {
            statusCode: 'OCCUPIED',
          },
        });
      }

      const updated = await tx.admission.update({
        where: { id },
        data: {
          wardId: transferDto.wardId,
          bedId: transferDto.bedId ?? null,
          notes: transferDto.notes
            ? [admission.notes, `Transfer note: ${transferDto.notes}`]
                .filter(Boolean)
                .join('\n\n')
            : admission.notes,
        },
        include: {
          facility: true,
          branch: true,
          patient: true,
          appointment: true,
          consultation: true,
          admittedBy: true,
          ward: true,
          bed: true,
        },
      });

      return updated;
    });

    await this.notificationService.create({
      title: 'Patient Transferred',
      message: `Admission ${updatedAdmission.admissionNumber} transferred to ward ${updatedAdmission.ward?.name ?? targetWard.name}${updatedAdmission.bed?.bedNumber ? `, bed ${updatedAdmission.bed.bedNumber}` : ''}.`,
      notificationType: 'ADMISSION_TRANSFERRED',
      severity: 'INFO',
      moduleName: 'IPD',
      entityType: 'ADMISSION',
      entityId: String(updatedAdmission.id),
      facilityId: updatedAdmission.facilityId,
      branchId: updatedAdmission.branchId ?? undefined,
      targetStaffId: updatedAdmission.admittedByStaffId ?? undefined,
    });

    await this.billingService.billAdmissionBedDay(updatedAdmission.id, {
      createdByStaffId: updatedAdmission.admittedByStaffId ?? null,
      notes:
        'Automatically checked after ward or bed transfer. Duplicate same-day charges are ignored.',
    });

    return updatedAdmission;
  }

  async dischargeAdmissionScoped(id: number, user: RequestUser) {
    const admission = await this.getAdmissionByIdScoped(id, user);

    const updated = await this.prisma.admission.update({
      where: { id },
      data: {
        statusCode: 'DISCHARGED',
        dischargedAt: new Date(),
      },
      include: {
        facility: true,
        branch: true,
        patient: true,
        ward: true,
        bed: true,
      },
    });

    if (admission.bedId) {
      await this.prisma.bed.update({
        where: { id: admission.bedId },
        data: { statusCode: 'AVAILABLE' },
      });
    }

    await this.notificationService.create({
      title: 'Patient Discharged',
      message: `Admission ${updated.admissionNumber} has been discharged.`,
      notificationType: 'ADMISSION_DISCHARGED',
      severity: 'INFO',
      moduleName: 'IPD',
      entityType: 'ADMISSION',
      entityId: String(updated.id),
      facilityId: updated.facilityId,
      branchId: updated.branchId ?? undefined,
    });

    return updated;
  }
}
