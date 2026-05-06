import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from './redis-connection.service';

type MemoryCounter = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitService {
  private readonly memory = new Map<string, MemoryCounter>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisConnection: RedisConnectionService,
  ) {}

  async consume(key: string, limit: number, ttlSeconds?: number) {
    const ttl = Math.max(
      1,
      ttlSeconds ??
        Number(this.configService.get<string>('RATE_LIMIT_TTL_SECONDS') ?? 60),
    );
    const redisKey = `${this.configService.get<string>('CACHE_PREFIX') || 'inv_hms'}:rl:${key}`;
    const redis = this.redisConnection.getClient();

    if (redis) {
      try {
        const count = await redis.incr(redisKey);
        if (count === 1) await redis.expire(redisKey, ttl);
        const remainingTtl = await redis.ttl(redisKey);
        const retryAfter = remainingTtl > 0 ? remainingTtl : ttl;
        return {
          allowed: count <= limit,
          limit,
          remaining: Math.max(limit - count, 0),
          retryAfter,
        };
      } catch (error) {
        this.redisConnection.logFallback(
          'Redis rate limit failed; using memory fallback',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    return this.consumeMemory(redisKey, limit, ttl);
  }

  private consumeMemory(key: string, limit: number, ttlSeconds: number) {
    const now = Date.now();
    const existing = this.memory.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + ttlSeconds * 1000;
      this.memory.set(key, { count: 1, resetAt });
      this.pruneMemory(now);
      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - 1, 0),
        retryAfter: ttlSeconds,
      };
    }

    existing.count += 1;
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return {
      allowed: existing.count <= limit,
      limit,
      remaining: Math.max(limit - existing.count, 0),
      retryAfter,
    };
  }

  private pruneMemory(now: number) {
    if (this.memory.size < 25_000) return;

    for (const [key, value] of this.memory.entries()) {
      if (value.resetAt <= now) this.memory.delete(key);
      if (this.memory.size < 20_000) break;
    }
  }
}
