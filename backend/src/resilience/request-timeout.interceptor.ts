import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, timeout } from 'rxjs';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const timeoutMs = Number(
      this.configService.get<string>('REQUEST_TIMEOUT_MS') ?? 30_000,
    );

    return next.handle().pipe(timeout(Math.max(1_000, timeoutMs)));
  }
}
