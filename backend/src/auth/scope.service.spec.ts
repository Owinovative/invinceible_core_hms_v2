import { ForbiddenException } from '@nestjs/common';
import { ScopeService } from './scope.service';
import type { RequestUser } from './interfaces/request-user.interface';

describe('ScopeService isolation', () => {
  const service = new ScopeService({} as never);
  const user: RequestUser = {
    userId: 10,
    username: 'branch-user',
    roleId: 4,
    roleCode: 'CASHIER',
    homeFacilityId: 1,
    homeBranchId: 11,
    allowedBranchIds: [12],
    canAccessAllBranchesInFacility: false,
  };

  it('builds facility and branch filters into the database query', () => {
    expect(service.buildReadScope(user)).toEqual({
      facilityId: 1,
      branchId: { in: [11, 12] },
    });
    expect(service.buildBranchScopeWhere(user, 'siteId', 'locationId')).toEqual(
      {
        siteId: 1,
        locationId: { in: [11, 12] },
      },
    );
  });

  it('rejects another facility and an unassigned branch', () => {
    expect(() => service.assertFacilityAccess(user, 2)).toThrow(
      ForbiddenException,
    );
    expect(() => service.assertBranchAccess(user, 1, 99)).toThrow(
      ForbiddenException,
    );
  });

  it('allows assigned branches but never carries them across facilities', () => {
    expect(() => service.assertBranchAccess(user, 1, 11)).not.toThrow();
    expect(() => service.assertBranchAccess(user, 1, 12)).not.toThrow();
    expect(() => service.assertBranchAccess(user, 2, 12)).toThrow(
      ForbiddenException,
    );
  });

  it('allows super admins to query globally', () => {
    const superAdmin = { ...user, roleCode: 'SUPER_ADMIN' };
    expect(service.buildReadScope(superAdmin)).toEqual({});
    expect(service.buildBranchScopeWhere(superAdmin)).toEqual({});
    expect(() =>
      service.assertBranchAccess(superAdmin, 999, 999),
    ).not.toThrow();
  });

  it('fails closed when a regular user has no facility or branch assignment', () => {
    const unscoped = {
      ...user,
      homeFacilityId: null,
      homeBranchId: null,
      allowedBranchIds: [],
    };
    expect(() => service.buildReadScope(unscoped)).toThrow(ForbiddenException);
    expect(() =>
      service.buildReadScope({ ...unscoped, homeFacilityId: 1 }),
    ).toThrow(ForbiddenException);
  });
});
