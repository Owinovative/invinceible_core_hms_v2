import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RoleService } from '../role/role.service';
import { FacilityService } from '../facility/facility.service';
import { BranchService } from '../branch/branch.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
    private readonly facilityService: FacilityService,
    private readonly branchService: BranchService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingByUsername = await this.prisma.user.findFirst({
      where: { username: createUserDto.username },
    });

    if (existingByUsername) {
      throw new BadRequestException('Username already exists');
    }

    if (createUserDto.email) {
      const existingByEmail = await this.prisma.user.findFirst({
        where: { email: createUserDto.email },
      });

      if (existingByEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    await this.roleService.findOne(createUserDto.roleId);

    if (createUserDto.homeFacilityId) {
      await this.facilityService.findOne(createUserDto.homeFacilityId);
    }

    if (createUserDto.homeBranchId) {
      const branch = await this.branchService.findOne(
        createUserDto.homeBranchId,
      );

      if (
        createUserDto.homeFacilityId &&
        branch.facilityId !== createUserDto.homeFacilityId
      ) {
        throw new BadRequestException(
          'Selected home branch does not belong to the selected home facility',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        username: createUserDto.username,
        email: createUserDto.email,
        passwordHash: hashedPassword,
        fullName: createUserDto.fullName,
        roleId: createUserDto.roleId,
        homeFacilityId: createUserDto.homeFacilityId,
        homeBranchId: createUserDto.homeBranchId,
        canAccessAllBranchesInFacility:
          createUserDto.canAccessAllBranchesInFacility ?? false,
        isActive: createUserDto.isActive ?? true,
      },
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username },
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async findAuthUserByUsername(username: string) {
    const identifier = username.trim();

    return this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
      },
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: {
          include: {
            facility: true,
            branch: true,
            department: true,
            role: true,
          },
        },
        branchAccesses: {
          where: { isActive: true },
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });
  }

  async comparePassword(plainPassword: string, passwordHash: string) {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  async updateLastLogin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    if (updateUserDto.roleId) {
      await this.roleService.findOne(updateUserDto.roleId);
    }

    if (updateUserDto.homeFacilityId) {
      await this.facilityService.findOne(updateUserDto.homeFacilityId);
    }

    if (updateUserDto.homeBranchId) {
      const branch = await this.branchService.findOne(
        updateUserDto.homeBranchId,
      );

      if (
        updateUserDto.homeFacilityId &&
        branch.facilityId !== updateUserDto.homeFacilityId
      ) {
        throw new BadRequestException(
          'Selected home branch does not belong to the selected home facility',
        );
      }
    }

    if (updateUserDto.email) {
      const existingByEmail = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          NOT: { id },
        },
      });

      if (existingByEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    if (updateUserDto.username) {
      const existingByUsername = await this.prisma.user.findFirst({
        where: {
          username: updateUserDto.username,
          NOT: { id },
        },
      });

      if (existingByUsername) {
        throw new BadRequestException('Username already exists');
      }
    }

    const data: Prisma.UserUncheckedUpdateInput = {
      username: updateUserDto.username,
      email: updateUserDto.email,
      fullName: updateUserDto.fullName,
      roleId: updateUserDto.roleId,
      homeFacilityId: updateUserDto.homeFacilityId,
      homeBranchId: updateUserDto.homeBranchId,
      canAccessAllBranchesInFacility:
        updateUserDto.canAccessAllBranchesInFacility,
    };

    if (updateUserDto.isActive === true) {
      data.isActive = true;
      data.failedLoginAttempts = 0;
      data.lockedAt = null;
      data.lockReason = null;
      data.pendingDeactivationAt = null;
      data.pendingDeactivationRequestedById = null;
      data.pendingDeactivationReason = null;
    } else if (updateUserDto.isActive === false) {
      data.isActive = false;
    }

    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      data.sessionVersion = {
        increment: 1,
      };
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });
  }

  async adminResetPassword(id: number, dto: AdminResetPasswordDto) {
    await this.findOne(id);

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedAt: null,
        lockReason: null,
        sessionVersion: {
          increment: 1,
        },
      },
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const user = await this.findOne(id);

    if (user.isActive) {
      throw new BadRequestException(
        'Active users cannot be deleted. Deactivate the user first.',
      );
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async secureUpdate(id: number, updateUserDto: UpdateUserDto, actor: RequestUser) {
    const target = await this.findOne(id);

    if (actor.userId === id && updateUserDto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    if (
      updateUserDto.isActive === false &&
      target.role?.code === 'SUPER_ADMIN'
    ) {
      return this.requestSuperAdminDeactivation(id, actor);
    }

    return this.update(id, updateUserDto);
  }

  async requestSuperAdminDeactivation(id: number, actor: RequestUser) {
    const target = await this.findOne(id);

    if (actor.userId === id) {
      throw new BadRequestException('You cannot deactivate yourself');
    }

    if (target.role?.code !== 'SUPER_ADMIN') {
      return this.update(id, { isActive: false });
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        pendingDeactivationAt: new Date(),
        pendingDeactivationRequestedById: actor.userId,
        pendingDeactivationReason:
          'Super admin deactivation requires acceptance on next login',
      },
      include: {
        role: true,
        homeFacility: true,
        homeBranch: true,
        staff: true,
        branchAccesses: {
          include: {
            facility: true,
            branch: true,
          },
        },
      },
    });
  }

  async acceptOwnDeactivation(actor: RequestUser) {
    const target = await this.findOne(actor.userId);

    if (!target.pendingDeactivationAt) {
      throw new BadRequestException('No pending deactivation request found');
    }

    return this.prisma.user.update({
      where: { id: actor.userId },
      data: {
        isActive: false,
        pendingDeactivationAt: null,
        pendingDeactivationRequestedById: null,
        pendingDeactivationReason: null,
        sessionVersion: { increment: 1 },
      },
    });
  }

  async secureRemove(id: number, actor: RequestUser) {
    if (actor.userId === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    return this.remove(id);
  }
}
