"use client";

import * as React from "react";
import { useTerminologyMetrics, useTriggerTerminologySync } from "@/hooks/use-terminology";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Database,
  RefreshCw,
  Server,
  BookOpen,
  CheckCircle2,
  XCircle,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TerminologyAdminDashboard() {
  const { data: metrics, isLoading, isError } = useTerminologyMetrics();
  const triggerSync = useTriggerTerminologySync();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading terminology metrics...</p>
        </div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-destructive">
        <XCircle className="mr-2 h-5 w-5" />
        Failed to load terminology metrics. Is the backend running?
      </div>
    );
  }

  const {
    totalConcepts,
    totalSources,
    totalCollections,
    activeVersions,
    recentSyncs,
    coverage,
    latency,
    lastSuccessfulSync
  } = metrics;

  return (
    <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terminology Engine</h1>
          <p className="text-muted-foreground">
            DHA interoperability hub & clinical coding management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => triggerSync.mutate()}
            disabled={triggerSync.isPending}
            className="gap-2 rounded-2xl"
          >
            <RefreshCw className={cn("h-4 w-4", triggerSync.isPending && "animate-spin")} />
            Sync Collections
          </Button>
        </div>
      </div>

      {/* KEY METRICS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Concepts</p>
                <h3 className="text-2xl font-bold">{totalConcepts.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Value Sets / Collections</p>
                <h3 className="text-2xl font-bold">{totalCollections}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upstream Sources</p>
                <h3 className="text-2xl font-bold">{totalSources}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Latency</p>
                <h3 className="text-2xl font-bold">{latency.averageSyncDurationMs}ms</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COVERAGE & COMPLIANCE */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg">DHA Interoperability Coverage</CardTitle>
            <CardDescription>Percentage of clinical records utilizing standardized coding</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Consultations (Diagnosis)</span>
                <span className="text-muted-foreground">{coverage.consultations.coded} / {coverage.consultations.total}</span>
              </div>
              <Progress value={coverage.consultations.percentage} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">SHA Claims (Diagnosis)</span>
                <span className="text-muted-foreground">{coverage.claims.coded} / {coverage.claims.total}</span>
              </div>
              <Progress value={coverage.claims.percentage} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Pharmacy Catalog (ICD-11/KEML)</span>
                <span className="text-muted-foreground">{coverage.medicines.coded} / {coverage.medicines.total}</span>
              </div>
              <Progress value={coverage.medicines.percentage} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Lab Tests (LOINC)</span>
                <span className="text-muted-foreground">{coverage.labTests.coded} / {coverage.labTests.total}</span>
              </div>
              <Progress value={coverage.labTests.percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* SYNC HISTORY */}
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Synchronization History</CardTitle>
            <CardDescription>Last sync: {formatTime(lastSuccessfulSync?.date)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSyncs.slice(0, 5).map((sync: any) => (
                <div key={sync.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    {sync.status === "SUCCESS" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : sync.status === "IN_PROGRESS" ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{sync.targetSystem || "All Collections"}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(sync.startedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={sync.status === "SUCCESS" ? "default" : sync.status === "IN_PROGRESS" ? "secondary" : "destructive"}>
                      {sync.status}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      +{sync.conceptsAdded} / ~{sync.conceptsUpdated} ({sync.durationMs}ms)
                    </p>
                  </div>
                </div>
              ))}
              {recentSyncs.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No synchronization history available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
