"use client";

import * as React from "react";
import {
  Activity,
  Clock3,
  Globe2,
  Loader2,
  LocateFixed,
  MapPin,
  Monitor,
  Network,
  Radar,
  RefreshCw,
  Route,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserLocationOverview } from "@/hooks/use-user-location-overview";
import type {
  UserLocationAggregate,
  UserLocationProfile,
} from "@/services/user-location-service";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function confidenceLabel(value?: number | null) {
  if (!value) return "unknown";
  return `${Math.round(value * 100)}%`;
}

function userName(profile: UserLocationProfile) {
  return profile.fullName || profile.username || `User #${profile.userId}`;
}

function positionPoint(profile: UserLocationProfile) {
  const lat = Number(profile.latitude);
  const lng = Number(profile.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    left: `${Math.min(96, Math.max(4, ((lng + 180) / 360) * 100))}%`,
    top: `${Math.min(92, Math.max(8, ((90 - lat) / 180) * 100))}%`,
  };
}

function AggregateBars({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: UserLocationAggregate[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <Card className="rounded-[1.1rem] border-border/70 bg-background/78">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-cyan-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No data captured yet.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium">{item.label}</span>
                <span className="font-mono text-muted-foreground">
                  {item.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${Math.max(10, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function PlatformUserLocationsPage() {
  const { data, isLoading, isFetching, refetch } = useUserLocationOverview();
  const profiles = data?.profiles ?? [];
  const liveProfiles = profiles.filter((profile) => profile.isOnline);
  const plottedProfiles = profiles.filter((profile) => positionPoint(profile));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-cyan-300/15 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,.22),transparent_26%),linear-gradient(125deg,rgba(2,6,23,.98),rgba(8,47,73,.78),rgba(6,78,59,.54))]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(34,211,238,.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,.14)_1px,transparent_1px)] [background-size:30px_30px]" />

        <div className="relative grid gap-6 xl:grid-cols-[1fr_0.9fr] xl:items-end">
          <div className="space-y-5">
            <Badge className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-cyan-100">
              super-admin-only / live-location-intelligence
            </Badge>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10">
                <Radar className="h-7 w-7 text-cyan-200" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  User Location Control
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/68">
                  Tracks authenticated sessions by user, session version,
                  request route, device, network, and cached IP geolocation.
                  The last captured location remains available after logout.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-cyan-300/14 bg-white/[0.06] p-4">
              <Wifi className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="text-3xl font-bold">
                {data?.summary.liveUsers ?? 0}
              </p>
              <p className="text-xs text-white/55">
                live within {data?.liveWindowMinutes ?? 10} min
              </p>
            </div>
            <div className="rounded-xl border border-cyan-300/14 bg-white/[0.06] p-4">
              <Activity className="mb-3 h-5 w-5 text-cyan-200" />
              <p className="text-3xl font-bold">
                {data?.summary.events24h ?? 0}
              </p>
              <p className="text-xs text-white/55">events in 24h</p>
            </div>
            <div className="rounded-xl border border-cyan-300/14 bg-white/[0.06] p-4">
              <Globe2 className="mb-3 h-5 w-5 text-amber-200" />
              <p className="text-3xl font-bold">
                {data?.summary.cities ?? 0}
              </p>
              <p className="text-xs text-white/55">cities detected</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden rounded-[1.3rem] gradient-border panel-shadow">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <LocateFixed className="h-5 w-5 text-cyan-500" />
                Location Heat Surface
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[360px] overflow-hidden rounded-[1.1rem] border border-border bg-slate-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(34,211,238,.15),transparent_32%),linear-gradient(135deg,rgba(8,47,73,.55),rgba(2,6,23,.98))]" />
              <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(34,211,238,.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,197,94,.12)_1px,transparent_1px)] [background-size:42px_42px]" />
              <div className="absolute inset-x-8 top-1/2 h-px bg-cyan-300/20" />
              <div className="absolute inset-y-8 left-1/2 w-px bg-cyan-300/20" />

              {plottedProfiles.length === 0 ? (
                <div className="relative z-10 flex min-h-[360px] items-center justify-center p-8 text-center text-sm text-white/60">
                  No latitude and longitude points yet. IP-only private network
                  sessions still appear in the live session table below.
                </div>
              ) : (
                plottedProfiles.map((profile) => {
                  const position = positionPoint(profile);
                  if (!position) return null;

                  return (
                    <div
                      key={profile.id}
                      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                      style={position}
                    >
                      <span
                        className={`block h-4 w-4 rounded-full ring-4 ${
                          profile.isOnline
                            ? "bg-emerald-300 ring-emerald-300/22"
                            : "bg-cyan-300 ring-cyan-300/20"
                        }`}
                      />
                      <div className="pointer-events-none absolute left-4 top-4 hidden w-64 rounded-lg border border-cyan-300/20 bg-slate-950/95 p-3 text-xs text-white shadow-2xl group-hover:block">
                        <p className="font-semibold">{userName(profile)}</p>
                        <p className="mt-1 text-white/60">
                          {profile.city || "Unknown city"},{" "}
                          {profile.country || "Unknown country"}
                        </p>
                        <p className="mt-2 font-mono text-cyan-200">
                          {profile.latitude?.toFixed(4)},{" "}
                          {profile.longitude?.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <AggregateBars
            title="Countries"
            items={data?.aggregates.countries ?? []}
            icon={Globe2}
          />
          <AggregateBars
            title="Devices"
            items={data?.aggregates.devices ?? []}
            icon={Monitor}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <AggregateBars
          title="Cities"
          items={data?.aggregates.cities ?? []}
          icon={MapPin}
        />
        <AggregateBars
          title="Browsers"
          items={data?.aggregates.browsers ?? []}
          icon={Monitor}
        />
        <AggregateBars
          title="Routes touched"
          items={data?.aggregates.routes ?? []}
          icon={Route}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.3rem] gradient-border panel-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Live and Last Seen Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border p-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tracked sessions...
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No user location profiles have been captured yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid min-w-[980px] grid-cols-[1.1fr_0.9fr_0.95fr_1fr_1.2fr] bg-muted/60 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
                  <span>User</span>
                  <span>Facility</span>
                  <span>Location</span>
                  <span>Device</span>
                  <span>Last route</span>
                </div>
                <div className="max-h-[620px] min-w-[980px] overflow-y-auto">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="grid grid-cols-[1.1fr_0.9fr_0.95fr_1fr_1.2fr] gap-4 border-t border-border px-4 py-4 text-sm"
                    >
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              profile.isOnline
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <p className="font-semibold">{userName(profile)}</p>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {profile.roleCode || "ROLE"} / {profile.username}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Last seen {formatDate(profile.lastSeenAt)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">
                          {profile.facility || "No facility"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {profile.branch || "No branch"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">
                          {profile.city || "Unknown city"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {profile.region || "Unknown region"} /{" "}
                          {profile.country || "Unknown country"}
                        </p>
                        <p className="mt-2 font-mono text-xs text-cyan-600 dark:text-cyan-300">
                          confidence {confidenceLabel(profile.confidence)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">
                          {profile.deviceType || "Unknown device"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {profile.browser || "Unknown browser"} /{" "}
                          {profile.operatingSystem || "Unknown OS"}
                        </p>
                        <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                          {profile.ipAddress || "No IP"}
                        </p>
                      </div>
                      <div>
                        <Badge
                          className={`mb-2 rounded-full border-0 ${
                            profile.isOnline
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-500/10 text-muted-foreground"
                          }`}
                        >
                          {profile.isOnline ? "LIVE" : "LAST LOCATION"}
                        </Badge>
                        <p className="break-all font-mono text-xs">
                          {profile.lastMethod || "GET"}{" "}
                          {profile.lastRoute || "No route captured"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {profile.eventCount} tracked events
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.3rem] gradient-border panel-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-cyan-500" />
              Request Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.recentEvents ?? []).slice(0, 18).map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-border bg-background/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {event.fullName || event.username || "Tracked user"}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {event.method || "GET"} {event.route || "route unknown"}
                      </p>
                    </div>
                    <Badge className="rounded-full border-0 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
                      {event.eventType}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>{event.city || "Unknown city"}</span>
                    <span>{event.browser || "Unknown browser"}</span>
                    <span>{event.ipAddress || "No IP"}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(event.occurredAt)}
                    </span>
                  </div>
                </div>
              ))}

              {(data?.recentEvents ?? []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No request stream captured yet.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[1.2rem] border border-amber-300/20 bg-amber-500/8 p-4 text-sm leading-6 text-muted-foreground">
        Optional browser-precise location is supported by the backend endpoint,
        but the system does not force browser GPS prompts. IP location is cached
        and linked to authenticated session IDs, not treated as user identity.
      </section>
    </div>
  );
}
