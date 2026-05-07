import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { RequestUser } from './interfaces/request-user.interface';
import { STEP_UP_REQUIRED_KEY } from './step-up.decorator';

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(
      STEP_UP_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;
    if (this.configService.get<string>('STEP_UP_ENFORCEMENT_ENABLED') !== 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const token = String(request.headers?.['x-step-up-token'] ?? '').trim();

    if (!token) {
      throw new ForbiddenException(
        'This action requires recent password verification',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        sessionId?: string | null;
        stepUp?: boolean;
        scope?: string;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      if (
        !payload.stepUp ||
        payload.scope !== 'dangerous-action' ||
        payload.sub !== request.user?.userId ||
        payload.sessionId !== request.user?.sessionId
      ) {
        throw new Error('Invalid step-up token scope');
      }

      return true;
    } catch {
      throw new ForbiddenException(
        'This action requires recent password verification',
      );
    }
  }
}
