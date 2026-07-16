import type { Request } from 'express';
import { extractAuthCookie } from './auth-cookie';
import { isCookieMutationOriginAllowed } from './cookie-csrf';

describe('cookie authentication safety', () => {
  it('extracts only the HttpOnly session cookie value', () => {
    const request = {
      headers: { cookie: 'theme=dark; hms_session=jwt-value; branch=2' },
    } as Request;
    expect(extractAuthCookie(request)).toBe('jwt-value');
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
