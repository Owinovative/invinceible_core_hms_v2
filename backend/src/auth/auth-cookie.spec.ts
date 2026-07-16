import type { Request } from 'express';
import type { ConfigService } from '@nestjs/config';
import { extractAuthCookie, getAuthCookieOptions } from './auth-cookie';
import { isCookieMutationOriginAllowed } from './cookie-csrf';

describe('cookie authentication safety', () => {
  it('extracts only the HttpOnly session cookie value', () => {
    const request = {
      headers: { cookie: 'theme=dark; hms_session=jwt-value; branch=2' },
    } as Request;
    expect(extractAuthCookie(request)).toBe('jwt-value');
  });

  it('creates a secure cross-site cookie for separate production hosts', () => {
    const values: Record<string, string> = {
      NODE_ENV: 'production',
      AUTH_COOKIE_SAME_SITE: 'none',
      AUTH_COOKIE_SECURE: 'true',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    expect(getAuthCookieOptions(config)).toEqual(
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      }),
    );
  });

  it('rejects cookie-authenticated mutations from an untrusted origin', () => {
    expect(
      isCookieMutationOriginAllowed({
        method: 'POST',
        cookieHeader: 'hms_session=jwt-value',
        origin: 'https://evil.example',
        allowedOrigins: ['https://hms.example'],
      }),
    ).toBe(false);
  });

  it('allows trusted browser mutations and bearer API clients', () => {
    expect(
      isCookieMutationOriginAllowed({
        method: 'PATCH',
        cookieHeader: 'hms_session=jwt-value',
        origin: 'https://hms.example',
        allowedOrigins: ['https://hms.example'],
      }),
    ).toBe(true);
    expect(
      isCookieMutationOriginAllowed({
        method: 'POST',
        authorizationHeader: 'Bearer api-token',
        allowedOrigins: [],
      }),
    ).toBe(true);
  });
});
