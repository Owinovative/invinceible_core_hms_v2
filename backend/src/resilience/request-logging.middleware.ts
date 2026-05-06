import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import { SafeLoggerService } from './safe-logger.service';
import type { RequestWithContext } from './request-context.middleware';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: SafeLoggerService,
  ) {}

  use(req: RequestWithContext, res: Response, next: NextFunction) {
    const startedAt = req.startedAt ?? Date.now();
    const slowRequestMs = Number(
      this.configService.get<string>('SLOW_REQUEST_MS') ?? 1000,
    );

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const context = {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      if (durationMs >= slowRequestMs || res.statusCode >= 500) {
        this.logger.warn('HTTP request completed under pressure', context);
      } else {
        this.logger.debug('HTTP request completed', context);
      }
    });

    next();
  }
}
