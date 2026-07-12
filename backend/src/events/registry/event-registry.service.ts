import { Injectable, Logger } from '@nestjs/common';
import { EVENT_REGISTRY, type EventRegistryEntry } from './event-registry';

/**
 * EventRegistryService — runtime accessor for the Event Registry.
 * Provides lookup, validation, schema retrieval, and compatibility checks.
 */
@Injectable()
export class EventRegistryService {
  private readonly logger = new Logger(EventRegistryService.name);

  /**
   * Check if an event type is registered.
   */
  isRegistered(eventType: string): boolean {
    return eventType in EVENT_REGISTRY;
  }

  /**
   * Get the full registry entry for an event type.
   * Throws if the event type is not registered — fail-fast validation.
   */
  getEntry(eventType: string): EventRegistryEntry {
    const entry = EVENT_REGISTRY[eventType];
    if (!entry) {
      throw new Error(
        `EventRegistry: Unknown event type "${eventType}". ` +
        `All events must be registered before publishing.`,
      );
    }
    return entry;
  }

  /**
   * Retrieve the schema for a specific event type and version.
   */
  getSchema(eventType: string, version: number) {
    const entry = this.getEntry(eventType);
    const schema = entry.schemas[version];
    if (!schema) {
      throw new Error(
        `EventRegistry: No schema found for event "${eventType}" at version ${version}. ` +
        `Current version is ${entry.currentVersion}.`,
      );
    }
    return schema;
  }

  /**
   * Get the current (latest) version for an event type.
   */
  getCurrentVersion(eventType: string): number {
    return this.getEntry(eventType).currentVersion;
  }

  /**
   * Validate that a payload conforms to the registered schema.
   * Returns an array of validation errors (empty = valid).
   */
  validatePayload(eventType: string, version: number, payload: Record<string, unknown>): string[] {
    const schema = this.getSchema(eventType, version);
    const errors: string[] = [];

    for (const field of schema.requiredFields) {
      if (payload[field] === undefined || payload[field] === null) {
        errors.push(`Required field "${field}" is missing in payload for event "${eventType}" v${version}.`);
      }
    }

    return errors;
  }

  /**
   * Get the compatibility matrix: which subscribers consume this event.
   */
  getSubscribers(eventType: string): string[] {
    return this.getEntry(eventType).knownSubscribers;
  }

  /**
   * Returns all registered events with their governance metadata.
   * Used by the monitoring dashboard.
   */
  getAllEntries(): EventRegistryEntry[] {
    return Object.values(EVENT_REGISTRY);
  }

  /**
   * Check if an event is deprecated.
   */
  isDeprecated(eventType: string): boolean {
    const entry = this.getEntry(eventType);
    return entry.governance.approvalStatus === 'DEPRECATED';
  }

  /**
   * Log a warning if a deprecated event is being published.
   */
  warnIfDeprecated(eventType: string): void {
    if (this.isDeprecated(eventType)) {
      this.logger.warn(
        `EventRegistry: Publishing deprecated event "${eventType}". ` +
        `Please consult the Event Governance Board for migration guidance.`,
      );
    }
  }
}
