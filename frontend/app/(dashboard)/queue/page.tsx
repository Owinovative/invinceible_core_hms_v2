"use client";

import { Activity, Clock3, Users } from "lucide-react";
import { useQueueStats, useTodayQueue } from "@/hooks/use-queue";
import { QueueTable } from "@/components/queue/queue-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useScope } from "@/providers/scope-provider";

function StatCard({
  title,
  value,
  icon,
  isLoading,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <Card className="rounded-[1.5rem] surface-spotlight shadow-md">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-20 rounded-xl" />
          ) : (
            <p className="mt-2 text-2xl font-bold">{value}</p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export default function QueuePage() {
  const { data, isLoading } = useTodayQueue();
  const { data: stats, isLoading: statsLoading } = useQueueStats();
  const { facilityName, selectedBranchName } = useScope();

  const queueItems = data ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-module">
              Live Flow
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Clock3 className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Queue
                </h1>
                <p className="text-muted-foreground">
                  Real-time patient queue in the active scope
                </p>
              </div>
            </div>
          </div>

          <Card className="w-full max-w-md rounded-[1.5rem] border bg-background/70">
            <CardContent className="grid grid-cols-2 gap-4 p-4">
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
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Total Queue"
          value={stats?.total ?? 0}
          icon={<Users className="h-6 w-6 text-primary" />}
          isLoading={statsLoading}
        />
        <StatCard
          title="Waiting"
          value={stats?.waiting ?? 0}
          icon={<Clock3 className="h-6 w-6 text-primary" />}
          isLoading={statsLoading}
        />
        <StatCard
          title="In Progress"
          value={stats?.inProgress ?? 0}
          icon={<Activity className="h-6 w-6 text-primary" />}
          isLoading={statsLoading}
        />
      </section>

      <QueueTable items={queueItems} isLoading={isLoading} />
    </div>
  );
}
