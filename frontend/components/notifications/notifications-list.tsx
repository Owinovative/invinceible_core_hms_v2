"use client";

import * as React from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { NotificationItem } from "@/types/notification";
import type { NotificationQueryParams } from "@/services/notification-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMarkNotificationRead } from "@/hooks/use-mark-notification-read";
import { useMarkNotificationsRead } from "@/hooks/use-mark-notifications-read";
import { useResolveNotification } from "@/hooks/use-resolve-notification";

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSeverityClass(severity?: string | null) {
  const value = (severity || "").toUpperCase();

  if (value === "CRITICAL") return "bg-destructive-soft text-destructive";
  if (value === "WARNING") return "bg-warning-soft text-warning";
  return "bg-info-soft text-info";
}

function getSeverityIcon(severity?: string | null) {
  const value = (severity || "").toUpperCase();

  if (value === "CRITICAL") {
    return <ShieldAlert className="h-5 w-5 text-red-500" />;
  }

  if (value === "WARNING") {
    return <TriangleAlert className="h-5 w-5 text-amber-500" />;
  }

  return <Bell className="h-5 w-5 text-cyan-500" />;
}

export function NotificationsList({
  items,
  isLoading,
  scope,
}: {
  items: NotificationItem[];
  isLoading?: boolean;
  scope?: NotificationQueryParams;
}) {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<
    "all" | "unread" | "resolved" | "critical"
  >("all");
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkNotificationsRead();
  const resolveMutation = useResolveNotification();

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.title,
          item.message,
          item.notificationType,
          item.severity,
          item.moduleName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      if (!matchesSearch) return false;

      if (filter === "unread") {
        return item.isRead === false;
      }

      if (filter === "resolved") {
        return item.isResolved === true;
      }

      if (filter === "critical") {
        return (item.severity || "").toUpperCase() === "CRITICAL";
      }

      return true;
    });
  }, [items, search, filter]);

  const counts = React.useMemo(() => {
    return {
      all: items.length,
      unread: items.filter((item) => item.isRead === false).length,
      resolved: items.filter((item) => item.isResolved === true).length,
      critical: items.filter(
        (item) => (item.severity || "").toUpperCase() === "CRITICAL",
      ).length,
    };
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Alerts Feed</h2>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative w-full md:w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="h-11 rounded-2xl pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setFilter("all")}
            >
              All {counts.all}
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setFilter("unread")}
            >
              Unread {counts.unread}
            </Button>
            <Button
              variant={filter === "critical" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setFilter("critical")}
            >
              Critical {counts.critical}
            </Button>
            <Button
              variant={filter === "resolved" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setFilter("resolved")}
            >
              Resolved {counts.resolved}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={
                counts.unread === 0 || markAllReadMutation.isPending || isLoading
              }
              onClick={() => markAllReadMutation.mutate(scope)}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Mark read
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.6rem] border surface-spotlight shadow-md p-5"
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Skeleton className="h-5 w-40 rounded-lg" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-28 rounded-lg" />
                      <Skeleton className="h-4 w-24 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          : filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.6rem] border surface-spotlight shadow-md p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                    {getSeverityIcon(item.severity)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold">
                            {item.title || "Notification"}
                          </p>

                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              getSeverityClass(item.severity),
                            )}
                          >
                            {(item.severity || "INFO").toUpperCase()}
                          </span>

                          {item.isResolved ? (
                            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                              Resolved
                            </span>
                          ) : item.isRead === false ? (
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-module">
                              Unread
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                              Read
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="h-4 w-4" />
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.message || "No message"}
                    </p>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-3 py-1 font-medium">
                          {item.notificationType || "GENERAL"}
                        </span>
                        {item.moduleName ? (
                          <span className="rounded-full bg-muted px-3 py-1 font-medium">
                            {item.moduleName}
                          </span>
                        ) : null}
                        {item.entityType ? (
                          <span className="rounded-full bg-muted px-3 py-1 font-medium">
                            {item.entityType}
                          </span>
                        ) : null}
                        {item.resolvedAt ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolved {formatDateTime(item.resolvedAt)}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.isRead === false ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={markReadMutation.isPending}
                            onClick={() => markReadMutation.mutate(item.id)}
                          >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Read
                          </Button>
                        ) : null}

                        {!item.isResolved ? (
                          <Button
                            size="sm"
                            className="rounded-xl"
                            disabled={resolveMutation.isPending}
                            onClick={() =>
                              resolveMutation.mutate({
                                id: item.id,
                                payload: {
                                  resolutionNote:
                                    "Resolved from notifications center",
                                },
                              })
                            }
                          >
                            Resolve
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

        {!isLoading && filteredItems.length === 0 ? (
          <div className="rounded-[1.8rem] border surface-spotlight shadow-md">
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-success/10">
                <Bell className="h-7 w-7 text-success" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight">
                No notifications yet
              </h3>
              <p className="mt-2 max-w-xl text-muted-foreground">
                New operational alerts, stock warnings, billing issues, and
                other notifications will appear here.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
