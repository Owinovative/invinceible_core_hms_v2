// Core interfaces
export type { BaseClinicalEvent, EventCategory, EventPriority, EventGovernance, EventMetadata } from './interfaces/base-clinical-event.interface';

// Registry
export { ClinicalEventTypes, EVENT_REGISTRY } from './registry/event-registry';
export type { EventRegistryEntry, EventSchema, ClinicalEventType } from './registry/event-registry';
export { EventRegistryService } from './registry/event-registry.service';

// Core services
export { EventPublisher } from './event-publisher';
export { EventSerializer } from './serialization/event-serializer';
export { EventValidator } from './validation/event-validator';

// Subscribers & Dispatcher
export { SubscribeClinicalEvent, CLINICAL_EVENT_SUBSCRIBER_KEY } from './subscribers/subscribe.decorator';
export type { SubscribeOptions } from './subscribers/subscribe.decorator';
export type { SubscriberHandler } from './subscribers/subscriber-registry.service';
export { SubscriberRegistry } from './subscribers/subscriber-registry.service';
export { EventDispatcher } from './dispatcher/event-dispatcher.service';

// Module
export { EventBusModule } from './event-bus.module';
