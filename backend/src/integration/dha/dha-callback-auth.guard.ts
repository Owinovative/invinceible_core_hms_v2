import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { IntegrationConfigService } from '../integration-config.service';

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

@Injectable()
export class DhaCallbackAuthGuard implements CanActivate {
  constructor(private readonly config: IntegrationConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const username = this.config.dhaCallbackUsername;
    const password = this.config.dhaCallbackPassword;
    if (!username || !password) {
      throw new ServiceUnavailableException(
        'DHA callback authentication is not configured',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization ?? '';
    if (!authorization.startsWith('Basic ')) {
      throw new UnauthorizedException('DHA callback authentication required');
    }

    let suppliedUsername = '';
    let suppliedPassword = '';
    try {
      const decoded = Buffer.from(authorization.slice(6), 'base64').toString(
        'utf8',
      );
      const separator = decoded.indexOf(':');
      suppliedUsername = separator >= 0 ? decoded.slice(0, separator) : '';
      suppliedPassword = separator >= 0 ? decoded.slice(separator + 1) : '';
    } catch {
      throw new UnauthorizedException('Invalid DHA callback credentials');
    }

    if (
      !constantTimeEqual(suppliedUsername, username) ||
      !constantTimeEqual(suppliedPassword, password)
    ) {
      throw new UnauthorizedException('Invalid DHA callback credentials');
    }
    return true;
  }
}
