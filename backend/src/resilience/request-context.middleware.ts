import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
  startedAt?: number;
};

function normalizeRequestId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const requestId = raw.trim();
  return /^[a-zA-Z0-9_.:-]{8,120}$/.test(requestId) ? requestId : undefined;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction) {
    const requestId =
      normalizeRequestId(req.headers['x-request-id']) ||
      normalizeRequestId(req.headers['x-correlation-id']) ||
      randomUUID();

    req.requestId = requestId;
    req.startedAt = Date.now();
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
