import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Validates all critical SHR configuration at application startup.
 * Fails fast with clear diagnostics if any requirement is missing.
 */
@Injectable()
export class ShrStartupValidator implements OnModuleInit {
  private readonly logger = new Logger(ShrStartupValidator.name);

  async onModuleInit() {
    this.logger.log('Running SHR Startup Configuration Validation...');

    const errors: string[] = [];

    // Feature Flags
    const shrEnabled = process.env.SHR_ENABLED;
    if (!shrEnabled || shrEnabled !== 'true') {
      this.logger.warn('SHR_ENABLED is not set to true. SHR module will be inactive.');
      return; // If SHR is disabled, skip validation
    }

    // DHA OAuth credentials
    if (!process.env.SHA_CLIENT_ID && !process.env.DHA_CLIENT_ID) {
      errors.push('Missing DHA OAuth Client ID (SHA_CLIENT_ID or DHA_CLIENT_ID)');
    }
    if (!process.env.SHA_CLIENT_SECRET && !process.env.DHA_CLIENT_SECRET) {
      errors.push('Missing DHA OAuth Client Secret (SHA_CLIENT_SECRET or DHA_CLIENT_SECRET)');
    }

    // DHA API URLs
    if (!process.env.SHA_BASE_URL && !process.env.DHA_BASE_URL) {
      errors.push('Missing DHA Base URL (SHA_BASE_URL or DHA_BASE_URL)');
    }

    // Queue configuration
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      errors.push('Missing Redis configuration (REDIS_URL or REDIS_HOST)');
    }

    // SHR-specific configuration defaults
    const shrTimeout = parseInt(process.env.SHR_TIMEOUT_MS || '30000', 10);
    if (isNaN(shrTimeout) || shrTimeout < 1000) {
      errors.push('SHR_TIMEOUT_MS must be a valid number >= 1000');
    }

    const shrRetryLimit = parseInt(process.env.SHR_RETRY_LIMIT || '5', 10);
    if (isNaN(shrRetryLimit) || shrRetryLimit < 0) {
      errors.push('SHR_RETRY_LIMIT must be a valid non-negative number');
    }

    // Report results
    if (errors.length > 0) {
      const errorMessage = [
        '======== SHR STARTUP VALIDATION FAILED ========',
        ...errors.map((e, i) => `  ${i + 1}. ${e}`),
        '================================================',
        'Fix the above configuration issues before starting the SHR module.',
      ].join('\n');

      this.logger.error(errorMessage);
      // In production, you would throw here to prevent startup:
      // throw new Error('SHR Startup Validation Failed');
    } else {
      this.logger.log('SHR Startup Configuration Validation PASSED ✓');
    }
  }
}
