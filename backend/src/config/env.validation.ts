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

  const weakJwtSecrets = new Set([
    'changeme',
    'change-me',
    'secret',
    'jwt_secret',
    'your_jwt_secret',
    'development_jwt_secret',
    'invinceible_jwt_secret',
  ]);

  if (nodeEnv === production) {
    const normalizedSecret = jwtSecret.toLowerCase().replace(/\s+/g, '');

    if (jwtSecret.length < 48 || weakJwtSecrets.has(normalizedSecret)) {
      throw new Error(
        'Production JWT_SECRET must be a unique high-entropy secret of at least 48 characters',
      );
    }
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

  const etimsEnabled = String(config.ETIMS_ENABLED ?? 'false') === 'true';
  const etimsMode = String(config.ETIMS_MODE ?? 'mock').toLowerCase();
  if (etimsEnabled && (etimsMode === 'sandbox' || etimsMode === 'production')) {
    for (const key of ['ETIMS_BASE_URL', 'ETIMS_TIN', 'ETIMS_CMC_KEY']) {
      if (!hasValue(config, key)) {
        throw new Error(
          `${key} is required when ETIMS_ENABLED=true and ETIMS_MODE=${etimsMode}`,
        );
      }
    }
  }

  const dhaEnabled = String(config.DHA_ENABLED ?? 'false') === 'true';
  const dhaMode = String(config.DHA_MODE ?? 'mock').toLowerCase();
  if (dhaEnabled && (dhaMode === 'sandbox' || dhaMode === 'production')) {
    for (const key of ['DHA_BASE_URL', 'DHA_CLIENT_ID', 'DHA_CLIENT_SECRET']) {
      if (!hasValue(config, key)) {
        throw new Error(
          `${key} is required when DHA_ENABLED=true and DHA_MODE=${dhaMode}`,
        );
      }
    }
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
    PATIENT_PORTAL_ENABLED: config.PATIENT_PORTAL_ENABLED ?? 'false',
    AI_ENABLED: config.AI_ENABLED ?? 'false',
    SMS_ENABLED: config.SMS_ENABLED ?? 'false',
    WHATSAPP_ENABLED: config.WHATSAPP_ENABLED ?? 'false',
    SHA_ENABLED: config.SHA_ENABLED ?? 'true',
    DATA_WAREHOUSE_ENABLED: config.DATA_WAREHOUSE_ENABLED ?? 'false',
    CLINICAL_DECISION_SUPPORT_ENABLED:
      config.CLINICAL_DECISION_SUPPORT_ENABLED ?? 'true',
    MOBILE_OPTIMIZED_VIEWS_ENABLED:
      config.MOBILE_OPTIMIZED_VIEWS_ENABLED ?? 'true',
    PASSWORD_MIN_LENGTH: config.PASSWORD_MIN_LENGTH ?? '12',
    AUTH_FAILED_LOGIN_DELAY_MAX_MS:
      config.AUTH_FAILED_LOGIN_DELAY_MAX_MS ?? '2500',
    STEP_UP_TTL_SECONDS: config.STEP_UP_TTL_SECONDS ?? '300',
    STEP_UP_ENFORCEMENT_ENABLED:
      config.STEP_UP_ENFORCEMENT_ENABLED ?? 'false',
    // Government integrations (KRA eTIMS + DHA). Disabled by default so
    // existing deployments keep their behavior until explicitly enabled.
    ETIMS_ENABLED: config.ETIMS_ENABLED ?? 'false',
    ETIMS_MODE: config.ETIMS_MODE ?? 'mock',
    ETIMS_BHF_ID: config.ETIMS_BHF_ID ?? '00',
    ETIMS_TIMEOUT_MS: config.ETIMS_TIMEOUT_MS ?? '15000',
    ETIMS_MAX_ATTEMPTS: config.ETIMS_MAX_ATTEMPTS ?? '8',
    ETIMS_DEFAULT_TAX_CODE: config.ETIMS_DEFAULT_TAX_CODE ?? 'A',
    ETIMS_VAT_RATE: config.ETIMS_VAT_RATE ?? '16',
    DHA_ENABLED: config.DHA_ENABLED ?? 'false',
    DHA_MODE: config.DHA_MODE ?? 'mock',
    DHA_API_VERSION: config.DHA_API_VERSION ?? 'v1',
    DHA_TIMEOUT_MS: config.DHA_TIMEOUT_MS ?? '15000',
    DHA_MAX_ATTEMPTS: config.DHA_MAX_ATTEMPTS ?? '8',
    INTEGRATION_WORKER_ENABLED: config.INTEGRATION_WORKER_ENABLED ?? 'true',
    INTEGRATION_WORKER_POLL_MS: config.INTEGRATION_WORKER_POLL_MS ?? '5000',
    INTEGRATION_QUEUE_BATCH_SIZE:
      config.INTEGRATION_QUEUE_BATCH_SIZE ?? '10',
    INTEGRATION_RETRY_BASE_DELAY_MS:
      config.INTEGRATION_RETRY_BASE_DELAY_MS ?? '30000',
    INTEGRATION_RETRY_MAX_DELAY_MS:
      config.INTEGRATION_RETRY_MAX_DELAY_MS ?? '3600000',
    INTEGRATION_STUCK_REQUEST_MS:
      config.INTEGRATION_STUCK_REQUEST_MS ?? '600000',
  };
}
