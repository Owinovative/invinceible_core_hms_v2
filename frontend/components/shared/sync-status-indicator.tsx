"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
interface IntegrationStatus {
  status: "healthy" | "degraded" | "failed" | "offline";
  lastSync?: string | null;
  pendingJobs?: number;
  failedJobs?: number;
  message?: string | null;
}

interface SystemSyncStatus {
  overall: "healthy" | "syncing" | "warning" | "failed" | "offline";
  dha?: IntegrationStatus;
  sha?: IntegrationStatus;
  etims?: IntegrationStatus;
  queueDepth?: number;
  lastUpdated?: string;
}

/* ─────────────────────────────────────────────────────────────
   Fetch helper — gracefully returns a degraded status on error
───────────────────────────────────────────────────────────── */
async function fetchSyncStatus(): Promise<SystemSyncStatus> {
  try {
    return await apiFetch<SystemSyncStatus>("/integrations/status", {
      method: "GET",
    });
  } catch {
    return { overall: "offline" };
  }
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */
function StatusDot({
  status,
  className,
}: {
  status: SystemSyncStatus["overall"];
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-2 rounded-full",
        status === "healthy" && "bg-success",
        status === "syncing" && "bg-info animate-pulse",
        status === "warning" && "bg-warning",
        status === "failed" && "bg-destructive",
        status === "offline" && "bg-muted-foreground",
        className,
      )}
    >
      {status === "syncing" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-info opacity-60" />
      )}
    </span>
  );
}

function IntegrationRow({
  label,
  info,
}: {
  label: string;
  info?: IntegrationStatus;
}) {
  if (!info) return null;

  const Icon =
    info.status === "healthy"
      ? CheckCircle2
      : info.status === "degraded"
        ? AlertTriangle
        : info.status === "failed"
          ? XCircle
          : WifiOff;

  const iconClass =
    info.status === "healthy"
      ? "text-success"
      : info.status === "degraded"
        ? "text-warning"
        : info.status === "failed"
          ? "text-destructive"
          : "text-muted-foreground";

  const relativeTime = info.lastSync ? formatRelative(info.lastSync) : "Never";

  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
          Last sync: {relativeTime}
          {info.failedJobs ? (
            <span className="ml-2 text-destructive font-medium">
              {info.failedJobs} failed
            </span>
          ) : null}
          {info.pendingJobs ? (
            <span className="ml-2 text-info font-medium">
              {info.pendingJobs} pending
            </span>
          ) : null}
        </p>
        {info.message ? (
          <p className="mt-0.5 text-[0.68rem] text-warning">{info.message}</p>
        ) : null}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

function overallLabel(status: SystemSyncStatus["overall"]): string {
  switch (status) {
    case "healthy":
      return "All systems operational";
    case "syncing":
      return "Synchronising…";
    case "warning":
      return "Degraded performance";
    case "failed":
      return "Integration failure";
    case "offline":
      return "Unable to reach server";
  }
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export function SyncStatusIndicator() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["system-sync-status"],
    queryFn: fetchSyncStatus,
    refetchInterval: 60_000, // poll every 60 s
    retry: 1,
  });

  const status = data?.overall ?? (isLoading ? "syncing" : "offline");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`System status: ${overallLabel(status)}`}
          className="relative"
        >
          <Activity
            className={cn(
              "size-4 transition-colors",
              status === "healthy" && "text-success",
              status === "syncing" && "text-info",
              status === "warning" && "text-warning",
              status === "failed" && "text-destructive",
              status === "offline" && "text-muted-foreground",
            )}
          />
          <StatusDot
            status={status}
            className="absolute -top-0.5 -right-0.5 size-2"
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0" sideOffset={6}>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <StatusDot status={status} className="size-2.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              System Status
            </p>
            <p
              className={cn(
                "text-[0.72rem]",
                status === "healthy" && "text-success",
                status === "syncing" && "text-info",
                status === "warning" && "text-warning",
                status === "failed" && "text-destructive",
                status === "offline" && "text-muted-foreground",
              )}
            >
              {overallLabel(status)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh status"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 text-muted-foreground"
          >
            <RefreshCw
              className={cn("size-3.5", isFetching && "animate-spin")}
            />
          </Button>
        </div>

        {/* Integration rows */}
        <div className="divide-y divide-border px-4">
          {data ? (
            <>
              <IntegrationRow label="DHA Interoperability" info={data.dha} />
              <IntegrationRow label="SHA Claims Gateway" info={data.sha} />
              <IntegrationRow label="KRA / eTIMS" info={data.etims} />
            </>
          ) : (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              {isLoading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Fetching integration status…
                </>
              ) : (
                <>
                  <WifiOff className="size-3.5" />
                  Could not reach the integration server.
                </>
              )}
            </div>
          )}
        </div>

        {/* Queue summary */}
        {data?.queueDepth !== undefined && (
          <div className="border-t border-border bg-surface-2/60 px-4 py-2.5">
            <p className="text-[0.68rem] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {data.queueDepth}
              </span>{" "}
              jobs in the integration queue
            </p>
          </div>
        )}

        {/* Footer */}
        {data?.lastUpdated && (
          <div className="border-t border-border px-4 py-2">
            <p className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
              <Clock className="size-3" aria-hidden />
              Updated {formatRelative(data.lastUpdated)}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
