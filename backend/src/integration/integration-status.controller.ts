import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ScopeService } from '../auth/scope.service';
import { IntegrationConfigService } from './integration-config.service';
import { OUTBOUND_STATUS } from './integration.constants';
import { IntegrationQueueService } from './queue/integration-queue.service';

type QueueStat = Awaited<
  ReturnType<IntegrationQueueService['getStats']>
>[number];
type IntegrationHealth = 'healthy' | 'degraded' | 'failed' | 'offline';

interface IntegrationStatus {
  status: IntegrationHealth;
  pendingJobs: number;
  failedJobs: number;
  message?: string;
}

@Controller(['integrations', 'integration'])
@UseGuards(AuthGuard('jwt'))
export class IntegrationStatusController {
  constructor(
    private readonly queueService: IntegrationQueueService,
    private readonly config: IntegrationConfigService,
    private readonly scope: ScopeService,
  ) {}

  @Get('status')
  async getStatus(@CurrentUser() user: RequestUser) {
    const queue = await this.queueService.getStats(
      undefined,
      this.scope.buildBranchScopeWhere(user),
    );
    const dha = this.summarizeIntegration(
      queue,
      'DHA',
      this.config.dhaEnabled,
      `DHA is running in ${this.config.dhaMode} mode.`,
    );
    const etims = this.summarizeIntegration(
      queue,
      'ETIMS',
      this.config.etimsEnabled,
      `eTIMS is running in ${this.config.etimsMode} mode.`,
    );
    const enabledStatuses = [
      ...(this.config.dhaEnabled ? [dha] : []),
      ...(this.config.etimsEnabled ? [etims] : []),
    ];
    const queueDepth = queue
      .filter((item) =>
        [OUTBOUND_STATUS.PENDING, OUTBOUND_STATUS.PROCESSING].includes(
          item.status as
            | typeof OUTBOUND_STATUS.PENDING
            | typeof OUTBOUND_STATUS.PROCESSING,
        ),
      )
      .reduce((total, item) => total + item.count, 0);

    return {
      overall: this.overallStatus(enabledStatuses, queueDepth),
      dha,
      // SHA claims are exchanged through the DHA gateway in this application.
      sha: {
        ...dha,
        message: this.config.dhaEnabled
          ? `SHA claims use the DHA ${this.config.dhaMode} gateway.`
          : 'The DHA/SHA gateway is not enabled.',
      },
      etims,
      queueDepth,
      lastUpdated: new Date().toISOString(),
    };
  }

  private summarizeIntegration(
    queue: QueueStat[],
    integration: 'DHA' | 'ETIMS',
    enabled: boolean,
    enabledMessage: string,
  ): IntegrationStatus {
    const matching = queue.filter((item) => item.integration === integration);
    const pendingJobs = matching
      .filter((item) =>
        [OUTBOUND_STATUS.PENDING, OUTBOUND_STATUS.PROCESSING].includes(
          item.status as
            | typeof OUTBOUND_STATUS.PENDING
            | typeof OUTBOUND_STATUS.PROCESSING,
        ),
      )
      .reduce((total, item) => total + item.count, 0);
    const failedJobs = matching
      .filter((item) => item.status === OUTBOUND_STATUS.DEAD_LETTER)
      .reduce((total, item) => total + item.count, 0);

    if (!enabled) {
      return {
        status: 'offline',
        pendingJobs,
        failedJobs,
        message: `${integration} is not enabled.`,
      };
    }

    return {
      status: failedJobs > 0 ? 'degraded' : 'healthy',
      pendingJobs,
      failedJobs,
      message:
        failedJobs > 0 ? 'Some queued jobs need attention.' : enabledMessage,
    };
  }

  private overallStatus(
    statuses: IntegrationStatus[],
    queueDepth: number,
  ): 'healthy' | 'syncing' | 'warning' | 'failed' | 'offline' {
    if (statuses.length === 0) return 'offline';
    if (statuses.some((item) => item.status === 'failed')) return 'failed';
    if (statuses.some((item) => item.status === 'degraded')) return 'warning';
    if (queueDepth > 0) return 'syncing';
    return 'healthy';
  }
}
