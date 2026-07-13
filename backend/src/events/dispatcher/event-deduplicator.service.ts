import { Injectable, Logger } from '@nestjs/common';
import { RedisConnectionService } from '../../resilience/redis-connection.service';

/**
 * EventDeduplicator — ensures that an event UUID is never processed more than once.
 * 
 * Sits before the EventDispatcher processing loop. If a duplicate event arrives 
 * (e.g. from an upstream network retry of the business transaction), it is dropped silently 
 * *before* consuming subscriber resources.
 */
@Injectable()
export class EventDeduplicator {
  private readonly logger = new Logger(EventDeduplicator.name);
  
  // 7 days retention for deduplication keys.
  // After 7 days, we assume the retry window is closed.
  private readonly DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60; 

  constructor(private readonly redisConnection: RedisConnectionService) {}

  /**
   * Attempts to acquire a deduplication lock for the event.
   * Returns true if this is the FIRST time seeing this event (safe to process).
   * Returns false if this event has already been seen (duplicate).
   */
  async isUnique(eventId: string): Promise<boolean> {
    const redis = this.redisConnection.getClient();
    
    // If Redis is down, we fail open to ensure events are processed, 
    // relying on subscriber idempotency as a fallback.
    if (!redis) {
      this.logger.warn(`Redis unavailable. Bypassing deduplication for event ${eventId}.`);
      return true;
    }

    const key = `event_dedup:${eventId}`;
    
    try {
      // SETNX (set if not exists) via 'NX' option.
      // Returns 'OK' if set, null if key already existed.
      const result = await redis.set(key, '1', 'EX', this.DEDUP_TTL_SECONDS, 'NX');
      
      if (result === 'OK') {
        return true; // Key was set, event is unique
      } else {
        this.logger.debug(`Duplicate event detected and dropped: ${eventId}`);
        return false; // Key existed, duplicate event
      }
    } catch (error) {
      this.logger.error(`Failed to check deduplication for event ${eventId}`, error);
      return true; // Fail open
    }
  }
}
