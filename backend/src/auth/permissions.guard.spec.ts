import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  function context(roleCode?: string): ExecutionContext {
    return {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({ user: roleCode ? { roleCode } : undefined }),
      }),
    } as never;
  }

  it('allows handlers without permission metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([]),
    } as unknown as Reflector;
    expect(new PermissionsGuard(reflector).canActivate(context())).toBe(true);
  });

  it('allows a role with every required permission', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(['payment.collect', 'billing.read']),
    } as unknown as Reflector;
    expect(
      new PermissionsGuard(reflector).canActivate(context('CASHIER')),
    ).toBe(true);
  });

  it('rejects missing users and roles without the required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['legal.manage']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context('RECEPTIONIST'))).toThrow(
      ForbiddenException,
    );
  });
});
