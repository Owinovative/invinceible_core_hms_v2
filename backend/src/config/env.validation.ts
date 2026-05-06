const production = 'production';

function requireString(config: Record<string, unknown>, key: string): string {
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
    CACHE_PREFIX: config.CACHE_PREFIX ?? 'inv_hms',
    CACHE_DEFAULT_TTL_SECONDS: config.CACHE_DEFAULT_TTL_SECONDS ?? '60',
    CACHE_DASHBOARD_TTL_SECONDS: config.CACHE_DASHBOARD_TTL_SECONDS ?? '30',
    CACHE_REFERENCE_TTL_SECONDS: config.CACHE_REFERENCE_TTL_SECONDS ?? '300',
    CACHE_IN_MEMORY_MAX_ITEMS: config.CACHE_IN_MEMORY_MAX_ITEMS ?? '10000',
    RATE_LIMIT_TTL_SECONDS: config.RATE_LIMIT_TTL_SECONDS ?? '60',
    RATE_LIMIT_MAX: config.RATE_LIMIT_MAX ?? '120',
    AUTH_RATE_LIMIT_MAX: config.AUTH_RATE_LIMIT_MAX ?? '10',
    SEARCH_RATE_LIMIT_MAX: config.SEARCH_RATE_LIMIT_MAX ?? '60',
    DASHBOARD_RATE_LIMIT_MAX: config.DASHBOARD_RATE_LIMIT_MAX ?? '120',
    PDF_RATE_LIMIT_MAX: config.PDF_RATE_LIMIT_MAX ?? '20',
    MPESA_RATE_LIMIT_MAX: config.MPESA_RATE_LIMIT_MAX ?? '5',
    PUBLIC_VERIFY_RATE_LIMIT_MAX: config.PUBLIC_VERIFY_RATE_LIMIT_MAX ?? '30',
    MPESA_PROMPT_LOCK_SECONDS: config.MPESA_PROMPT_LOCK_SECONDS ?? '90',
    MPESA_MAX_CONCURRENT_PROMPTS: config.MPESA_MAX_CONCURRENT_PROMPTS ?? '20',
    MPESA_REQUEST_TIMEOUT_MS: config.MPESA_REQUEST_TIMEOUT_MS ?? '15000',
    MPESA_STATUS_CACHE_SECONDS: config.MPESA_STATUS_CACHE_SECONDS ?? '10',
    QUEUE_ENABLED: config.QUEUE_ENABLED ?? 'true',
    QUEUE_CONCURRENCY: config.QUEUE_CONCURRENCY ?? '5',
    QUEUE_PREFIX: config.QUEUE_PREFIX ?? 'inv_hms',
    WORKER_MODE: config.WORKER_MODE ?? 'false',
    SLOW_REQUEST_MS: config.SLOW_REQUEST_MS ?? '1000',
    SLOW_DB_QUERY_MS: config.SLOW_DB_QUERY_MS ?? '500',
    LOG_LEVEL: config.LOG_LEVEL ?? 'info',
    REQUEST_TIMEOUT_MS: config.REQUEST_TIMEOUT_MS ?? '30000',
    BODY_LIMIT: config.BODY_LIMIT ?? '4mb',
  };
}
