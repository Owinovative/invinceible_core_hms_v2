import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type { NextFunction, Response } from 'express';
import { RateLimitService } from './rate-limit.service';
import type { RequestWithContext } from './request-context.middleware';

type LimitCategory =
  | 'auth'
  | 'search'
  | 'dashboard'
  | 'pdf'
  | 'mpesa'
  | 'publicVerify'
  | 'import'
  | 'default';

function hashPart(value?: string | string[]) {
  const text = Array.isArray(value) ? value.join(',') : value || '';
  if (!text) return 'anon';
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async use(req: RequestWithContext, res: Response, next: NextFunction) {
    const path = (req.originalUrl || req.url || '').split('?')[0];

    if (this.isExempt(path)) {
      next();
      return;
    }

    const category = this.getCategory(req.method, path);
    const max = this.getLimit(category);
    const ttl = Number(
      this.configService.get<string>('RATE_LIMIT_TTL_SECONDS') ?? 60,
    );
    const identity = this.getIdentity(req);
    const key = [category, req.method, path, identity].join(':');
    const result = await this.rateLimitService.consume(key, max, ttl);

    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfter));
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please retry after the indicated delay.',
        error: 'RATE_LIMITED',
        retryAfter: result.retryAfter,
        requestId: req.requestId,
      });
      return;
    }

    next();
  }

  private isExempt(path: string) {
    return (
      path === '/health/live' || path === '/billing/payments/mpesa/callback'
    );
  }

  private getCategory(method: string, path: string): LimitCategory {
    const lower = path.toLowerCase();

    if (method === 'POST' && lower === '/auth/login') return 'auth';
    if (lower.includes('/mpesa/')) return 'mpesa';
    if (lower.includes('/verify')) return 'publicVerify';
    if (lower.endsWith('.pdf') || lower.includes('/pdf')) return 'pdf';
    if (lower.includes('dashboard') || lower.includes('reports'))
      return 'dashboard';
    if (lower.includes('search') || lower.includes('suggest')) return 'search';
    if (lower.includes('import') || lower.includes('upload')) return 'import';

    return 'default';
  }

  private getLimit(category: LimitCategory) {
    const envByCategory: Record<LimitCategory, string> = {
      auth: 'AUTH_RATE_LIMIT_MAX',
      search: 'SEARCH_RATE_LIMIT_MAX',
      dashboard: 'DASHBOARD_RATE_LIMIT_MAX',
      pdf: 'PDF_RATE_LIMIT_MAX',
      mpesa: 'MPESA_RATE_LIMIT_MAX',
      publicVerify: 'PUBLIC_VERIFY_RATE_LIMIT_MAX',
      import: 'PDF_RATE_LIMIT_MAX',
      default: 'RATE_LIMIT_MAX',
    };

    return Number(
      this.configService.get<string>(envByCategory[category]) ??
        this.configService.get<string>('RATE_LIMIT_MAX') ??
        120,
    );
  }

  private getIdentity(req: RequestWithContext) {
    const trustProxy =
      String(
        this.configService.get<string>('TRUST_PROXY') || '',
      ).toLowerCase() === 'true';
    const ip = trustProxy
      ? String(req.headers['x-forwarded-for'] || req.ip || '')
          .split(',')[0]
          .trim()
      : req.ip;
    const authHash = hashPart(req.headers.authorization);
    return `${ip || 'unknown'}:${authHash}`;
  }
}
