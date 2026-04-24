import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from './interfaces/request-user.interface';

type FacilityBranchScope = {
  facilityId: number;
  branchId?: number | { in: number[] };
};

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async enrichRequestUser(user: RequestUser): Promise<RequestUser> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        role: true,
        staff: {
          include: {
            facility: true,
            branch: true,
          },
        },
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

    if (!dbUser.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (
      user.sessionVersion !== undefined &&
      user.sessionVersion !== null &&
      dbUser.sessionVersion !== user.sessionVersion
    ) {
      throw new UnauthorizedException(
        'This account has signed in on another device. Please sign in again.',
      );
    }

    const isSuperAdmin = dbUser.role?.code === 'SUPER_ADMIN';
    const effectiveFacilityId =
      dbUser.homeFacilityId ?? dbUser.staff?.facilityId ?? null;
    const effectiveFacility =
      dbUser.homeFacility ?? dbUser.staff?.facility ?? null;
    const effectiveBranchId =
      dbUser.homeBranchId ?? dbUser.staff?.branchId ?? null;
    const effectiveBranch = dbUser.homeBranch ?? dbUser.staff?.branch ?? null;

    if (!isSuperAdmin && effectiveFacility?.isActive === false) {
      throw new ForbiddenException(
        'Your facility is inactive. Operational access is suspended.',
      );
    }

    return {
      userId: dbUser.id,
      username: dbUser.username,
      roleId: dbUser.roleId,
      roleCode: dbUser.role?.code ?? null,
      sessionVersion: dbUser.sessionVersion,
      homeFacilityId: effectiveFacilityId,
      homeFacilityName: effectiveFacility?.name ?? null,
      homeBranchId: effectiveBranchId,
      homeBranchName: effectiveBranch?.name ?? null,
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

  buildReadScope(user: RequestUser): FacilityBranchScope {
    if (user.roleCode === 'SUPER_ADMIN') {
      return {} as FacilityBranchScope;
    }

    if (!user.homeFacilityId) {
      throw new ForbiddenException('User has no home facility assigned');
    }

    const scope: FacilityBranchScope = {
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
    if (user.roleCode === 'SUPER_ADMIN') {
      return;
    }

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
