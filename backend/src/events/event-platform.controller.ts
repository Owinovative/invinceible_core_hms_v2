import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EventReplayService, ReplayMode, ReplayFilters } from './replay/event-replay.service';
import { EventTimelineService, TimelineFilters } from './timeline/event-timeline.service';
import { EventMetricsService } from './observability/event-metrics.service';
import { EventHealthService } from './observability/event-health.service';
import { DeadLetterQueueService } from './dlq/dead-letter-queue.service';
import { EventFeatureFlagsService } from './feature-flags/event-feature-flags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/admin/event-platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SYSTEM_ADMIN', 'SUPERADMIN')
export class EventPlatformController {
  constructor(
    private readonly replayService: EventReplayService,
    private readonly timelineService: EventTimelineService,
    private readonly metricsService: EventMetricsService,
    private readonly healthService: EventHealthService,
    private readonly dlqService: DeadLetterQueueService,
    private readonly flagsService: EventFeatureFlagsService,
  ) {}

  // === Metrics & Observability ===
  
  @Get('metrics')
  async getMetrics() {
    return this.metricsService.getMetricsSnapshot();
  }

  @Get('health')
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('feature-flags')
  getFeatureFlags() {
    return this.flagsService.getSnapshot();
  }

  // === Timeline Projections ===

  @Get('timeline/patient/:patientId')
  async getPatientTimeline(@Param('patientId') patientId: string, @Query() filters: any) {
    return this.timelineService.getPatientTimeline(Number(patientId), filters as TimelineFilters);
  }

  @Get('timeline/correlation/:correlationId')
  async getCorrelationTimeline(@Param('correlationId') correlationId: string, @Query() filters: any) {
    return this.timelineService.getCorrelationTimeline(correlationId, filters as TimelineFilters);
  }

  // === Dead Letter Queue ===

  @Get('dlq/pending')
  async getPendingDlq(@Query('limit') limit = 100) {
    return this.dlqService.getPendingEvents(Number(limit));
  }

  @Post('dlq/:id/replay')
  async replayDlqEvent(@Param('id') id: string, @Body('mode') mode: any = 'FULL') {
    await this.replayService.replayFromDlq(Number(id), mode as ReplayMode);
    return { success: true, message: `DLQ Event ${id} replayed successfully in ${mode} mode` };
  }

  @Post('dlq/:id/archive')
  async archiveDlqEvent(@Param('id') id: string, @Body('notes') notes: string) {
    await this.dlqService.archiveEvent(Number(id), 'AdminUser', notes);
    return { success: true };
  }

  @Post('dlq/:id/ignore')
  async ignoreDlqEvent(@Param('id') id: string, @Body('notes') notes: string) {
    await this.dlqService.ignoreEvent(Number(id), 'AdminUser', notes);
    return { success: true };
  }

  // === Replay Engine ===

  @Post('replay')
  async initiateReplay(
    @Body('mode') mode: any,
    @Body('filters') filters: any,
  ) {
    return this.replayService.replay(mode as ReplayMode, filters as ReplayFilters, 'AdminUser');
  }

  @Get('replay/jobs')
  async getReplayJobs(@Query('limit') limit = 50) {
    return this.replayService.getReplayJobs(Number(limit));
  }
}
