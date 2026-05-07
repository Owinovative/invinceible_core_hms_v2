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

  private prescriptionInclude() {
    return {
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
    };
  }

  private async audit(params: {
    actionName: string;
    prescription: { id: number; facilityId: number; branchId?: number | null };
    user?: RequestUser;
    beforeData?: unknown;
    afterData?: unknown;
  }) {
    await this.prisma.auditLog
      .create({
        data: {
          moduleName: 'PRESCRIPTION',
          actionName: params.actionName,
          entityType: 'PRESCRIPTION',
          entityId: String(params.prescription.id),
          facilityId: params.prescription.facilityId,
          branchId: params.prescription.branchId ?? undefined,
          actorUserId: params.user?.userId,
          actorStaffId: params.user?.staffId ?? undefined,
          beforeData: params.beforeData
            ? JSON.stringify(params.beforeData)
            : undefined,
          afterData: params.afterData
            ? JSON.stringify(params.afterData)
            : undefined,
        },
      })
      .catch(() => undefined);
  }

  async create(dto: CreatePrescriptionDto, user?: RequestUser) {
    const consultation = await this.consultationService.findOne(
      dto.consultationId,
    );

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        consultation.facilityId,
        consultation.branchId,
      );
    }

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

    const created = await this.prisma.prescription.create({
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
      include: this.prescriptionInclude(),
    });

    await this.audit({
      actionName: 'PRESCRIPTION_CREATED',
      prescription: created,
      user,
      afterData: {
        prescriptionNumber: created.prescriptionNumber,
        consultationId: created.consultationId,
        patientId: created.patientId,
      },
    });

    return created;
  }

  findAllScoped(user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.prescription.findMany({
      where: scope,
      include: this.prescriptionInclude(),
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.prescription.findUnique({
      where: { id },
      include: this.prescriptionInclude(),
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
      include: this.prescriptionInclude(),
      orderBy: { id: 'desc' },
      take: 50,
    });
  }

  async findByPatientIdScoped(patientId: number, user: RequestUser) {
    const scope = this.scopeService.buildReadScope(user);

    return this.prisma.prescription.findMany({
      where: {
        ...scope,
        patientId,
      },
      include: this.prescriptionInclude(),
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async update(id: number, dto: UpdatePrescriptionDto, user?: RequestUser) {
    const existing = await this.findOne(id);

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        existing.facilityId,
        existing.branchId,
      );
    }

    if (dto.consultationId) {
      throw new BadRequestException('Consultation cannot be changed');
    }

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        notes: dto.notes,
        statusCode: dto.statusCode,
      },
      include: this.prescriptionInclude(),
    });

    await this.audit({
      actionName: 'PRESCRIPTION_UPDATED',
      prescription: existing,
      user,
      beforeData: {
        notes: existing.notes,
        statusCode: existing.statusCode,
      },
      afterData: {
        notes: updated.notes,
        statusCode: updated.statusCode,
      },
    });

    return updated;
  }

  async remove(id: number, user?: RequestUser) {
    const existing = await this.findOne(id);

    if (user) {
      this.scopeService.assertBranchAccess(
        user,
        existing.facilityId,
        existing.branchId,
      );
    }

    await this.audit({
      actionName: 'PRESCRIPTION_DELETED',
      prescription: existing,
      user,
      beforeData: {
        prescriptionNumber: existing.prescriptionNumber,
        statusCode: existing.statusCode,
        itemCount: existing.items.length,
      },
    });

    return this.prisma.prescription.delete({
      where: { id },
    });
  }
}
