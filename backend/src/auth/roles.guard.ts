import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const roleCode = user?.roleCode ?? user?.role?.code;

    if (!roleCode) {
      throw new ForbiddenException('User role information is missing');
    }

    const normalizeRole = (value: string) =>
      ({
        SUPERADMIN: 'SUPER_ADMIN',
        MEDICAL_OFFICER: 'DOCTOR',
        LAB_TECHNOLOGIST: 'LAB_TECHNICIAN',
      })[value] ?? value;

    const hasRole = requiredRoles.some(
      (requiredRole) => normalizeRole(requiredRole) === roleCode,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
