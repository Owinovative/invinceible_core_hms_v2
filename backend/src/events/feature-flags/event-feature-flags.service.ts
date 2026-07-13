import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * EventFeatureFlagsService — Runtime feature toggles for the Clinical Event Platform.
 *
 * Reads from environment variables at runtime. No restart required for flag changes
 * if a dynamic config source (e.g., DB-backed feature flags) is wired later.
 */
@Injectable()
export class EventFeatureFlagsService {
  private readonly logger = new Logger(EventFeatureFlagsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Master toggle: enables/disables all event publishing.
   * Default: true
   */
  isEventBusEnabled(): boolean {
    return this.configService.get<string>('EVENT_BUS_ENABLED', 'true') === 'true';
  }

  /**
   * Enable event replay engine operations.
   * Default: true
   */
  isReplayEnabled(): boolean {
    return this.configService.get<string>('EVENT_REPLAY_ENABLED', 'true') === 'true';
  }

  /**
   * Enable simulation replay mode (in-memory, no DB/SHR side effects).
   * Default: true
   */
  isSimulationEnabled(): boolean {
    return this.configService.get<string>('EVENT_SIMULATION_ENABLED', 'true') === 'true';
  }

  /**
   * Enable incremental SHR publishing (publish only changed resources per event).
   * Default: false (full bundle publishing is the default)
   */
  isIncrementalPublishingEnabled(): boolean {
    return this.configService.get<string>('EVENT_INCREMENTAL_PUBLISHING', 'false') === 'true';
  }

  /**
   * Enable observability (metrics collection, health reporting).
   * Default: true
   */
  isObservabilityEnabled(): boolean {
    return this.configService.get<string>('EVENT_OBSERVABILITY_ENABLED', 'true') === 'true';
  }

  /**
   * Enable Dead Letter Queue auto-retry.
   * Default: true
   */
  isDlqAutoRetryEnabled(): boolean {
    return this.configService.get<string>('EVENT_DLQ_AUTO_RETRY', 'true') === 'true';
  }

  /**
   * Maximum number of DLQ auto-retry attempts before requiring manual intervention.
   * Default: 3
   */
  getDlqMaxAutoRetries(): number {
    return parseInt(this.configService.get<string>('EVENT_DLQ_MAX_RETRIES', '3'), 10);
  }

  /**
   * Returns a snapshot of all current flag states for observability/diagnostics.
   */
  getSnapshot(): Record<string, boolean | number> {
    return {
      eventBusEnabled: this.isEventBusEnabled(),
      replayEnabled: this.isReplayEnabled(),
      simulationEnabled: this.isSimulationEnabled(),
      incrementalPublishingEnabled: this.isIncrementalPublishingEnabled(),
      observabilityEnabled: this.isObservabilityEnabled(),
      dlqAutoRetryEnabled: this.isDlqAutoRetryEnabled(),
      dlqMaxAutoRetries: this.getDlqMaxAutoRetries(),
    };
  }
}
