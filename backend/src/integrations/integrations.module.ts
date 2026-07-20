import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntegrationModule as CoreIntegrationModule } from '../integration/integration.module';
import { ClientRegistryService } from './client-registry/client-registry.service';
import { FacilityRegistryService } from './facility-registry/facility-registry.service';
import { PractitionerRegistryService } from './practitioner-registry/practitioner-registry.service';
@Module({
  imports: [ConfigModule, CoreIntegrationModule],
  providers: [
    ClientRegistryService,
    FacilityRegistryService,
    PractitionerRegistryService,
  ],
  exports: [
    ClientRegistryService,
    FacilityRegistryService,
    PractitionerRegistryService,
  ],
})
export class IntegrationsModule {}
