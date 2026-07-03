import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DhaService } from '../dha/dha.service';
import { IntegrationConfigService } from '../integration-config.service';

@Injectable()
export class SyncJobsService {
  private readonly logger = new Logger(SyncJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dhaService: DhaService,
    private readonly config: IntegrationConfigService,
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
}
