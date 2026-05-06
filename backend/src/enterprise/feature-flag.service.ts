import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type EnterpriseFeatureFlag =
  | 'PATIENT_PORTAL_ENABLED'
  | 'AI_ENABLED'
  | 'SMS_ENABLED'
  | 'WHATSAPP_ENABLED'
  | 'SHA_ENABLED'
  | 'DATA_WAREHOUSE_ENABLED'
  | 'CLINICAL_DECISION_SUPPORT_ENABLED'
  | 'MOBILE_OPTIMIZED_VIEWS_ENABLED';

const DEFAULTS: Record<EnterpriseFeatureFlag, boolean> = {
  PATIENT_PORTAL_ENABLED: false,
  AI_ENABLED: false,
  SMS_ENABLED: false,
  WHATSAPP_ENABLED: false,
  SHA_ENABLED: true,
  DATA_WAREHOUSE_ENABLED: false,
  CLINICAL_DECISION_SUPPORT_ENABLED: true,
  MOBILE_OPTIMIZED_VIEWS_ENABLED: true,
};

@Injectable()
export class FeatureFlagService {
  constructor(private readonly configService: ConfigService) {}

  isEnabled(flag: EnterpriseFeatureFlag) {
    const raw = this.configService.get<string>(flag);
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return DEFAULTS[flag];
    }

    return ['true', '1', 'yes', 'on'].includes(String(raw).toLowerCase());
  }

  all() {
    return (Object.keys(DEFAULTS) as EnterpriseFeatureFlag[]).reduce(
      (acc, flag) => ({
        ...acc,
        [flag]: this.isEnabled(flag),
      }),
      {} as Record<EnterpriseFeatureFlag, boolean>,
    );
  }
}
