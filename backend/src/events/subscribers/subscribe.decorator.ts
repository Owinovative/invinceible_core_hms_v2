import { SetMetadata } from '@nestjs/common';
import type { ClinicalEventType } from '../registry/event-registry';

export const CLINICAL_EVENT_SUBSCRIBER_KEY = 'clinical_event_subscriber';

export interface SubscribeOptions {
  /**
   * The version of the event payload this subscriber expects.
   * If omitted, defaults to the latest version at registration time.
   */
  version?: number;
  
  /**
   * Defines how failures should be handled relative to the event's lifecycle.
   * - CRITICAL: A failure blocks the event from completing. It will be retried.
   * - NORMAL: A failure triggers standard backoff retries.
   * - OPTIONAL: A failure may log a warning and skip, allowing the event to complete.
   */
  isolationLevel?: 'CRITICAL' | 'NORMAL' | 'OPTIONAL';
}

/**
 * Decorator to mark a method as a subscriber to a clinical event.
 * @param eventType The type of event to subscribe to.
 * @param options Subscription configuration (version, isolationLevel, etc.).
 */
export const SubscribeClinicalEvent = (
  eventType: ClinicalEventType,
  options: SubscribeOptions = { isolationLevel: 'NORMAL' },
) => SetMetadata(CLINICAL_EVENT_SUBSCRIBER_KEY, { eventType, options });
