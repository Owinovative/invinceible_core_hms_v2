const production = 'production';

function requireString(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function hasValue(config: Record<string, unknown>, key: string): boolean {
  const value = config[key];
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv =
    typeof config.NODE_ENV === 'string' && config.NODE_ENV.trim().length > 0
      ? config.NODE_ENV.trim()
      : 'development';

  const jwtSecret = requireString(config, 'JWT_SECRET');
  requireString(config, 'DATABASE_URL');

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (
    nodeEnv === production &&
    !hasValue(config, 'FRONTEND_URL') &&
    !hasValue(config, 'FRONTEND_ORIGINS')
  ) {
    throw new Error(
      'Set FRONTEND_URL or FRONTEND_ORIGINS in production for CORS',
    );
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
  };
}
