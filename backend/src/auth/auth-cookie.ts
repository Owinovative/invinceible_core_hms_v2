import type { CookieOptions, Request } from 'express';
import type { ConfigService } from '@nestjs/config';

export const AUTH_COOKIE_NAME = 'hms_session';

export function extractAuthCookie(request: Request): string | null {
  const header = request.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== AUTH_COOKIE_NAME) continue;

    const value = part.slice(separator + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function getAuthCookieOptions(
  configService: ConfigService,
): CookieOptions {
  const production = configService.get<string>('NODE_ENV') === 'production';
  const configuredSameSite = (
    configService.get<string>('AUTH_COOKIE_SAME_SITE') ?? 'lax'
  ).toLowerCase();
  const sameSite = ['strict', 'lax', 'none'].includes(configuredSameSite)
    ? (configuredSameSite as 'strict' | 'lax' | 'none')
    : 'lax';
  const secure =
    production ||
    configService.get<string>('AUTH_COOKIE_SECURE') === 'true' ||
    sameSite === 'none';
  const maxAgeSeconds = Math.max(
    60,
    Number(configService.get<string>('AUTH_COOKIE_MAX_AGE_SECONDS') ?? 86400),
  );
  const domain = configService.get<string>('AUTH_COOKIE_DOMAIN')?.trim();

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: maxAgeSeconds * 1000,
    ...(domain ? { domain } : {}),
  };
}
