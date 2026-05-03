import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { UserLocationService } from './user-location.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class UserLocationInterceptor implements NestInterceptor {
  constructor(private readonly userLocationService: UserLocationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: () => {
          if (!this.shouldCapture(req)) return;
          const statusCode = context.switchToHttp().getResponse()?.statusCode;
          void this.userLocationService
            .captureRequest(req, req.user as RequestUser, statusCode)
            .catch(() => undefined);
        },
        error: (error) => {
          if (!this.shouldCapture(req)) return;
          const statusCode = Number(error?.status ?? error?.response?.statusCode);
          void this.userLocationService
            .captureRequest(
              req,
              req.user as RequestUser,
              Number.isFinite(statusCode) ? statusCode : 500,
            )
            .catch(() => undefined);
        },
      }),
    );
  }

  private shouldCapture(req: any) {
    if (!req?.user?.userId) return false;

    const url = String(req.originalUrl ?? req.url ?? '');
    if (url.startsWith('/health')) return false;
    if (url.startsWith('/favicon')) return false;
    if (url.startsWith('/user-locations/precise')) return false;
    if (url.startsWith('/user-locations/platform')) return false;

    return true;
  }
}
