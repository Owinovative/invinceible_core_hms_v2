import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityService } from '../facility/facility.service';
import { UserService } from '../user/user.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { GrantUserBranchAccessDto } from './dto/grant-user-branch-access.dto';
import { SetUserHomeBranchDto } from './dto/set-user-home-branch.dto';

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityService: FacilityService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  private async generateBranchCode(facilityId: number) {
    const year = new Date().getFullYear();

    const lastBranch = await this.prisma.branch.findFirst({
      where: {
        facilityId,
        code: {
          startsWith: `BR-${facilityId}-${year}-`,
        },
      },
      orderBy: { id: 'desc' },
      select: { code: true },
    });

    const lastSequence = lastBranch?.code
      ? Number(lastBranch.code.split('-').pop())
      : 0;

    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `BR-${facilityId}-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  async create(dto: CreateBranchDto) {
    await this.facilityService.findOne(dto.facilityId);

    const code = dto.code?.trim() || (await this.generateBranchCode(dto.facilityId));

    const existing = await this.prisma.branch.findFirst({
      where: {
        code,
      },
    });

    if (existing) {
      throw new BadRequestException('Branch code already exists');
    }

    if (dto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { facilityId: dto.facilityId },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.create({
      data: {
        code,
        name: dto.name,
        facilityId: dto.facilityId,
        county: dto.county,
        town: dto.town,
        country: dto.country,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        postalAddress: dto.postalAddress,
        timezone: dto.timezone,
        currency: dto.currency,
        mpesaShortcode: dto.mpesaShortcode,
        mpesaPaybill: dto.mpesaPaybill,
        mpesaAccountNumber: dto.mpesaAccountNumber,
        mpesaTillNumber: dto.mpesaTillNumber,
        mpesaPochiNumber: dto.mpesaPochiNumber,
        latitude: dto.latitude,
        longitude: dto.longitude,
        mapLocationLabel: dto.mapLocationLabel,
        googleMapsUrl: dto.googleMapsUrl,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
      include: {
        facility: true,
      },
    });
  }

  findAll() {
    return this.prisma.branch.findMany({
      include: {
        facility: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  findByFacility(facilityId: number) {
    return this.prisma.branch.findMany({
      where: { facilityId },
      include: {
        facility: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }

    return branch;
  }

  async findByCode(code: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { code },
      include: {
        facility: true,
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with code ${code} not found`);
    }

    return branch;
  }

  async update(id: number, dto: UpdateBranchDto) {
    const existing = await this.findOne(id);

    if (dto.facilityId) {
      await this.facilityService.findOne(dto.facilityId);
    }

    const targetFacilityId = dto.facilityId ?? existing.facilityId;

    if (dto.code) {
      const codeExists = await this.prisma.branch.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (codeExists) {
        throw new BadRequestException('Branch code already exists');
      }
    }

    if (dto.isDefault) {
      await this.prisma.branch.updateMany({
        where: {
          facilityId: targetFacilityId,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        facilityId: dto.facilityId,
        county: dto.county,
        town: dto.town,
        country: dto.country,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        postalAddress: dto.postalAddress,
        timezone: dto.timezone,
        currency: dto.currency,
        mpesaShortcode: dto.mpesaShortcode,
        mpesaPaybill: dto.mpesaPaybill,
        mpesaAccountNumber: dto.mpesaAccountNumber,
        mpesaTillNumber: dto.mpesaTillNumber,
        mpesaPochiNumber: dto.mpesaPochiNumber,
        latitude: dto.latitude,
        longitude: dto.longitude,
        mapLocationLabel: dto.mapLocationLabel,
        googleMapsUrl: dto.googleMapsUrl,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
      include: {
        facility: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.branch.delete({
      where: { id },
    });
  }

  async grantUserBranchAccess(dto: GrantUserBranchAccessDto) {
    await this.userService.findOne(dto.userId);
    await this.facilityService.findOne(dto.facilityId);
    const branch = await this.findOne(dto.branchId);

    if (branch.facilityId !== dto.facilityId) {
      throw new BadRequestException(
        'Selected branch does not belong to the selected facility',
      );
    }

    const existing = await this.prisma.userBranchAccess.findFirst({
      where: {
        userId: dto.userId,
        branchId: dto.branchId,
      },
    });

    if (existing) {
      return this.prisma.userBranchAccess.update({
        where: { id: existing.id },
        data: {
          isActive: dto.isActive ?? true,
        },
        include: {
          user: true,
          facility: true,
          branch: true,
        },
      });
    }

    return this.prisma.userBranchAccess.create({
      data: {
        userId: dto.userId,
        facilityId: dto.facilityId,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
      },
      include: {
        user: true,
        facility: true,
        branch: true,
      },
    });
  }

  async getUserBranchAccesses(userId: number) {
    await this.userService.findOne(userId);

    return this.prisma.userBranchAccess.findMany({
      where: { userId },
      include: {
        facility: true,
        branch: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async setUserHomeBranch(dto: SetUserHomeBranchDto) {
    await this.userService.findOne(dto.userId);

    if (dto.homeFacilityId) {
      await this.facilityService.findOne(dto.homeFacilityId);
    }

    if (dto.homeBranchId) {
      const branch = await this.findOne(dto.homeBranchId);

      if (dto.homeFacilityId && branch.facilityId !== dto.homeFacilityId) {
        throw new BadRequestException(
          'Selected home branch does not belong to the selected home facility',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: dto.userId },
      data: {
        homeFacilityId: dto.homeFacilityId,
        homeBranchId: dto.homeBranchId,
        canAccessAllBranchesInFacility: dto.canAccessAllBranchesInFacility,
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
}
