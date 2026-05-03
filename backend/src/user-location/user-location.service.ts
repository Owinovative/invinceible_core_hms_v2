import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type { PreciseLocationDto } from './dto/precise-location.dto';

type LocationEventType = 'LOGIN' | 'REQUEST' | 'LOGOUT' | 'PRECISE';

type RequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
};

type GeoSnapshot = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  isp?: string | null;
  org?: string | null;
  timezone?: string | null;
  confidence?: number | null;
  source?: string | null;
  rawResponse?: unknown;
};

type UserAgentSnapshot = {
  deviceType?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
};

type CaptureInput = {
  user: RequestUser;
  req?: RequestLike;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  eventType?: LocationEventType;
  precise?: PreciseLocationDto;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const LIVE_WINDOW_MS = 1000 * 60 * 10;
const REQUEST_CAPTURE_THROTTLE_MS = 1000 * 45;

@Injectable()
export class UserLocationService {
  private readonly requestCaptureThrottle = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async captureRequest(
    req: RequestLike,
    user?: RequestUser,
    statusCode?: number,
  ) {
    if (!user?.userId) return;

    await this.capture({
      user,
      req,
      statusCode,
      eventType: 'REQUEST',
    });
  }

  async captureLogin(user: RequestUser, meta?: Partial<CaptureInput>) {
    await this.capture({
      user,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      route: meta?.route ?? '/auth/login',
      method: meta?.method ?? 'POST',
      statusCode: 200,
      eventType: 'LOGIN',
    });
  }

  async markLogout(user: RequestUser, req?: RequestLike) {
    await this.capture({
      user,
      req,
      route: req ? this.routeFromRequest(req) : '/auth/logout',
      method: req?.method ?? 'POST',
      statusCode: 200,
      eventType: 'LOGOUT',
    });

    return { message: 'User location session marked as logged out.' };
  }

  async recordPreciseLocation(
    user: RequestUser,
    dto: PreciseLocationDto,
    req?: RequestLike,
  ) {
    await this.capture({
      user,
      req,
      route: req ? this.routeFromRequest(req) : '/user-locations/precise',
      method: req?.method ?? 'POST',
      statusCode: 200,
      eventType: 'PRECISE',
      precise: dto,
    });

    return { message: 'Precise location snapshot recorded.' };
  }

  async getPlatformOverview() {
    const liveSince = new Date(Date.now() - LIVE_WINDOW_MS);
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24);

    const [profiles, recentEvents] = await Promise.all([
      this.prisma.userLocationProfile.findMany({
        include: {
          user: {
            include: {
              role: true,
              homeFacility: true,
              homeBranch: true,
              staff: {
                include: {
                  facility: true,
                  branch: true,
                },
              },
            },
          },
        },
        orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
        take: 150,
      }),
      this.prisma.userLocationEvent.findMany({
        where: { occurredAt: { gte: since } },
        include: {
          user: {
            include: {
              role: true,
              homeFacility: true,
              homeBranch: true,
            },
          },
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 300,
      }),
    ]);

    const liveProfiles = profiles.filter(
      (profile) => profile.isOnline && profile.lastSeenAt >= liveSince,
    );

    return {
      generatedAt: new Date().toISOString(),
      liveWindowMinutes: Math.round(LIVE_WINDOW_MS / 60000),
      summary: {
        liveUsers: liveProfiles.length,
        trackedProfiles: profiles.length,
        events24h: recentEvents.length,
        countries: this.countUnique(profiles.map((item) => item.country)),
        cities: this.countUnique(profiles.map((item) => item.city)),
      },
      aggregates: {
        countries: this.aggregateBy(profiles, (item) => item.country),
        cities: this.aggregateBy(profiles, (item) => item.city),
        devices: this.aggregateBy(profiles, (item) => item.deviceType),
        browsers: this.aggregateBy(profiles, (item) => item.browser),
        routes: this.aggregateBy(recentEvents, (item) => item.route),
        hourlyActivity: this.hourlyActivity(recentEvents),
      },
      profiles: profiles.map((profile) => ({
        id: profile.id,
        sessionId: profile.sessionId,
        userId: profile.userId,
        username: profile.user?.username ?? null,
        fullName: profile.user?.fullName ?? null,
        roleCode: profile.user?.role?.code ?? null,
        facility:
          profile.user?.homeFacility?.name ?? profile.user?.staff?.facility?.name ?? null,
        branch:
          profile.user?.homeBranch?.name ?? profile.user?.staff?.branch?.name ?? null,
        isOnline: profile.isOnline && profile.lastSeenAt >= liveSince,
        storedOnlineFlag: profile.isOnline,
        loginAt: profile.loginAt,
        lastSeenAt: profile.lastSeenAt,
        loggedOutAt: profile.loggedOutAt,
        lastRoute: profile.lastRoute,
        lastMethod: profile.lastMethod,
        lastStatusCode: profile.lastStatusCode,
        ipAddress: profile.ipAddress,
        country: profile.country,
        region: profile.region,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        accuracyMeters: profile.accuracyMeters,
        isp: profile.isp,
        org: profile.org,
        timezone: profile.timezone,
        confidence: profile.confidence,
        geolocationSource: profile.geolocationSource,
        deviceType: profile.deviceType,
        browser: profile.browser,
        operatingSystem: profile.operatingSystem,
        eventCount: profile.eventCount,
      })),
      recentEvents: recentEvents.slice(0, 80).map((event) => ({
        id: event.id,
        userId: event.userId,
        username: event.user?.username ?? null,
        fullName: event.user?.fullName ?? null,
        roleCode: event.user?.role?.code ?? null,
        sessionId: event.sessionId,
        eventType: event.eventType,
        route: event.route,
        method: event.method,
        statusCode: event.statusCode,
        ipAddress: event.ipAddress,
        country: event.country,
        region: event.region,
        city: event.city,
        latitude: event.latitude,
        longitude: event.longitude,
        isp: event.isp,
        org: event.org,
        confidence: event.confidence,
        deviceType: event.deviceType,
        browser: event.browser,
        operatingSystem: event.operatingSystem,
        occurredAt: event.occurredAt,
      })),
    };
  }

  async getPlatformEvents(take = 150) {
    const safeTake = Math.min(Math.max(Number(take) || 150, 1), 500);

    return this.prisma.userLocationEvent.findMany({
      include: {
        user: {
          include: {
            role: true,
            homeFacility: true,
            homeBranch: true,
          },
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: safeTake,
    });
  }

  private async capture(input: CaptureInput) {
    const now = new Date();
    const ipAddress = this.normalizeIp(
      input.ipAddress ?? (input.req ? this.ipFromRequest(input.req) : undefined),
    );
    const userAgent =
      input.userAgent ?? this.header(input.req, 'user-agent') ?? null;
    const route = input.route ?? (input.req ? this.routeFromRequest(input.req) : null);
    const method =
      input.method ?? (input.req?.method ? input.req.method.toUpperCase() : null);
    const eventType = input.eventType ?? 'REQUEST';
    const sessionId = this.sessionId(input.user);

    if (
      eventType === 'REQUEST' &&
      this.shouldThrottleRequestCapture(sessionId, route, method, now)
    ) {
      return;
    }

    const device = this.parseUserAgent(userAgent);
    const geo = input.precise
      ? await this.mergePreciseGeo(ipAddress, input.precise)
      : await this.geolocateIp(ipAddress);
    const rawSnapshot = {
      route,
      method,
      statusCode: input.statusCode ?? null,
      ipAddress,
      userAgent,
      geo: {
        country: geo.country ?? null,
        region: geo.region ?? null,
        city: geo.city ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        accuracyMeters: geo.accuracyMeters ?? null,
        source: geo.source ?? null,
        confidence: geo.confidence ?? null,
      },
      device,
      capturedAt: now.toISOString(),
    };

    const common = {
      userId: input.user.userId,
      sessionId,
      sessionVersion: input.user.sessionVersion ?? null,
      lastSeenAt: now,
      lastRoute: route,
      lastMethod: method,
      lastStatusCode: input.statusCode ?? null,
      ipAddress,
      userAgent,
      country: geo.country ?? null,
      region: geo.region ?? null,
      city: geo.city ?? null,
      latitude: geo.latitude ?? null,
      longitude: geo.longitude ?? null,
      accuracyMeters: geo.accuracyMeters ?? null,
      isp: geo.isp ?? null,
      org: geo.org ?? null,
      timezone: geo.timezone ?? null,
      confidence: geo.confidence ?? null,
      geolocationSource: geo.source ?? null,
      deviceType: device.deviceType ?? null,
      browser: device.browser ?? null,
      operatingSystem: device.operatingSystem ?? null,
    };

    await this.prisma.$transaction([
      this.prisma.userLocationProfile.upsert({
        where: { sessionId },
        create: {
          ...common,
          isOnline: eventType !== 'LOGOUT',
          loginAt: eventType === 'LOGIN' ? now : now,
          loggedOutAt: eventType === 'LOGOUT' ? now : null,
          eventCount: 1,
        },
        update: {
          ...common,
          isOnline: eventType !== 'LOGOUT',
          loggedOutAt: eventType === 'LOGOUT' ? now : null,
          ...(eventType === 'LOGIN' ? { loginAt: now } : {}),
          eventCount: { increment: 1 },
        },
      }),
      this.prisma.userLocationEvent.create({
        data: {
          userId: input.user.userId,
          sessionId,
          eventType,
          route,
          method,
          statusCode: input.statusCode ?? null,
          ipAddress,
          userAgent,
          country: geo.country ?? null,
          region: geo.region ?? null,
          city: geo.city ?? null,
          latitude: geo.latitude ?? null,
          longitude: geo.longitude ?? null,
          accuracyMeters: geo.accuracyMeters ?? null,
          isp: geo.isp ?? null,
          org: geo.org ?? null,
          timezone: geo.timezone ?? null,
          confidence: geo.confidence ?? null,
          geolocationSource: geo.source ?? null,
          deviceType: device.deviceType ?? null,
          browser: device.browser ?? null,
          operatingSystem: device.operatingSystem ?? null,
          rawSnapshot,
          occurredAt: now,
        },
      }),
    ]);
  }

  private async mergePreciseGeo(
    ipAddress: string | null,
    dto: PreciseLocationDto,
  ): Promise<GeoSnapshot> {
    const ipGeo = await this.geolocateIp(ipAddress);

    return {
      ...ipGeo,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracyMeters: dto.accuracyMeters ?? null,
      confidence: 0.99,
      source: 'BROWSER_PRECISE',
    };
  }

  private async geolocateIp(ipAddress: string | null): Promise<GeoSnapshot> {
    if (!ipAddress) {
      return {
        country: 'Unknown',
        city: 'Unknown',
        confidence: 0.05,
        source: 'UNKNOWN',
      };
    }

    if (this.isPrivateIp(ipAddress)) {
      const localGeo = {
        country: 'Local network',
        region: 'Private address',
        city: 'Internal workstation',
        confidence: 1,
        source: 'LOCAL_PRIVATE_IP',
      };

      await this.cacheGeo(ipAddress, localGeo);
      return localGeo;
    }

    const cached = await this.prisma.ipGeolocationCache.findUnique({
      where: { ipAddress },
    });

    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
      return {
        country: cached.country,
        region: cached.region,
        city: cached.city,
        latitude: cached.latitude,
        longitude: cached.longitude,
        isp: cached.isp,
        org: cached.org,
        timezone: cached.timezone,
        confidence: cached.confidence,
        source: cached.source,
        rawResponse: cached.rawResponse,
      };
    }

    const lookedUp = await this.lookupPublicIp(ipAddress);
    await this.cacheGeo(ipAddress, lookedUp);

    return lookedUp;
  }

  private async lookupPublicIp(ipAddress: string): Promise<GeoSnapshot> {
    const ipinfoToken = this.configService.get<string>('IPINFO_TOKEN')?.trim();
    const ipapiKey = this.configService.get<string>('IPAPI_KEY')?.trim();
    const allowIpApi =
      this.configService.get<string>('ENABLE_PUBLIC_IP_GEOLOOKUP') === 'true';

    try {
      if (ipinfoToken) {
        const response = await fetch(
          `https://ipinfo.io/${encodeURIComponent(ipAddress)}/json?token=${encodeURIComponent(
            ipinfoToken,
          )}`,
        );
        const payload = (await response.json()) as any;
        if (response.ok) {
          const [latitude, longitude] = String(payload.loc ?? '')
            .split(',')
            .map((value) => Number(value));

          return {
            country: payload.country ?? null,
            region: payload.region ?? null,
            city: payload.city ?? null,
            latitude: Number.isFinite(latitude) ? latitude : null,
            longitude: Number.isFinite(longitude) ? longitude : null,
            isp: payload.org ?? null,
            org: payload.org ?? null,
            timezone: payload.timezone ?? null,
            confidence: 0.78,
            source: 'IPINFO',
            rawResponse: payload,
          };
        }
      }

      if (ipapiKey) {
        const response = await fetch(
          `https://api.ipapi.com/${encodeURIComponent(
            ipAddress,
          )}?access_key=${encodeURIComponent(ipapiKey)}`,
        );
        const payload = (await response.json()) as any;
        if (response.ok && !payload.error) {
          return {
            country: payload.country_name ?? payload.country_code ?? null,
            region: payload.region_name ?? null,
            city: payload.city ?? null,
            latitude: this.numberOrNull(payload.latitude),
            longitude: this.numberOrNull(payload.longitude),
            isp: payload.connection?.isp ?? null,
            org: payload.connection?.organization ?? null,
            timezone: payload.time_zone?.id ?? null,
            confidence: 0.74,
            source: 'IPAPI',
            rawResponse: payload,
          };
        }
      }

      if (allowIpApi) {
        const response = await fetch(
          `http://ip-api.com/json/${encodeURIComponent(
            ipAddress,
          )}?fields=status,message,country,regionName,city,lat,lon,isp,org,timezone,query`,
        );
        const payload = (await response.json()) as any;
        if (response.ok && payload.status === 'success') {
          return {
            country: payload.country ?? null,
            region: payload.regionName ?? null,
            city: payload.city ?? null,
            latitude: this.numberOrNull(payload.lat),
            longitude: this.numberOrNull(payload.lon),
            isp: payload.isp ?? null,
            org: payload.org ?? null,
            timezone: payload.timezone ?? null,
            confidence: 0.7,
            source: 'IP_API',
            rawResponse: payload,
          };
        }
      }
    } catch {
      // Request logging should never fail because an external geolocation lookup is unavailable.
    }

    return {
      country: 'Unknown',
      city: 'Unknown',
      confidence: 0.1,
      source: 'UNRESOLVED',
    };
  }

  private cacheGeo(ipAddress: string, geo: GeoSnapshot) {
    return this.prisma.ipGeolocationCache.upsert({
      where: { ipAddress },
      create: {
        ipAddress,
        country: geo.country ?? null,
        region: geo.region ?? null,
        city: geo.city ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        isp: geo.isp ?? null,
        org: geo.org ?? null,
        timezone: geo.timezone ?? null,
        confidence: geo.confidence ?? null,
        source: geo.source ?? null,
        rawResponse: this.safeJson(geo.rawResponse),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
      update: {
        country: geo.country ?? null,
        region: geo.region ?? null,
        city: geo.city ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        isp: geo.isp ?? null,
        org: geo.org ?? null,
        timezone: geo.timezone ?? null,
        confidence: geo.confidence ?? null,
        source: geo.source ?? null,
        rawResponse: this.safeJson(geo.rawResponse),
        lastLookedUpAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    });
  }

  private sessionId(user: RequestUser) {
    if (user.sessionId) return user.sessionId;
    return `u:${user.userId}:sv:${user.sessionVersion ?? 0}`;
  }

  private shouldThrottleRequestCapture(
    sessionId: string,
    route: string | null,
    method: string | null,
    now: Date,
  ) {
    if (method && method !== 'GET') return false;

    const cleanRoute = String(route ?? '')
      .replace(/\?.*$/, '')
      .slice(0, 180);
    const key = `${sessionId}:${method ?? 'GET'}:${cleanRoute}`;
    const currentTime = now.getTime();
    const previousTime = this.requestCaptureThrottle.get(key);

    if (
      previousTime &&
      currentTime - previousTime < REQUEST_CAPTURE_THROTTLE_MS
    ) {
      return true;
    }

    this.requestCaptureThrottle.set(key, currentTime);

    if (this.requestCaptureThrottle.size > 3000) {
      const cutoff = currentTime - REQUEST_CAPTURE_THROTTLE_MS * 4;
      for (const [entryKey, timestamp] of this.requestCaptureThrottle) {
        if (timestamp < cutoff) this.requestCaptureThrottle.delete(entryKey);
      }
    }

    return false;
  }

  private routeFromRequest(req: RequestLike) {
    return String(req.originalUrl ?? req.url ?? '').slice(0, 500);
  }

  private ipFromRequest(req: RequestLike) {
    const cloudflare = this.header(req, 'cf-connecting-ip');
    if (cloudflare) return cloudflare;

    const realIp = this.header(req, 'x-real-ip');
    if (realIp) return realIp;

    const forwarded = this.header(req, 'x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim();

    return req.ip ?? req.socket?.remoteAddress ?? null;
  }

  private normalizeIp(ip?: string | null) {
    if (!ip) return null;
    let cleaned = String(ip).trim();

    if (!cleaned) return null;
    if (cleaned.startsWith('::ffff:')) cleaned = cleaned.replace('::ffff:', '');
    if (cleaned === '::1' || cleaned === 'localhost') return '127.0.0.1';
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(cleaned)) {
      cleaned = cleaned.split(':')[0];
    }

    return cleaned.slice(0, 100);
  }

  private header(req: RequestLike | undefined, key: string) {
    const value = req?.headers?.[key] ?? req?.headers?.[key.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private isPrivateIp(ipAddress: string) {
    if (
      ipAddress === '127.0.0.1' ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('fc') ||
      ipAddress.startsWith('fd') ||
      ipAddress.startsWith('fe80:')
    ) {
      return true;
    }

    const parts = ipAddress.split('.').map((part) => Number(part));
    return (
      parts.length === 4 &&
      parts[0] === 172 &&
      Number.isFinite(parts[1]) &&
      parts[1] >= 16 &&
      parts[1] <= 31
    );
  }

  private parseUserAgent(userAgent?: string | null): UserAgentSnapshot {
    const value = String(userAgent ?? '');
    const lower = value.toLowerCase();

    const deviceType = /ipad|tablet/.test(lower)
      ? 'Tablet'
      : /mobile|android|iphone/.test(lower)
        ? 'Mobile'
        : value
          ? 'Desktop'
          : 'Unknown';

    const browser = lower.includes('edg/')
      ? 'Microsoft Edge'
      : lower.includes('opr/') || lower.includes('opera')
        ? 'Opera'
        : lower.includes('chrome/')
          ? 'Chrome'
          : lower.includes('firefox/')
            ? 'Firefox'
            : lower.includes('safari/')
              ? 'Safari'
              : 'Unknown';

    const operatingSystem = lower.includes('windows')
      ? 'Windows'
      : lower.includes('mac os') || lower.includes('macintosh')
        ? 'macOS'
        : lower.includes('iphone') || lower.includes('ipad')
          ? 'iOS'
          : lower.includes('android')
            ? 'Android'
            : lower.includes('linux')
              ? 'Linux'
              : 'Unknown';

    return { deviceType, browser, operatingSystem };
  }

  private aggregateBy<T>(items: T[], selector: (item: T) => string | null | undefined) {
    const counts = new Map<string, number>();

    for (const item of items) {
      const key = selector(item)?.trim() || 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }

  private hourlyActivity(items: Array<{ occurredAt: Date }>) {
    const counts = new Map<string, number>();

    for (const item of items) {
      const hour = new Date(item.occurredAt);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  private countUnique(values: Array<string | null | undefined>) {
    return new Set(values.filter((value) => value && value !== 'Unknown')).size;
  }

  private numberOrNull(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private safeJson(value: unknown) {
    if (value === undefined) return undefined;
    return value as any;
  }
}
