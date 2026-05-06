import { Injectable } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';

@Injectable()
export class EnterpriseService {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  getStatus() {
    return {
      product: 'Invinceible Core HMS',
      enterpriseReady: true,
      featureFlags: this.featureFlags.all(),
      safeguards: {
        facilityIsolation: true,
        branchIsolation: true,
        patientPortalScoped: true,
        aiDisabledByDefault: !this.featureFlags.isEnabled('AI_ENABLED'),
        externalPatientAiBlockedUnlessEnabled:
          !this.featureFlags.isEnabled('AI_ENABLED'),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
