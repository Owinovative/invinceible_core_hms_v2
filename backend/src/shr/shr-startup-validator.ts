import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationConfigService } from '../integration/integration-config.service';

/** Fails startup when SHR is enabled with an unsafe or incomplete setup. */
@Injectable()
export class ShrStartupValidator implements OnModuleInit {
  private readonly logger = new Logger(ShrStartupValidator.name);

  constructor(
    private readonly config: ConfigService,
    private readonly integrationConfig: IntegrationConfigService,
  ) {}

  onModuleInit() {
    if (!this.bool('SHR_ENABLED', false)) {
      this.logger.log('SHR publication is disabled');
      return;
    }

    const errors: string[] = [];
    if (!this.integrationConfig.dhaEnabled) {
      errors.push('DHA_ENABLED must be true when SHR_ENABLED=true');
    }

    if (this.integrationConfig.dhaMode !== 'mock') {
      if (!this.integrationConfig.dhaFacilityId) {
        errors.push('DHA_FACILITY_ID is required for live SHR publication');
      }
      if (!this.integrationConfig.dhaSpecVersion) {
        errors.push('DHA_SPEC_VERSION is required for live SHR publication');
      }
    }

    this.validateInteger('SHR_TIMEOUT_MS', 30_000, 1_000, errors);
    this.validateInteger('SHR_RETRY_LIMIT', 5, 0, errors);

    if (errors.length > 0) {
      throw new Error(`SHR startup validation failed: ${errors.join('; ')}`);
    }
    this.logger.log(
      `SHR startup validation passed (${this.integrationConfig.dhaMode} mode)`,
    );
  }

  private bool(key: string, fallback: boolean): boolean {
    const value = this.config.get<string>(key);
    if (value === undefined || value === '') return fallback;
    return value.toLowerCase() === 'true';
  }

  private validateInteger(
    key: string,
    fallback: number,
    minimum: number,
    errors: string[],
  ) {
    const raw = this.config.get<string>(key);
    const value = raw === undefined || raw === '' ? fallback : Number(raw);
    if (!Number.isInteger(value) || value < minimum) {
      errors.push(
        `${key} must be an integer greater than or equal to ${minimum}`,
      );
    }
  }
}
