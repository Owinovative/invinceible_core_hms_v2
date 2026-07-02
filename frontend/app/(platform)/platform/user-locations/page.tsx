"use client";

import * as React from "react";
import {
  Activity,
  Clock3,
  Download,
  ExternalLink,
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
import { Input } from "@/components/ui/input";
import { useUserLocationOverview } from "@/hooks/use-user-location-overview";
import type {
  UserLocationAggregate,
  UserLocationEvent,
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

function hasCoordinates(profile?: UserLocationProfile | null) {
  if (!profile) return false;
  return (
    Number.isFinite(Number(profile.latitude)) &&
    Number.isFinite(Number(profile.longitude))
  );
}

function googleMapsEmbed(profile: UserLocationProfile) {
  return `https://www.google.com/maps?q=${profile.latitude},${profile.longitude}&z=14&output=embed`;
}

function googleMapsLink(profile: UserLocationProfile) {
  return `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`;
}

function escapeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(fileName: string, rows: unknown[][]) {
  const csvText = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csvText}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function matchesDateRange(
  value: string | null | undefined,
  fromDate: string,
  toDate: string,
) {
  const day = dateOnly(value);
  if (!day) return !fromDate && !toDate;
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}

function matchesText(profile: UserLocationProfile, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    profile.fullName,
    profile.username,
    profile.roleCode,
    profile.facility,
    profile.branch,
    profile.city,
    profile.country,
    profile.ipAddress,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function matchesEventText(event: UserLocationEvent, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    event.fullName,
    event.username,
    event.roleCode,
    event.route,
    event.eventType,
    event.city,
    event.country,
    event.ipAddress,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
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
  const [query, setQuery] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [selectedProfileId, setSelectedProfileId] = React.useState<number | null>(
    null,
  );
  const profiles = data?.profiles ?? [];
  const recentEvents = data?.recentEvents ?? [];
  const filteredProfiles = profiles.filter(
    (profile) =>
      matchesText(profile, query) &&
      matchesDateRange(profile.lastSeenAt, fromDate, toDate),
  );
  const filteredEvents = recentEvents.filter(
    (event) =>
      matchesEventText(event, query) &&
      matchesDateRange(event.occurredAt, fromDate, toDate),
  );
  const plottedProfiles = filteredProfiles.filter((profile) =>
    positionPoint(profile),
  );
  const selectedProfile =
    filteredProfiles.find((profile) => profile.id === selectedProfileId) ??
    plottedProfiles[0] ??
    filteredProfiles[0] ??
    null;
  const selectedHasCoordinates = hasCoordinates(selectedProfile);

  const handleDownloadCsv = () => {
    downloadCsv("user-location-report.csv", [
      [
        "user",
        "username",
        "role",
        "facility",
        "branch",
        "online",
        "lastSeenAt",
        "loggedOutAt",
        "route",
        "method",
        "ipAddress",
        "country",
        "region",
        "city",
        "latitude",
        "longitude",
        "accuracyMeters",
        "isp",
        "org",
        "confidence",
        "source",
        "device",
        "browser",
        "os",
        "eventCount",
      ],
      ...filteredProfiles.map((profile) => [
        userName(profile),
        profile.username ?? "",
        profile.roleCode ?? "",
        profile.facility ?? "",
        profile.branch ?? "",
        profile.isOnline ? "yes" : "no",
        profile.lastSeenAt,
        profile.loggedOutAt ?? "",
        profile.lastRoute ?? "",
        profile.lastMethod ?? "",
        profile.ipAddress ?? "",
        profile.country ?? "",
        profile.region ?? "",
        profile.city ?? "",
        profile.latitude ?? "",
        profile.longitude ?? "",
        profile.accuracyMeters ?? "",
        profile.isp ?? "",
        profile.org ?? "",
        profile.confidence ?? "",
        profile.geolocationSource ?? "",
        profile.deviceType ?? "",
        profile.browser ?? "",
        profile.operatingSystem ?? "",
        profile.eventCount,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card p-6 text-foreground shadow-xl md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr] xl:items-end">
          <div className="space-y-5">
            <Badge className="rounded-md border border-border bg-surface-2 px-3 py-1 font-mono text-module">
              super-admin-only / live-location-intelligence
            </Badge>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2">
                <Radar className="h-7 w-7 text-module" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  User Location Control
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Tracks authenticated sessions by user, session version,
                  request route, device, network, and cached IP geolocation.
                  The last captured location remains available after logout.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <Wifi className="mb-3 h-5 w-5 text-success" />
              <p className="text-3xl font-bold">
                {data?.summary.liveUsers ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                live within {data?.liveWindowMinutes ?? 10} min
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <Activity className="mb-3 h-5 w-5 text-module" />
              <p className="text-3xl font-bold">
                {data?.summary.events24h ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">events in 24h</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <Globe2 className="mb-3 h-5 w-5 text-warning" />
              <p className="text-3xl font-bold">
                {data?.summary.cities ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">cities detected</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-lg border border-border bg-card">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1.2fr_0.55fr_0.55fr_auto_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium">
              User, route, city, IP, or facility
            </label>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracked activity"
              className="h-11 rounded-md"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-11 rounded-md"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-11 rounded-md"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md"
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
          <Button
            type="button"
            className="h-11 rounded-md bg-primary text-white hover:bg-brand-strong"
            onClick={handleDownloadCsv}
            disabled={filteredProfiles.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden rounded-[1.3rem] surface-spotlight shadow-md">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <LocateFixed className="h-5 w-5 text-cyan-500" />
                Google Maps Location View
              </CardTitle>
              {selectedProfile && selectedHasCoordinates ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-md"
                >
                  <a
                    href={googleMapsLink(selectedProfile)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open map
                  </a>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="min-h-[390px] overflow-hidden rounded-md border border-border bg-muted">
                {selectedProfile && selectedHasCoordinates ? (
                  <iframe
                    title={`Google map for ${userName(selectedProfile)}`}
                    src={googleMapsEmbed(selectedProfile)}
                    className="h-[390px] w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="flex min-h-[390px] items-center justify-center p-8 text-center text-sm leading-6 text-muted-foreground">
                    No latitude and longitude coordinates match the current
                    filters. IP-only sessions still appear in the table below.
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border bg-background">
                <div className="border-b border-border p-3">
                  <p className="text-sm font-semibold">Tracked users</p>
                  <p className="text-xs text-muted-foreground">
                    {filteredProfiles.length} matching profiles
                  </p>
                </div>
                <div className="max-h-[336px] overflow-auto p-2">
                  {filteredProfiles.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      No users match the filters.
                    </p>
                  ) : (
                    filteredProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSelectedProfileId(profile.id)}
                        className={`mb-2 w-full border px-3 py-2 text-left text-sm transition last:mb-0 ${
                          selectedProfile?.id === profile.id
                            ? "border-border-strong bg-surface-2 text-foreground"
                            : "border-border bg-card hover:border-border-strong"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">
                            {userName(profile)}
                          </span>
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              profile.isOnline
                                ? "bg-success"
                                : "bg-slate-400"
                            }`}
                          />
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {profile.city || "Unknown city"} /{" "}
                          {profile.ipAddress || "No IP"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
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
        <Card className="rounded-[1.3rem] surface-spotlight shadow-md">
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
            ) : filteredProfiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No user location profiles match the current filters.
              </div>
            ) : (
              <div className="max-h-[640px] overflow-auto rounded-lg border border-border">
                <div className="sticky top-0 z-10 grid min-w-[1120px] grid-cols-[1.1fr_0.9fr_0.95fr_1fr_1.2fr] bg-muted px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
                  <span>User</span>
                  <span>Facility</span>
                  <span>Location</span>
                  <span>Device</span>
                  <span>Last route</span>
                </div>
                <div className="min-w-[1120px]">
                  {filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="grid grid-cols-[1.1fr_0.9fr_0.95fr_1fr_1.2fr] gap-4 border-t border-border px-4 py-4 text-sm"
                    >
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              profile.isOnline
                                ? "bg-success"
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
                        <p className="mt-2 font-mono text-xs text-module">
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
                              ? "bg-success/10 text-success"
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

        <Card className="rounded-[1.3rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-cyan-500" />
              Request Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[640px] space-y-3 overflow-auto pr-1">
              {filteredEvents.slice(0, 40).map((event) => (
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
                    <Badge className="rounded-full border-0 bg-cyan-500/10 text-module">
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

              {filteredEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No request stream events match the current filters.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[1.2rem] border border-warning/35/20 bg-amber-500/8 p-4 text-sm leading-6 text-muted-foreground">
        Optional browser-precise location is supported by the backend endpoint,
        but the system does not force browser GPS prompts. IP location is cached
        and linked to authenticated session IDs, not treated as user identity.
      </section>
    </div>
  );
}
