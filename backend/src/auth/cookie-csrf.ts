import { AUTH_COOKIE_NAME } from './auth-cookie';

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, '');
  }
}

export function isCookieMutationOriginAllowed(params: {
  method: string;
  cookieHeader?: string;
  authorizationHeader?: string;
  origin?: string;
  allowedOrigins: string[];
}) {
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(
    params.method.toUpperCase(),
  );
  const hasCookieSession = (params.cookieHeader ?? '')
    .split(';')
    .some((part) => part.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
  const hasBearerToken = /^Bearer\s+/i.test(params.authorizationHeader ?? '');

  if (!isMutation || !hasCookieSession || hasBearerToken) return true;
  if (!params.origin) return false;

  return params.allowedOrigins.includes(normalizeOrigin(params.origin));
}
