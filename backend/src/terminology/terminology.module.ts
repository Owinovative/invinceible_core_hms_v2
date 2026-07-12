import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TerminologyHttpClient } from './adapters/terminology-http.client';
import { TerminologyGateway } from './terminology-gateway.service';
import { TerminologySyncService } from './terminology-sync.service';

import { TerminologyController } from './terminology.controller';

@Module({
  imports: [IntegrationModule, PrismaModule],
  controllers: [TerminologyController],
  providers: [
    TerminologyHttpClient,
    TerminologyGateway,
    TerminologySyncService,
  ],
  exports: [TerminologyGateway, TerminologySyncService],
})
export class TerminologyModule {}
