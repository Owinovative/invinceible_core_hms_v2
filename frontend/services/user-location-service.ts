import { apiFetch } from "@/lib/api";

export interface UserLocationAggregate {
  label: string;
  count: number;
}

export interface UserLocationHourlyActivity {
  hour: string;
  count: number;
}

export interface UserLocationProfile {
  id: number;
  sessionId: string;
  userId?: number | null;
  username?: string | null;
  fullName?: string | null;
  roleCode?: string | null;
  facility?: string | null;
  branch?: string | null;
  isOnline: boolean;
  storedOnlineFlag: boolean;
  loginAt?: string | null;
  lastSeenAt: string;
  loggedOutAt?: string | null;
  lastRoute?: string | null;
  lastMethod?: string | null;
  lastStatusCode?: number | null;
  ipAddress?: string | null;
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
  geolocationSource?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  eventCount: number;
}

export interface UserLocationEvent {
  id: number;
  userId?: number | null;
  username?: string | null;
  fullName?: string | null;
  roleCode?: string | null;
  sessionId: string;
  eventType: string;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isp?: string | null;
  org?: string | null;
  confidence?: number | null;
  deviceType?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  occurredAt: string;
}

export interface UserLocationOverview {
  generatedAt: string;
  liveWindowMinutes: number;
  summary: {
    liveUsers: number;
    trackedProfiles: number;
    events24h: number;
    countries: number;
    cities: number;
  };
  aggregates: {
    countries: UserLocationAggregate[];
    cities: UserLocationAggregate[];
    devices: UserLocationAggregate[];
    browsers: UserLocationAggregate[];
    routes: UserLocationAggregate[];
    hourlyActivity: UserLocationHourlyActivity[];
  };
  profiles: UserLocationProfile[];
  recentEvents: UserLocationEvent[];
}

export function getUserLocationOverview() {
  return apiFetch<UserLocationOverview>("/user-locations/platform/overview");
}

export function markUserLocationLogout() {
  return apiFetch<{ message: string }>("/user-locations/logout", {
    method: "POST",
  });
}

export function recordPreciseUserLocation(payload: {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}) {
  return apiFetch<{ message: string }>("/user-locations/precise", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
