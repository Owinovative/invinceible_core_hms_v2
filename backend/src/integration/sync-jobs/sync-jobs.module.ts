import { Module } from '@nestjs/common';
import { SyncJobsService } from './sync-jobs.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationModule } from '../integration.module';
import { TerminologyModule } from '../../terminology/terminology.module';

@Module({
  imports: [PrismaModule, IntegrationModule, TerminologyModule],
  providers: [SyncJobsService],
})
export class SyncJobsModule {}
