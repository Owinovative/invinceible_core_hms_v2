import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DhaHttpClient } from './dha/adapters/dha-http.client';
import { DhaMockClient } from './dha/adapters/dha-mock.client';
import { DhaController } from './dha/dha.controller';
import { DhaService } from './dha/dha.service';
import { FhirMapperService } from './dha/fhir-mapper';
import { FhirSystemsService } from './dha/fhir-systems';
import { EtimsHttpClient } from './etims/adapters/etims-http.client';
import { EtimsMockClient } from './etims/adapters/etims-mock.client';
import { EtimsController } from './etims/etims.controller';
import { EtimsInvoiceBuilder } from './etims/etims-invoice.builder';
import { EtimsService } from './etims/etims.service';
import { IntegrationHttpClient } from './http/integration-http.client';
import { IntegrationAuditService } from './integration-audit.service';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationLoggerService } from './integration-logger.service';
import { DHA_CLIENT, ETIMS_CLIENT } from './integration.constants';
import { IntegrationQueueService } from './queue/integration-queue.service';
import { IntegrationQueueWorker } from './queue/integration-queue.worker';

/**
 * Integration layer isolating all external government systems (KRA eTIMS,
 * DHA). Business modules import this module and depend on EtimsService /
 * DhaService only. Concrete API adapters are bound to the ETIMS_CLIENT /
 * DHA_CLIENT tokens by configuration: 'mock' mode (default) uses in-process
 * mock adapters; 'sandbox'/'production' use the HTTP adapters. Swapping
 * requires no business-code changes.
 */
@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [EtimsController, DhaController],
  providers: [
    IntegrationConfigService,
    IntegrationLoggerService,
    IntegrationAuditService,
    IntegrationHttpClient,
    IntegrationQueueService,
    IntegrationQueueWorker,
    EtimsInvoiceBuilder,
    FhirMapperService,
    FhirSystemsService,
    {
      provide: ETIMS_CLIENT,
      useFactory: (
        config: IntegrationConfigService,
        http: IntegrationHttpClient,
      ) =>
        config.etimsMode === 'mock'
          ? new EtimsMockClient()
          : new EtimsHttpClient(http, config),
      inject: [IntegrationConfigService, IntegrationHttpClient],
    },
    {
      provide: DHA_CLIENT,
      useFactory: (
        config: IntegrationConfigService,
        http: IntegrationHttpClient,
      ) =>
        config.dhaMode === 'mock'
          ? new DhaMockClient()
          : new DhaHttpClient(http, config),
      inject: [IntegrationConfigService, IntegrationHttpClient],
    },
    EtimsService,
    DhaService,
  ],
  exports: [
    EtimsService,
    DhaService,
    IntegrationQueueService,
    IntegrationQueueWorker,
    IntegrationConfigService,
    FhirSystemsService,
  ],
})
export class IntegrationModule {}
