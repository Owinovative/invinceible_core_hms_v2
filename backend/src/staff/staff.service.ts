import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityService } from '../facility/facility.service';
import { BranchService } from '../branch/branch.service';
import { DepartmentService } from '../department/department.service';
import { RoleService } from '../role/role.service';
import { UserService } from '../user/user.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    private readonly branchService: BranchService,
    private readonly departmentService: DepartmentService,
    private readonly roleService: RoleService,
    private readonly userService: UserService,
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

  async create(createStaffDto: CreateStaffDto) {
    const existingByCode = await this.prisma.staff.findFirst({
      where: { staffCode: createStaffDto.staffCode },
    });

    if (existingByCode) {
      throw new BadRequestException('Staff code already exists');
    }

    if (createStaffDto.email) {
      const existingByEmail = await this.prisma.staff.findFirst({
        where: { email: createStaffDto.email },
      });

      if (existingByEmail) {
        throw new BadRequestException('Staff email already exists');
      }
    }

    await this.facilityService.findOne(createStaffDto.facilityId);
    await this.roleService.findOne(createStaffDto.roleId);

    if (createStaffDto.branchId) {
      const branch = await this.branchService.findOne(createStaffDto.branchId);

      if (branch.facilityId !== createStaffDto.facilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    if (createStaffDto.departmentId) {
      const department = await this.departmentService.findOne(
        createStaffDto.departmentId,
      );

      if (department.facilityId !== createStaffDto.facilityId) {
        throw new BadRequestException(
          'Selected department does not belong to the selected facility',
        );
      }

      if (
        createStaffDto.branchId &&
        department.branchId &&
        department.branchId !== createStaffDto.branchId
      ) {
        throw new BadRequestException(
          'Selected department does not belong to the selected branch',
        );
      }
    }

    if (createStaffDto.userId) {
      const user = await this.userService.findOne(createStaffDto.userId);

      if (
        user.homeFacilityId &&
        user.homeFacilityId !== createStaffDto.facilityId
      ) {
        throw new BadRequestException(
          'Linked user belongs to a different home facility',
        );
      }

      if (
        createStaffDto.branchId &&
        user.homeBranchId &&
        user.homeBranchId !== createStaffDto.branchId
      ) {
        throw new BadRequestException(
          'Linked user belongs to a different home branch',
        );
      }
    }

    return this.prisma.staff.create({
      data: {
        staffCode: createStaffDto.staffCode,
        firstName: createStaffDto.firstName,
        lastName: createStaffDto.lastName,
        email: createStaffDto.email,
        phone: createStaffDto.phone,
        gender: createStaffDto.gender,
        designation: createStaffDto.designation,
        nationalIdNumber: createStaffDto.nationalIdNumber,
        nationalIdImageUrl: createStaffDto.nationalIdImageUrl,
        passportPhotoUrl: createStaffDto.passportPhotoUrl,
        clinicianRegistrationNumber:
          createStaffDto.clinicianRegistrationNumber,
        clinicianBoard: createStaffDto.clinicianBoard,
        isClinician: createStaffDto.isClinician ?? false,
        isPrescriber: createStaffDto.isPrescriber ?? false,
        canLogin: createStaffDto.canLogin ?? true,
        isActive: createStaffDto.isActive ?? true,
        facilityId: createStaffDto.facilityId,
        branchId: createStaffDto.branchId,
        departmentId: createStaffDto.departmentId,
        roleId: createStaffDto.roleId,
        userId: createStaffDto.userId,
      },
      include: {
        facility: true,
        branch: true,
        department: true,
        role: true,
        user: true,
      },
    });
  }

  findAll() {
    return this.prisma.staff.findMany({
      include: {
        facility: true,
        branch: true,
        department: true,
        role: true,
        user: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  findAllScoped(user: RequestUser) {
    return this.prisma.staff.findMany({
      where: this.buildScopedWhere(user),
      include: {
        facility: true,
        branch: true,
        department: true,
        role: true,
        user: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        facility: true,
        branch: true,
        department: true,
        role: true,
        user: true,
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with id ${id} not found`);
    }

    return staff;
  }

  async findOneScoped(id: number, user: RequestUser) {
    const staff = await this.findOne(id);
    const scopedRows = await this.prisma.staff.count({
      where: {
        id,
        ...this.buildScopedWhere(user),
      },
    });

    if (scopedRows === 0) {
      throw new NotFoundException(`Staff with id ${id} not found`);
    }

    return staff;
  }

  async findByStaffCode(staffCode: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { staffCode },
      include: {
        facility: true,
        branch: true,
        department: true,
        role: true,
        user: true,
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with code ${staffCode} not found`);
    }

    return staff;
  }

  async update(id: number, updateStaffDto: UpdateStaffDto) {
    const existing = await this.findOne(id);

    if (updateStaffDto.email) {
      const emailExists = await this.prisma.staff.findFirst({
        where: {
          email: updateStaffDto.email,
          NOT: { id },
        },
      });

      if (emailExists) {
        throw new BadRequestException('Staff email already exists');
      }
    }

    if (updateStaffDto.staffCode) {
      const codeExists = await this.prisma.staff.findFirst({
        where: {
          staffCode: updateStaffDto.staffCode,
          NOT: { id },
        },
      });

      if (codeExists) {
        throw new BadRequestException('Staff code already exists');
      }
    }

    const targetFacilityId = updateStaffDto.facilityId ?? existing.facilityId;
    const targetBranchId = updateStaffDto.branchId ?? existing.branchId;

    if (updateStaffDto.facilityId) {
      await this.facilityService.findOne(updateStaffDto.facilityId);
    }

    if (updateStaffDto.roleId) {
      await this.roleService.findOne(updateStaffDto.roleId);
    }

    if (updateStaffDto.branchId) {
      const branch = await this.branchService.findOne(updateStaffDto.branchId);

      if (branch.facilityId !== targetFacilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected facility',
        );
      }
    }

    if (updateStaffDto.departmentId) {
      const department = await this.departmentService.findOne(
        updateStaffDto.departmentId,
      );

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

    if (updateStaffDto.userId) {
      const user = await this.userService.findOne(updateStaffDto.userId);

      if (user.homeFacilityId && user.homeFacilityId !== targetFacilityId) {
        throw new BadRequestException(
          'Linked user belongs to a different home facility',
        );
      }

      if (
        targetBranchId &&
        user.homeBranchId &&
        user.homeBranchId !== targetBranchId
      ) {
        throw new BadRequestException(
          'Linked user belongs to a different home branch',
        );
      }
    }

    return this.prisma.staff.update({
      where: { id },
      data: {
        staffCode: updateStaffDto.staffCode,
        firstName: updateStaffDto.firstName,
        lastName: updateStaffDto.lastName,
        email: updateStaffDto.email,
        phone: updateStaffDto.phone,
        gender: updateStaffDto.gender,
        designation: updateStaffDto.designation,
        nationalIdNumber: updateStaffDto.nationalIdNumber,
        nationalIdImageUrl: updateStaffDto.nationalIdImageUrl,
        passportPhotoUrl: updateStaffDto.passportPhotoUrl,
        clinicianRegistrationNumber:
          updateStaffDto.clinicianRegistrationNumber,
        clinicianBoard: updateStaffDto.clinicianBoard,
        isClinician: updateStaffDto.isClinician,
        isPrescriber: updateStaffDto.isPrescriber,
        canLogin: updateStaffDto.canLogin,
        isActive: updateStaffDto.isActive,
        facilityId: updateStaffDto.facilityId,
        branchId: updateStaffDto.branchId,
        departmentId: updateStaffDto.departmentId,
        roleId: updateStaffDto.roleId,
        userId: updateStaffDto.userId,
      },
      include: {
        facility: true,
        branch: true,
        department: true,
        role: true,
        user: true,
      },
    });
  }

  async remove(id: number) {
    const staff = await this.findOne(id);

    if (staff.isActive) {
      throw new BadRequestException(
        'Active staff cannot be deleted. Deactivate the staff record first.',
      );
    }

    return this.prisma.staff.delete({
      where: { id },
    });
  }

  async secureUpdate(
    id: number,
    updateStaffDto: UpdateStaffDto,
    actor: RequestUser,
  ) {
    const staff = await this.findOne(id);

    if (
      updateStaffDto.isActive === false &&
      (actor.staffId === id || actor.userId === staff.userId)
    ) {
      throw new BadRequestException('You cannot deactivate yourself');
    }

    return this.update(id, updateStaffDto);
  }

  async secureRemove(id: number, actor: RequestUser) {
    const staff = await this.findOne(id);

    if (actor.staffId === id || actor.userId === staff.userId) {
      throw new BadRequestException('You cannot delete yourself');
    }

    return this.remove(id);
  }
}
