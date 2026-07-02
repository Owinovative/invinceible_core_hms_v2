"use client";

import { Bell, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { useNotificationStats } from "@/hooks/use-notification-stats";
import { MetricCard } from "@/components/dashboard/metric-card";

export function NotificationStatsCards() {
  const { data } = useNotificationStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Total Notifications"
        value={data?.total ?? 0}
        subtitle="All notifications in the system"
        icon={Bell}
        chip="All"
        glowClassName="from-pulse/10 to-emerald-500/10"
      />

      <MetricCard
        title="Unread"
        value={data?.unread ?? 0}
        subtitle="Unread alerts and messages"
        icon={AlertTriangle}
        chip="Attention"
        chipClassName="bg-amber-500/10 text-warning"
        glowClassName="from-amber-500/10 to-orange-500/10"
      />

      <MetricCard
        title="Resolved"
        value={data?.resolved ?? 0}
        subtitle="Resolved notifications"
        icon={CheckCircle2}
        chip="Closed"
        chipClassName="bg-success/10 text-success"
        glowClassName="from-emerald-500/10 to-pulse/10"
      />

      <MetricCard
        title="Critical"
        value={data?.severity?.critical ?? 0}
        subtitle="Critical severity notifications"
        icon={ShieldAlert}
        chip="Critical"
        chipClassName="bg-red-500/10 text-destructive"
        glowClassName="from-red-500/10 to-rose-500/10"
      />
    </div>
  );
}
