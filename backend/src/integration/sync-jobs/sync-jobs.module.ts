import { Module } from '@nestjs/common';
import { SyncJobsService } from './sync-jobs.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationModule } from '../integration.module';

@Module({
  imports: [PrismaModule, IntegrationModule],
  providers: [SyncJobsService],
})
export class SyncJobsModule {}
