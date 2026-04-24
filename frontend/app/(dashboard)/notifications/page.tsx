"use client";

import { Bell, CheckCircle2, CircleAlert, RadioTower } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationStats } from "@/hooks/use-notification-stats";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { Badge } from "@/components/ui/badge";
import { useScope } from "@/providers/scope-provider";

export default function NotificationsPage() {
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } =
    useScope();
  const scope = { facilityId, branchId: selectedBranchId };
  const { data, isLoading } = useNotifications(scope);
  const { data: stats } = useNotificationStats(scope);

  const notifications = data ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 panel-shadow md:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400/70 to-cyan-400/0" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-blue-600/10 px-3 py-1 text-blue-700 dark:text-blue-300">
              Live alerts
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Bell className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Notifications
                </h1>
              </div>
            </div>
          </div>

          <div className="grid w-full max-w-xl grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Facility</p>
              <p className="truncate font-semibold">
                {facilityName || "No facility"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Branch</p>
              <p className="truncate font-semibold">
                {selectedBranchName || "No branch"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unread</p>
              <p className="flex items-center gap-1 font-semibold">
                <CircleAlert className="h-4 w-4 text-amber-400" />
                {stats?.unread ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="flex items-center gap-1 font-semibold">
                <RadioTower className="h-4 w-4 text-cyan-400" />
                {stats?.unresolved ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 panel-shadow">
          <p className="text-sm text-muted-foreground">Critical</p>
          <p className="mt-2 text-3xl font-bold">{stats?.severity.critical ?? 0}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 panel-shadow">
          <p className="text-sm text-muted-foreground">Warnings</p>
          <p className="mt-2 text-3xl font-bold">{stats?.severity.warning ?? 0}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 panel-shadow">
          <p className="text-sm text-muted-foreground">Resolved</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-bold">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            {stats?.resolved ?? 0}
          </p>
        </div>
      </section>

      <NotificationsList items={notifications} isLoading={isLoading} scope={scope} />
    </div>
  );
}
