import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import {
  compactText,
  serializeCompactForStorage,
} from '../common/storage/compact-payload';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set([
  'password',
  'oldPassword',
  'newPassword',
  'token',
  'resetToken',
  'refreshToken',
  'accessToken',
  'authorization',
  'cookie',
  'jwt',
  'jwtSecret',
  'JWT_SECRET',
  'passwordHash',
  'consumerSecret',
  'mpesaConsumerSecret',
  'mpesaPasskey',
  'passkey',
  'clientSecret',
  'databaseUrl',
  'DATABASE_URL',
  'apiKey',
  'secret',
]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: (result) => {
          if (!this.shouldAudit(req)) return;
          void this.writeAuditLog(req, result, 'SUCCESS').catch(
            () => undefined,
          );
        },
        error: (error) => {
          if (!this.shouldAudit(req)) return;
          void this.writeAuditLog(
            req,
            error?.response ?? error,
            'FAILED',
          ).catch(() => undefined);
        },
      }),
    );
  }

  private shouldAudit(req: any) {
    const method = String(req.method ?? '').toUpperCase();
    const url = String(req.originalUrl ?? req.url ?? '');

    if (!AUDITED_METHODS.has(method)) return false;
    if (url.startsWith('/audit-logs')) return false;
    if (url.startsWith('/auth/login')) return false;

    return Boolean(req.user);
  }

  private async writeAuditLog(req: any, result: unknown, outcome: string) {
    const user = req.user as RequestUser | undefined;
    if (!user) return;

    const method = String(req.method ?? '').toUpperCase();
    const url = String(req.originalUrl ?? req.url ?? '');
    const moduleName = this.moduleNameFromUrl(url);
    const entityId =
      req.params?.id ??
      req.params?.orderId ??
      req.params?.patientId ??
      req.body?.id ??
      undefined;

    await this.prisma.auditLog.create({
      data: {
        moduleName,
        actionName: `${method}_${outcome}`,
        entityType: this.entityTypeFromUrl(url),
        entityId: entityId ? String(entityId) : undefined,
        description: compactText(
          `${method} ${url} ${outcome.toLowerCase()}`,
          600,
        ),
        facilityId:
          this.toNumber(req.body?.facilityId) ??
          user.homeFacilityId ??
          undefined,
        branchId:
          this.toNumber(req.body?.branchId) ?? user.homeBranchId ?? undefined,
        actorUserId: user.userId,
        actorStaffId: user.staffId ?? undefined,
        beforeData: this.serialize({
          params: req.params,
          query: req.query,
          body: this.sanitize(req.body),
        }),
        afterData: this.serialize(this.sanitize(result)),
        ipAddress: this.requestIp(req),
        userAgent: compactText(req.headers?.['user-agent'], 500),
      },
    });
  }

  private moduleNameFromUrl(url: string) {
    const [segment = 'system'] = url
      .replace(/^\/+/, '')
      .split(/[/?#]/)
      .filter(Boolean);

    return segment.replace(/-/g, '_').toUpperCase();
  }

  private entityTypeFromUrl(url: string) {
    return this.moduleNameFromUrl(url);
  }

  private requestIp(req: any) {
    const forwarded = req.headers?.['x-forwarded-for'];

    if (forwarded) {
      return String(forwarded).split(',')[0]?.trim();
    }

    return req.ip ?? req.socket?.remoteAddress;
  }

  private toNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private sanitize(value: unknown): unknown {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.has(key) || this.looksSensitive(key)
          ? '[redacted]'
          : this.sanitize(item),
      ]),
    );
  }

  private looksSensitive(key: string) {
    const lower = key.toLowerCase();
    return (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('passkey') ||
      lower.includes('authorization') ||
      lower.includes('cookie')
    );
  }

  private serialize(value: unknown) {
    try {
      return serializeCompactForStorage(value, {
        maxBytes: 6_000,
        maxStringLength: 900,
        maxArrayItems: 25,
      });
    } catch {
      return undefined;
    }
  }
}
