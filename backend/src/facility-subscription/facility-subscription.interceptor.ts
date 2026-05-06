import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, mergeMap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { computeFacilityAccessStatus } from '../common/facility-access';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class FacilitySubscriptionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();

    return from(this.ensureSubscriptionAccess(req)).pipe(
      mergeMap(() => next.handle()),
    );
  }

  private shouldSkip(req: any) {
    const method = String(req.method ?? '').toUpperCase();
    const url = String(req.originalUrl ?? req.url ?? '');
    const user = req.user as RequestUser | undefined;

    if (!MUTATING_METHODS.has(method)) return true;
    if (!user?.userId || !user.homeFacilityId) return true;
    if (user.roleCode === 'SUPER_ADMIN') return true;
    if (url.startsWith('/auth')) return true;
    if (url.startsWith('/facility-subscriptions')) return true;
    if (url.startsWith('/feedback')) return true;
    if (url.startsWith('/notifications')) return true;
    if (url.startsWith('/user-locations')) return true;
    if (url.startsWith('/reviews')) return true;
    if (url.startsWith('/billing-public')) return true;

    return false;
  }

  private async ensureSubscriptionAccess(req: any) {
    if (this.shouldSkip(req)) return;

    const user = req.user as RequestUser;
    const facility = await this.prisma.facility.findUnique({
      where: { id: user.homeFacilityId! },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        complianceStatus: true,
        complianceReason: true,
        complianceDeactivatedAt: true,
        complianceGraceEndsAt: true,
        subscriptionStartedAt: true,
        subscriptionPaidThrough: true,
        subscriptionStatus: true,
        subscriptionLockedAt: true,
      },
    });

    if (!facility) return;

    const accessStatus = computeFacilityAccessStatus(facility);

    if (!accessStatus.writeLocked) return;

    if (
      accessStatus.subscriptionWriteLocked &&
      facility.subscriptionStatus !== 'LOCKED'
    ) {
      void this.prisma.facility
        .update({
          where: { id: facility.id },
          data: {
            subscriptionStatus: 'LOCKED',
            subscriptionLockedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }

    if (accessStatus.complianceWriteLocked) {
      throw new ForbiddenException(
        'Facility is in compliance grace/read-only mode. Data entry is paused until the platform reactivates the facility.',
      );
    }

    throw new ForbiddenException(
      'Facility subscription is overdue. Data entry is paused until the monthly subscription is paid.',
    );
  }
}
