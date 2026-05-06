import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from './interfaces/request-user.interface';
import { computeFacilityAccessStatus } from '../common/facility-access';

type FacilityBranchScope = {
  facilityId: number;
  branchId?: number | { in: number[] };
};

export type UserScope = {
  isSuperAdmin: boolean;
  roleCode: string | null;
  facilityId: number | null;
  branchId: number | null;
  branchIds: number[];
  canAccessAllBranchesInFacility: boolean;
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
        'This session is no longer valid. Please sign in again.',
      );
    }

    if (user.sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: user.sessionId },
        select: {
          id: true,
          userId: true,
          revokedAt: true,
        },
      });

      if (!session || session.userId !== dbUser.id || session.revokedAt) {
        throw new UnauthorizedException(
          'This account is already active on two newer devices. Please sign in again.',
        );
      }

      void this.prisma.userSession
        .update({
          where: { id: session.id },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => undefined);
    }

    const isSuperAdmin = dbUser.role?.code === 'SUPER_ADMIN';
    const effectiveFacilityId =
      dbUser.homeFacilityId ?? dbUser.staff?.facilityId ?? null;
    const effectiveFacility =
      dbUser.homeFacility ?? dbUser.staff?.facility ?? null;
    const effectiveBranchId =
      dbUser.homeBranchId ?? dbUser.staff?.branchId ?? null;
    const effectiveBranch = dbUser.homeBranch ?? dbUser.staff?.branch ?? null;

    const facilityAccessStatus = effectiveFacility
      ? computeFacilityAccessStatus(effectiveFacility)
      : null;

    if (!isSuperAdmin && facilityAccessStatus?.loginBlocked) {
      throw new UnauthorizedException(
        facilityAccessStatus.lockReason ===
        'FACILITY_SUBSCRIPTION_GRACE_EXPIRED'
          ? 'Facility subscription has been unpaid for more than 15 days. Access is blocked until payment is recorded by the platform.'
          : 'Facility compliance grace has expired. Access is blocked until the platform reactivates the facility.',
      );
    }

    return {
      userId: dbUser.id,
      username: dbUser.username,
      roleId: dbUser.roleId,
      roleCode: dbUser.role?.code ?? null,
      sessionVersion: dbUser.sessionVersion,
      sessionId: user.sessionId ?? null,
      homeFacilityId: effectiveFacilityId,
      homeFacilityName: effectiveFacility?.name ?? null,
      facilityAccessStatus,
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
      staffPassportPhotoUrl: dbUser.staff?.passportPhotoUrl ?? null,
      pendingDeactivationAt: dbUser.pendingDeactivationAt ?? null,
      pendingDeactivationReason: dbUser.pendingDeactivationReason ?? null,
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

  getUserScope(user: RequestUser): UserScope {
    const branchIds = new Set<number>();

    if (user.homeBranchId) {
      branchIds.add(user.homeBranchId);
    }

    for (const branchId of user.allowedBranchIds ?? []) {
      branchIds.add(branchId);
    }

    return {
      isSuperAdmin: user.roleCode === 'SUPER_ADMIN',
      roleCode: user.roleCode ?? null,
      facilityId: user.homeFacilityId ?? null,
      branchId: user.homeBranchId ?? null,
      branchIds: Array.from(branchIds),
      canAccessAllBranchesInFacility:
        user.roleCode === 'SUPER_ADMIN' ||
        Boolean(user.canAccessAllBranchesInFacility),
    };
  }

  buildFacilityScopeWhere(
    user: RequestUser,
    facilityField = 'facilityId',
  ): Record<string, unknown> {
    if (user.roleCode === 'SUPER_ADMIN') {
      return {};
    }

    if (!user.homeFacilityId) {
      throw new ForbiddenException('User has no home facility assigned');
    }

    return { [facilityField]: user.homeFacilityId };
  }

  buildBranchScopeWhere(
    user: RequestUser,
    facilityField = 'facilityId',
    branchField = 'branchId',
  ): Record<string, unknown> {
    if (user.roleCode === 'SUPER_ADMIN') {
      return {};
    }

    const facilityWhere = this.buildFacilityScopeWhere(user, facilityField);

    if (user.canAccessAllBranchesInFacility) {
      return facilityWhere;
    }

    const branchIds = this.getUserScope(user).branchIds;
    if (branchIds.length === 0) {
      throw new ForbiddenException('User has no allowed branch access');
    }

    return {
      ...facilityWhere,
      [branchField]: { in: branchIds },
    };
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
