import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventPublisher } from './event-publisher';
import { EventRegistryService } from './registry/event-registry.service';
import { EventSerializer } from './serialization/event-serializer';
import { EventValidator } from './validation/event-validator';
import { EventDispatcher } from './dispatcher/event-dispatcher.service';
import { EventDeduplicator } from './dispatcher/event-deduplicator.service';
import { SubscriberRegistry } from './subscribers/subscriber-registry.service';
import { DiscoveryModule } from '@nestjs/core';

// Milestone 4
import { EventFeatureFlagsService } from './feature-flags/event-feature-flags.service';
import { EventReplayService } from './replay/event-replay.service';
import { DeadLetterQueueService } from './dlq/dead-letter-queue.service';
import { EventTimelineService } from './timeline/event-timeline.service';
import { EventMetricsService } from './observability/event-metrics.service';
import { EventHealthService } from './observability/event-health.service';
import { EventPlatformController } from './event-platform.controller';

/**
 * EventBusModule — Core Clinical Event Platform module.
 *
 * Marked @Global so EventPublisher and EventRegistryService are available
 * throughout the entire application without needing to import EventBusModule
 * in every feature module.
 *
 * Milestone 1 provides: Publisher, Registry, Validator, Serializer.
 * Milestone 2 will add: EventDispatcher, EventDeduplicator.
 * Milestone 4 will add: EventReplayService, EventMetricsService.
 */
@Global()
@Module({
  imports: [PrismaModule, DiscoveryModule],
  controllers: [EventPlatformController],
  providers: [
    EventPublisher,
    EventRegistryService,
    EventSerializer,
    EventValidator,
    EventDispatcher,
    EventDeduplicator,
    SubscriberRegistry,
    EventFeatureFlagsService,
    EventReplayService,
    DeadLetterQueueService,
    EventTimelineService,
    EventMetricsService,
    EventHealthService,
  ],
  exports: [
    EventPublisher,
    EventRegistryService,
    EventSerializer,
    EventValidator,
    EventDispatcher,
    SubscriberRegistry,
    EventFeatureFlagsService,
    EventReplayService,
    DeadLetterQueueService,
    EventTimelineService,
    EventMetricsService,
    EventHealthService,
  ],
})
export class EventBusModule {}
