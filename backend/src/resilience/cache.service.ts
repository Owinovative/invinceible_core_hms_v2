import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from './redis-connection.service';
import { SafeLoggerService } from './safe-logger.service';

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

export type CacheScope = {
  facilityId?: number | string | null;
  branchId?: number | string | null;
  roleCode?: string | null;
  userId?: number | string | null;
  extra?: string | null;
};

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) =>
        `${key}:${stableSerialize((value as Record<string, unknown>)[key])}`,
    )
    .join('|');
}

@Injectable()
export class CacheService {
  private readonly memory = new Map<string, MemoryEntry>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisConnection: RedisConnectionService,
    private readonly logger: SafeLoggerService,
  ) {}

  private get prefix() {
    return this.configService.get<string>('CACHE_PREFIX') || 'inv_hms';
  }

  private get defaultTtl() {
    return Number(
      this.configService.get<string>('CACHE_DEFAULT_TTL_SECONDS') ?? 60,
    );
  }

  private get memoryMaxItems() {
    return Number(
      this.configService.get<string>('CACHE_IN_MEMORY_MAX_ITEMS') ?? 10_000,
    );
  }

  makeKey(parts: unknown[]) {
    return [this.prefix, ...parts.map(stableSerialize)]
      .join(':')
      .replace(/\s+/g, '_')
      .slice(0, 480);
  }

  makeScopedKey(scope: CacheScope, key: string) {
    return this.makeKey([
      'scoped',
      `facility=${scope.facilityId ?? 'all'}`,
      `branch=${scope.branchId ?? 'all'}`,
      `role=${scope.roleCode ?? 'unknown'}`,
      scope.userId ? `user=${scope.userId}` : 'user=shared',
      scope.extra ?? '',
      key,
    ]);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const redis = this.redisConnection.getClient();
    if (redis) {
      try {
        const value = await redis.get(key);
        if (value !== null) {
          this.logger.debug('Cache hit', { key, backend: 'redis' });
          return JSON.parse(value) as T;
        }
      } catch (error) {
        this.redisConnection.logFallback(
          'Redis cache get failed; using memory fallback',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    const entry = this.memory.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return undefined;
    }

    this.logger.debug('Cache hit', { key, backend: 'memory' });
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = this.defaultTtl) {
    const safeTtl = Math.max(1, ttlSeconds);
    const serialized = JSON.stringify(value);
    const redis = this.redisConnection.getClient();

    if (redis) {
      try {
        await redis.set(key, serialized, 'EX', safeTtl);
        return;
      } catch (error) {
        this.redisConnection.logFallback(
          'Redis cache set failed; using memory fallback',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.setMemory(key, serialized, safeTtl);
  }

  async setIfAbsent<T>(key: string, value: T, ttlSeconds = this.defaultTtl) {
    const safeTtl = Math.max(1, ttlSeconds);
    const serialized = JSON.stringify(value);
    const redis = this.redisConnection.getClient();

    if (redis) {
      try {
        const response = await redis.set(key, serialized, 'EX', safeTtl, 'NX');
        return response === 'OK';
      } catch (error) {
        this.redisConnection.logFallback(
          'Redis set-if-absent failed; using memory fallback',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    const existing = this.memory.get(key);
    if (existing && existing.expiresAt > Date.now()) return false;
    this.setMemory(key, serialized, safeTtl);
    return true;
  }

  async del(key: string) {
    const redis = this.redisConnection.getClient();
    if (redis) {
      await redis.del(key).catch((error) =>
        this.redisConnection.logFallback('Redis cache del failed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    this.memory.delete(key);
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = loader()
      .then(async (value) => {
        await this.set(key, value, ttlSeconds);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  rememberScoped<T>(
    scope: CacheScope,
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ) {
    return this.getOrSet<T>(this.makeScopedKey(scope, key), ttlSeconds, loader);
  }

  async invalidatePattern(pattern: string) {
    const redis = this.redisConnection.getClient();
    const safePattern = pattern.includes('*') ? pattern : `${pattern}*`;

    if (redis) {
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(
            cursor,
            'MATCH',
            safePattern,
            'COUNT',
            200,
          );
          cursor = nextCursor;
          if (keys.length) await redis.del(...keys);
        } while (cursor !== '0');
      } catch (error) {
        this.redisConnection.logFallback('Redis pattern invalidation failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const key of this.memory.keys()) {
      if (this.patternMatches(key, safePattern)) this.memory.delete(key);
    }
  }

  private setMemory(key: string, value: string, ttlSeconds: number) {
    if (this.memory.size >= this.memoryMaxItems) {
      const firstKey = this.memory.keys().next().value as string | undefined;
      if (firstKey) this.memory.delete(firstKey);
    }

    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private patternMatches(key: string, pattern: string) {
    const regex = new RegExp(
      `^${pattern.split('*').map(this.escapeRegExp).join('.*')}$`,
    );
    return regex.test(key);
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
