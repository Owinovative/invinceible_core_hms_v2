import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DhaService } from '../dha/dha.service';
import { IntegrationConfigService } from '../integration-config.service';

import { TerminologySyncService } from '../../terminology/terminology-sync.service';

@Injectable()
export class SyncJobsService {
  private readonly logger = new Logger(SyncJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dhaService: DhaService,
    private readonly config: IntegrationConfigService,
    private readonly terminologySync: TerminologySyncService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async pollShaClaimResponses() {
    if (!this.config.dhaEnabled) {
      return;
    }

    this.logger.log('Starting polling for pending SHA claim responses...');
    try {
      const pendingClaims = await this.prisma.shaClaim.findMany({
        where: { statusCode: 'SUBMITTED' },
        take: 50,
      });

      if (pendingClaims.length === 0) {
        this.logger.debug('No pending claims to poll');
        return;
      }

      for (const claim of pendingClaims) {
        try {
          await this.dhaService.pollClaimStatus(claim.id);
        } catch (error) {
          this.logger.error(`Failed to poll claim ${claim.id}`, error);
        }
      }
      this.logger.log(`Finished polling ${pendingClaims.length} claims`);
    } catch (error) {
      this.logger.error('Error during claim polling job', error);
    }
  }

  // Runs daily at 2:00 AM
  @Cron('0 2 * * *')
  async synchronizeTerminology() {
    if (!this.config.terminologyEnabled) {
      return;
    }

    this.logger.log('Starting scheduled Terminology synchronization...');
    try {
      // In a real production system, the target systems might be configured dynamically
      // or fetched from the /sources endpoint. For the MVP we will sync a few known systems.
      const systemsToSync = ['ICD-11', 'LOINC'];

      for (const system of systemsToSync) {
        // Sync the latest version. In reality, we might query the latest version from Gateway.
        await this.terminologySync.synchronizeSystem(
          system,
          'latest',
          'INCREMENTAL',
        );
      }
      this.logger.log('Terminology synchronization complete.');
    } catch (error) {
      this.logger.error('Error during terminology synchronization job', error);
    }
  }
}
