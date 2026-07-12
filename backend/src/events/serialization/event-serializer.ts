import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import type { BaseClinicalEvent } from '../interfaces/base-clinical-event.interface';

/**
 * EventSerializer — handles serialization, deserialization, and signature
 * generation/validation for all clinical events.
 *
 * Security model:
 * - checksum: SHA-256 of serialized payload. Detects accidental payload mutation.
 * - signature: HMAC-SHA256(secret, eventId + eventType + timestamp.toISOString() + checksum).
 *   Detects deliberate tampering.
 */
@Injectable()
export class EventSerializer {
  private readonly logger = new Logger(EventSerializer.name);
  private readonly secret: string;

  constructor() {
    this.secret = process.env.EVENT_BUS_SECRET ?? 'default-dev-secret-change-in-production';
    if (this.secret === 'default-dev-secret-change-in-production') {
      this.logger.warn('EVENT_BUS_SECRET is not configured. Using insecure default. Set this in production!');
    }
  }

  /**
   * Computes a deterministic SHA-256 checksum of the payload.
   */
  computeChecksum(payload: unknown): string {
    const serialized = JSON.stringify(payload, Object.keys(payload as object).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Computes an HMAC-SHA256 signature for tamper detection.
   */
  computeSignature(eventId: string, eventType: string, timestamp: Date, checksum: string): string {
    const message = `${eventId}|${eventType}|${timestamp.toISOString()}|${checksum}`;
    return createHmac('sha256', this.secret).update(message).digest('hex');
  }

  /**
   * Validates the signature and checksum of an incoming event.
   * Returns true if the event is authentic and untampered.
   */
  verifyIntegrity(event: BaseClinicalEvent): boolean {
    const expectedChecksum = this.computeChecksum(event.payload);
    if (expectedChecksum !== event.checksum) {
      this.logger.error(`Checksum mismatch for event ${event.eventId}. Possible payload tampering.`);
      return false;
    }

    const expectedSignature = this.computeSignature(
      event.eventId,
      event.eventType,
      event.timestamp,
      event.checksum,
    );

    if (expectedSignature !== event.signature) {
      this.logger.error(`Signature mismatch for event ${event.eventId}. Possible message tampering.`);
      return false;
    }

    return true;
  }

  /**
   * Serializes an event to a JSON string for database or wire storage.
   */
  serialize(event: BaseClinicalEvent): string {
    return JSON.stringify(event);
  }

  /**
   * Deserializes a JSON string back to the event shape.
   * The returned object has its timestamp restored as a Date object.
   */
  deserialize(raw: string): BaseClinicalEvent {
    const parsed = JSON.parse(raw) as BaseClinicalEvent;
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp),
    };
  }
}
