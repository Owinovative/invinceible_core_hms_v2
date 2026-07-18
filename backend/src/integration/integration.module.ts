import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { SensitiveDataCipherService } from '../common/security/sensitive-data-cipher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { DhaHttpClient } from './dha/adapters/dha-http.client';
import { DhaMockClient } from './dha/adapters/dha-mock.client';
import { DhaController } from './dha/dha.controller';
import { DhaCallbackAuthGuard } from './dha/dha-callback-auth.guard';
import { DhaCallbackController } from './dha/dha-callback.controller';
import { DhaService } from './dha/dha.service';
import { IntegrationQueueController } from './queue/integration-queue.controller';
import { FhirMapperService } from './dha/fhir-mapper';
import { FhirSystemsService } from './dha/fhir-systems';
import { FhirValidationService } from './dha/fhir-validation.service';
import { EtimsHttpClient } from './etims/adapters/etims-http.client';
import { EtimsMockClient } from './etims/adapters/etims-mock.client';
import { EtimsController } from './etims/etims.controller';
import { EtimsInvoiceBuilder } from './etims/etims-invoice.builder';
import { EtimsService } from './etims/etims.service';
import { IntegrationHttpClient } from './http/integration-http.client';
import { IntegrationAuditService } from './integration-audit.service';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationLoggerService } from './integration-logger.service';
import { IntegrationStatusController } from './integration-status.controller';
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
  imports: [PrismaModule, AuditLogModule, AuthModule],
  controllers: [
    EtimsController,
    DhaController,
    DhaCallbackController,
    IntegrationQueueController,
    IntegrationStatusController,
  ],
  providers: [
    IntegrationConfigService,
    IntegrationLoggerService,
    SensitiveDataCipherService,
    IntegrationAuditService,
    IntegrationHttpClient,
    IntegrationQueueService,
    IntegrationQueueWorker,
    EtimsInvoiceBuilder,
    FhirMapperService,
    FhirSystemsService,
    FhirValidationService,
    DhaCallbackAuthGuard,
    {
      provide: ETIMS_CLIENT,
      useFactory: (
        config: IntegrationConfigService,
        http: IntegrationHttpClient,
        prisma: PrismaService,
      ) =>
        config.etimsMode === 'mock'
          ? new EtimsMockClient()
          : new EtimsHttpClient(http, config, prisma),
      inject: [IntegrationConfigService, IntegrationHttpClient, PrismaService],
    },
    {
      provide: DHA_CLIENT,
      useFactory: (
        config: IntegrationConfigService,
        http: IntegrationHttpClient,
        logger: IntegrationLoggerService,
      ) =>
        config.dhaMode === 'mock'
          ? new DhaMockClient()
          : new DhaHttpClient(http, config, logger),
      inject: [
        IntegrationConfigService,
        IntegrationHttpClient,
        IntegrationLoggerService,
      ],
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
    IntegrationLoggerService,
    IntegrationHttpClient,
    SensitiveDataCipherService,
    FhirSystemsService,
    FhirMapperService,
    DHA_CLIENT,
  ],
})
export class IntegrationModule {}
