import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityService } from '../facility/facility.service';
import { BranchService } from '../branch/branch.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    private readonly branchService: BranchService,
  ) {}

  private async generateDepartmentCode(facilityId: number) {
    const year = new Date().getFullYear();

    const lastDepartment = await this.prisma.department.findFirst({
      where: {
        facilityId,
        code: {
          startsWith: `DEP-${facilityId}-${year}-`,
        },
      },
      orderBy: { id: 'desc' },
      select: { code: true },
    });

    const lastSequence = lastDepartment?.code
      ? Number(lastDepartment.code.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `DEP-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  async create(dto: CreateDepartmentDto) {
    await this.facilityService.findOne(dto.facilityId);

    if (dto.branchId) {
      const branch = await this.branchService.findOne(dto.branchId);

      if (branch.facilityId !== dto.facilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    const code = dto.code?.trim() || (await this.generateDepartmentCode(dto.facilityId));

    const existing = await this.prisma.department.findFirst({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException('Department code already exists');
    }

    return this.prisma.department.create({
      data: {
        code,
        name: dto.name,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
      },
      include: {
        facility: true,
        branch: true,
      },
    });
  }

  findAll() {
    return this.prisma.department.findMany({
      include: {
        facility: true,
        branch: true,
        staff: true,
        clinics: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  findByFacility(facilityId: number) {
    return this.prisma.department.findMany({
      where: { facilityId },
      include: {
        facility: true,
        branch: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  findByBranch(branchId: number) {
    return this.prisma.department.findMany({
      where: { branchId },
      include: {
        facility: true,
        branch: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        staff: true,
        clinics: true,
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with id ${id} not found`);
    }

    return department;
  }

  async findByCode(code: string) {
    const department = await this.prisma.department.findFirst({
      where: { code },
      include: {
        facility: true,
        branch: true,
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with code ${code} not found`);
    }

    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const existing = await this.findOne(id);

    const targetFacilityId = dto.facilityId ?? existing.facilityId;

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

    if (dto.code) {
      const codeExists = await this.prisma.department.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (codeExists) {
        throw new BadRequestException('Department code already exists');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        isActive: dto.isActive,
      },
      include: {
        facility: true,
        branch: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.department.delete({
      where: { id },
    });
  }
}
