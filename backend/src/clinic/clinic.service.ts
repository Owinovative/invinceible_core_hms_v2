import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityService } from '../facility/facility.service';
import { BranchService } from '../branch/branch.service';
import { DepartmentService } from '../department/department.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class ClinicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    private readonly branchService: BranchService,
    private readonly departmentService: DepartmentService,
  ) {}

  private buildScopedWhere(user: RequestUser) {
    if (user.roleCode === 'SUPER_ADMIN') {
      return {};
    }

    if (!user.homeFacilityId) {
      return { id: -1 };
    }

    const where: any = {
      facilityId: user.homeFacilityId,
    };

    if (!user.canAccessAllBranchesInFacility) {
      const branchIds = new Set<number>();

      if (user.homeBranchId) {
        branchIds.add(user.homeBranchId);
      }

      for (const branchId of user.allowedBranchIds ?? []) {
        branchIds.add(branchId);
      }

      if (branchIds.size > 0) {
        where.OR = [
          { branchId: null },
          { branchId: { in: Array.from(branchIds) } },
        ];
      }
    }

    return where;
  }

  private async generateClinicCode(facilityId: number) {
    const year = new Date().getFullYear();

    const lastClinic = await this.prisma.clinic.findFirst({
      where: {
        facilityId,
        code: {
          startsWith: `CLN-${facilityId}-${year}-`,
        },
      },
      orderBy: { id: 'desc' },
      select: { code: true },
    });

    const lastSequence = lastClinic?.code
      ? Number(lastClinic.code.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `CLN-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  async create(dto: CreateClinicDto) {
    await this.facilityService.findOne(dto.facilityId);

    const code =
      dto.code?.trim() || (await this.generateClinicCode(dto.facilityId));

    const existing = await this.prisma.clinic.findFirst({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException('Clinic code already exists');
    }

    if (dto.branchId) {
      const branch = await this.branchService.findOne(dto.branchId);

      if (branch.facilityId !== dto.facilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    const department = await this.departmentService.findOne(dto.departmentId);

    if (department.facilityId !== dto.facilityId) {
      throw new BadRequestException(
        'Selected department does not belong to the selected facility',
      );
    }

    if (
      dto.branchId &&
      department.branchId &&
      department.branchId !== dto.branchId
    ) {
      throw new BadRequestException(
        'Selected department does not belong to the selected branch',
      );
    }

    return this.prisma.clinic.create({
      data: {
        code,
        name: dto.name,
        clinicType: dto.clinicType,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        departmentId: dto.departmentId,
        roomLocation: dto.roomLocation,
        phoneExtension: dto.phoneExtension,
        consultationMinutes: dto.consultationMinutes ?? 15,
        maxDailyCapacity: dto.maxDailyCapacity ?? 20,
        serviceStartTime: dto.serviceStartTime,
        serviceEndTime: dto.serviceEndTime,
        isWalkInAllowed: dto.isWalkInAllowed ?? true,
        isReferralRequired: dto.isReferralRequired ?? false,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
      },
      include: {
        facility: true,
        branch: true,
        department: true,
      },
    });
  }

  findAll() {
    return this.prisma.clinic.findMany({
      include: {
        facility: true,
        branch: true,
        department: true,
        appointments: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  findAllScoped(user: RequestUser) {
    return this.prisma.clinic.findMany({
      where: this.buildScopedWhere(user),
      include: {
        facility: true,
        branch: true,
        department: true,
        appointments: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  findByFacility(facilityId: number) {
    return this.prisma.clinic.findMany({
      where: { facilityId },
      include: {
        facility: true,
        branch: true,
        department: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  findByBranch(branchId: number) {
    return this.prisma.clinic.findMany({
      where: { branchId },
      include: {
        facility: true,
        branch: true,
        department: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        department: true,
        appointments: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    return clinic;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const clinic = await this.findOne(id);
    const scopedRows = await this.prisma.clinic.count({
      where: {
        id,
        ...this.buildScopedWhere(user),
      },
    });

    if (scopedRows === 0) {
      throw new NotFoundException(`Clinic with id ${id} not found`);
    }

    return clinic;
  }

  async findByCode(code: string) {
    const clinic = await this.prisma.clinic.findFirst({
      where: { code },
      include: {
        facility: true,
        branch: true,
        department: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic with code ${code} not found`);
    }

    return clinic;
  }

  async update(id: number, dto: UpdateClinicDto) {
    const existing = await this.findOne(id);

    const targetFacilityId = dto.facilityId ?? existing.facilityId;
    const targetBranchId = dto.branchId ?? existing.branchId;

    if (dto.code) {
      const codeExists = await this.prisma.clinic.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (codeExists) {
        throw new BadRequestException('Clinic code already exists');
      }
    }

    if (dto.facilityId) {
      await this.facilityService.findOne(dto.facilityId);
    }

    if (dto.branchId) {
      const branch = await this.branchService.findOne(dto.branchId);

      if (branch.facilityId !== targetFacilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    if (dto.departmentId) {
      const department = await this.departmentService.findOne(dto.departmentId);

      if (department.facilityId !== targetFacilityId) {
        throw new BadRequestException(
          'Selected department does not belong to the selected facility',
        );
      }

      if (
        targetBranchId &&
        department.branchId &&
        department.branchId !== targetBranchId
      ) {
        throw new BadRequestException(
          'Selected department does not belong to the selected branch',
        );
      }
    }

    return this.prisma.clinic.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        clinicType: dto.clinicType,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        departmentId: dto.departmentId,
        roomLocation: dto.roomLocation,
        phoneExtension: dto.phoneExtension,
        consultationMinutes: dto.consultationMinutes,
        maxDailyCapacity: dto.maxDailyCapacity,
        serviceStartTime: dto.serviceStartTime,
        serviceEndTime: dto.serviceEndTime,
        isWalkInAllowed: dto.isWalkInAllowed,
        isReferralRequired: dto.isReferralRequired,
        isActive: dto.isActive,
        notes: dto.notes,
      },
      include: {
        facility: true,
        branch: true,
        department: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.clinic.delete({
      where: { id },
    });
  }
}
