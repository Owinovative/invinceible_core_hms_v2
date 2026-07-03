"use client";

import * as React from "react";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useMarkNotificationRead } from "@/hooks/use-mark-notification-read";
import { useResolveNotification } from "@/hooks/use-resolve-notification";
import { useAuth } from "@/providers/auth-provider";
import type { NotificationItem } from "@/services/notification-service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function severityClass(severity?: string | null) {
  if (severity === "CRITICAL") {
    return "bg-red-500/10 text-destructive";
  }
  if (severity === "WARNING") {
    return "bg-amber-500/10 text-warning";
  }
  return "bg-cyan-500/10 text-module";
}

export function NotificationsTable() {
  const { data, isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const resolveMutation = useResolveNotification();
  const { user } = useAuth();

  const items = React.useMemo<NotificationItem[]>(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 8;

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.title,
        item.message,
        item.notificationType,
        item.severity,
        item.moduleName,
        item.facility?.name,
        item.branch?.name,
        item.targetUser?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, search]);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedItems = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Cross-facility platform notifications and alerts
          </p>
        </div>

        <div className="relative w-full md:w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="h-11 rounded-2xl pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border surface-spotlight shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px]">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Notification
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Scope
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Target
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Severity
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  State
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-11 w-11 rounded-2xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48 rounded-lg" />
                            <Skeleton className="h-3 w-60 rounded-lg" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24 rounded-lg" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-9 w-28 rounded-xl" /></td>
                    </tr>
                  ))
                : pagedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10">
                            <Bell className="h-5 w-5 text-module" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">{item.title}</p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {item.message}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.moduleName || "GENERAL"} {item.notificationType ? `• ${item.notificationType}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <div>
                          <p>{item.facility?.name || "Global"}</p>
                          <p className="text-muted-foreground">
                            {item.branch?.name || "All branches / none"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <div>
                          <p>{item.targetUser?.username || "No user target"}</p>
                          <p className="text-muted-foreground">
                            {item.targetStaff
                              ? `${item.targetStaff.firstName || ""} ${item.targetStaff.lastName || ""}`.trim()
                              : "No staff target"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", severityClass(item.severity))}>
                          {item.severity || "INFO"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              item.isRead
                                ? "bg-success/10 text-success"
                                : "bg-amber-500/10 text-warning",
                            )}
                          >
                            {item.isRead ? "Read" : "Unread"}
                          </span>

                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              item.isResolved
                                ? "bg-cyan-500/10 text-module"
                                : "bg-red-500/10 text-destructive",
                            )}
                          >
                            {item.isResolved ? "Resolved" : "Open"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {!item.isRead ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => markReadMutation.mutate(item.id)}
                              disabled={markReadMutation.isPending}
                            >
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Mark Read
                            </Button>
                          ) : null}

                          {!item.isResolved ? (
                            <Button
                              size="sm"
                              className="rounded-xl"
                              onClick={() =>
                                resolveMutation.mutate({
                                  id: item.id,
                                  payload: {
                                    resolutionNote: "Resolved from platform center",
                                  },
                                })
                              }
                              disabled={resolveMutation.isPending}
                            >
                              Resolve
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-lg font-semibold">No notifications found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send or wait for platform notifications to appear here.
            </p>
          </div>
        ) : null}
      </div>

      {!isLoading && filteredItems.length > 0 ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{pagedItems.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{filteredItems.length}</span>{" "}
            notifications
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={safePage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="rounded-xl border px-4 py-2 text-sm font-medium">
              {safePage} / {totalPages}
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              disabled={safePage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
