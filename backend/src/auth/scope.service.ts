import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from './interfaces/request-user.interface';

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async enrichRequestUser(user: RequestUser): Promise<RequestUser> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        role: true,
        staff: true,
        homeFacility: true,
        homeBranch: true,
        branchAccesses: {
          where: { isActive: true },
          include: {
            branch: true,
          },
        },
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('Authenticated user not found');
    }

    const isSuperAdmin = dbUser.role?.code === 'SUPER_ADMIN';

    if (!isSuperAdmin && dbUser.homeFacilityId && dbUser.homeFacility?.isActive === false) {
      throw new ForbiddenException(
        'Your facility is inactive. Operational access is suspended.',
      );
    }

    return {
      userId: dbUser.id,
      username: dbUser.username,
      roleId: dbUser.roleId,
      roleCode: dbUser.role?.code ?? null,
      homeFacilityId: dbUser.homeFacilityId,
      homeFacilityName: dbUser.homeFacility?.name ?? null,
      homeBranchId: dbUser.homeBranchId,
      homeBranchName: dbUser.homeBranch?.name ?? null,
      canAccessAllBranchesInFacility: dbUser.canAccessAllBranchesInFacility,
      allowedBranchIds: dbUser.branchAccesses.map((x) => x.branchId),
      allowedBranches: dbUser.branchAccesses.map((x) => ({
        id: x.branch.id,
        name: x.branch.name,
        code: x.branch.code ?? null,
        facilityId: x.branch.facilityId,
      })),
      staffId: dbUser.staff?.id ?? null,
    };
  }

  buildReadScope(user: RequestUser) {
    if (!user.homeFacilityId) {
      throw new ForbiddenException('User has no home facility assigned');
    }

    const scope: any = {
      facilityId: user.homeFacilityId,
    };

    if (user.canAccessAllBranchesInFacility) {
      return scope;
    }

    const allowedBranchIds = user.allowedBranchIds ?? [];
    const branchIds = new Set<number>();

    if (user.homeBranchId) {
      branchIds.add(user.homeBranchId);
    }

    for (const id of allowedBranchIds) {
      branchIds.add(id);
    }

    if (branchIds.size === 0) {
      throw new ForbiddenException('User has no allowed branch access');
    }

    scope.branchId = {
      in: Array.from(branchIds),
    };

    return scope;
  }

  assertFacilityAccess(user: RequestUser, facilityId: number) {
    if (!user.homeFacilityId || user.homeFacilityId !== facilityId) {
      throw new ForbiddenException('You cannot access this facility');
    }
  }

  assertBranchAccess(
    user: RequestUser,
    facilityId: number,
    branchId?: number | null,
  ) {
    this.assertFacilityAccess(user, facilityId);

    if (!branchId) {
      return;
    }

    if (user.canAccessAllBranchesInFacility) {
      return;
    }

    const allowed = new Set<number>([
      ...(user.allowedBranchIds ?? []),
      ...(user.homeBranchId ? [user.homeBranchId] : []),
    ]);

    if (!allowed.has(branchId)) {
      throw new ForbiddenException('You cannot access this branch');
    }
  }
}
