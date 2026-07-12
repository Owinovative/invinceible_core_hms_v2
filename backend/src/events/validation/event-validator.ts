import { Injectable, Logger } from '@nestjs/common';
import { EventRegistryService } from '../registry/event-registry.service';
import type { BaseClinicalEvent } from '../interfaces/base-clinical-event.interface';

/**
 * EventValidator — performs schema-level validation on events before publication.
 *
 * Validation pipeline:
 * 1. Registry check — event type must be registered.
 * 2. Deprecation check — warn if deprecated.
 * 3. Schema validation — required fields must be present.
 * 4. Facility isolation — facilityId must be set.
 */
@Injectable()
export class EventValidator {
  private readonly logger = new Logger(EventValidator.name);

  constructor(private readonly registry: EventRegistryService) {}

  /**
   * Validate an event before it is persisted to the outbox.
   * Throws on any hard validation failure.
   * Logs warnings for soft violations (e.g., deprecated events).
   */
  validate(event: BaseClinicalEvent): void {
    // 1. Registry check
    if (!this.registry.isRegistered(event.eventType)) {
      throw new Error(
        `EventValidator: Event type "${event.eventType}" is not registered in the Event Registry. ` +
        `All events must be registered before publishing.`,
      );
    }

    // 2. Deprecation warning
    this.registry.warnIfDeprecated(event.eventType);

    // 3. Schema validation
    const errors = this.registry.validatePayload(
      event.eventType,
      event.eventVersion,
      event.payload as Record<string, unknown>,
    );
    if (errors.length > 0) {
      throw new Error(
        `EventValidator: Payload validation failed for "${event.eventType}" v${event.eventVersion}:\n` +
        errors.join('\n'),
      );
    }

    // 4. Facility isolation
    if (!event.facilityId || event.facilityId <= 0) {
      throw new Error(
        `EventValidator: Event "${event.eventType}" is missing a valid facilityId. ` +
        `All events must be scoped to a facility.`,
      );
    }

    // 5. Timestamp sanity check
    const ageMs = Date.now() - event.timestamp.getTime();
    if (ageMs > 5 * 60 * 1000) {
      this.logger.warn(
        `EventValidator: Event "${event.eventType}" (${event.eventId}) has an old timestamp ` +
        `(${Math.round(ageMs / 1000)}s ago). Possible clock skew or delayed replay.`,
      );
    }

    this.logger.debug(`EventValidator: Event "${event.eventType}" passed validation.`);
  }
}
