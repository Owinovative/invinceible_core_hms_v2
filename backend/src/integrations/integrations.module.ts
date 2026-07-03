import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntegrationModule as CoreIntegrationModule } from '../integration/integration.module';
import { IntegrationCacheService } from './caching/integration-cache.service';
import { DhaAuthService } from './authentication/dha-auth.service';
import { ClientRegistryService } from './client-registry/client-registry.service';
import { FacilityRegistryService } from './facility-registry/facility-registry.service';
import { PractitionerRegistryService } from './practitioner-registry/practitioner-registry.service';
import { TerminologyService } from './terminology/terminology.service';
import { ClaimsIntegrationService } from './claims/claims-integration.service';

@Module({
  imports: [ConfigModule, CoreIntegrationModule],
  providers: [
    IntegrationCacheService,
    DhaAuthService,
    ClientRegistryService,
    FacilityRegistryService,
    PractitionerRegistryService,
    TerminologyService,
    ClaimsIntegrationService,
  ],
  exports: [
    ClientRegistryService,
    FacilityRegistryService,
    PractitionerRegistryService,
    TerminologyService,
    ClaimsIntegrationService,
  ],
})
export class IntegrationsModule {}
