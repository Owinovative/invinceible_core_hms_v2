import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ScopeService } from './scope.service';
import { extractAuthCookie } from './auth-cookie';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly scopeService: ScopeService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => extractAuthCookie(request),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return this.scopeService.enrichRequestUser({
      userId: payload.sub,
      username: payload.username,
      roleId: payload.roleId,
      roleCode: payload.roleCode ?? null,
      sessionVersion: payload.sessionVersion ?? null,
      sessionId: payload.sessionId ?? null,
    });
  }
}
