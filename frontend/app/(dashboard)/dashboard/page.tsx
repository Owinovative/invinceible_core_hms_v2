"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Activity, ArrowRight, BedDouble, CheckCircle2, ClipboardCheck, Clock3,
  FlaskConical, Pill, RefreshCw, ShieldAlert, Sparkles, Stethoscope,
  TrendingUp, Users, Wallet,
} from "lucide-react";

import { PriorityAlertsPanel } from "@/components/dashboard/priority-alerts-panel";
import { LowStockPanel } from "@/components/dashboard/low-stock-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonStats } from "@/components/ui/loading-skeleton";
import { StatsCard } from "@/components/ui/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  usePharmacyAlerts,
  useSystemHealth,
  useUnresolvedCounts,
} from "@/hooks/use-dashboard-data";
import { useModuleOperationsReport } from "@/hooks/use-module-operations-report";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { cn } from "@/lib/utils";

// Keep recharts out of the initial route bundle.
const OperationalPulseChart = dynamic(
  () => import("@/components/dashboard/operational-pulse-chart"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-70 grid-cols-6 items-end gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            className="rounded-t-lg"
            style={{ height: `${30 + index * 12}%` }}
          />
        ))}
      </div>
    ),
  },
);

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

const quickActions = [
  { title: "Register patient", desc: "Front desk intake", icon: Users, href: "/patients", module: "clinical" },
  { title: "Consultations", desc: "Active doctor queue", icon: Stethoscope, href: "/consultation", module: "clinical" },
  { title: "Pharmacy POS", desc: "OTC & prescriptions", icon: Pill, href: "/pharmacy/otc-sales", module: "pharmacy" },
  { title: "Billing desk", desc: "Invoices & cashier", icon: Wallet, href: "/billing", module: "finance" },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } =
    useScope();

  const systemHealth = useSystemHealth({ facilityId, branchId: selectedBranchId });
  const unresolvedCounts = useUnresolvedCounts({ facilityId, branchId: selectedBranchId });
  const pharmacyAlerts = usePharmacyAlerts({ facilityId, branchId: selectedBranchId });
  const moduleOperations = useModuleOperationsReport();

  const health = systemHealth.data;
  const counts = unresolvedCounts.data;
  const pharmacy = pharmacyAlerts.data ?? [];
  const moduleReport = moduleOperations.data;
  const recentModuleRecords = moduleReport?.recentRecords ?? [];

  const isLoading =
    systemHealth.isLoading ||
    unresolvedCounts.isLoading ||
    pharmacyAlerts.isLoading ||
    moduleOperations.isLoading;
  const isRefreshing =
    systemHealth.isFetching ||
    unresolvedCounts.isFetching ||
    pharmacyAlerts.isFetching ||
    moduleOperations.isFetching;

  const status = health?.status ?? "healthy";
  const scopeText = facilityName
    ? `${facilityName} · ${selectedBranchName || "All branches"}`
    : "System wide";
  const isHealthy =
    !isLoading &&
    (health?.summary.unresolvedCriticalAlerts ?? 0) === 0 &&
    (health?.summary.unresolvedWarnings ?? 0) === 0;

  const pulseData = [
    { label: "Alerts", value: counts?.counts.total ?? 0, token: "--chart-5" },
    { label: "Lab", value: health?.summary.pendingLabQueue ?? 0, token: "--chart-2" },
    { label: "IPD", value: health?.summary.activeAdmissions ?? 0, token: "--chart-4" },
    { label: "Stock", value: health?.summary.lowStock ?? 0, token: "--chart-1" },
    { label: "Billing", value: health?.summary.billingFailures ?? 0, token: "--chart-3" },
    { label: "Modules", value: moduleReport?.summary.active ?? 0, token: "--chart-1" },
  ];

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        eyebrow="Command Center"
        title={`${greeting}, ${user?.username || "there"}`}
        description={`Live operational picture for ${scopeText}.`}
        actions={
          <>
            {isRefreshing ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" aria-hidden />
                Syncing
              </span>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/reports">
                <TrendingUp data-icon="inline-start" aria-hidden /> Reports
              </Link>
            </Button>
            <Button asChild>
              <Link href="/ai-assistant">
                <Sparkles data-icon="inline-start" aria-hidden /> AI Assistant
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI band */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            label="Health score"
            value={health?.healthScore ?? "—"}
            icon={<Activity />}
            detail={
              status === "critical"
                ? "Critical issues need attention"
                : status === "warning"
                  ? "Warnings in current scope"
                  : "All systems nominal"
            }
            className={cn(
              status === "critical" && "[--module-accent:var(--destructive)]",
              status === "warning" && "[--module-accent:var(--warning)]",
            )}
          />
          <StatsCard
            label="Open alerts"
            value={counts?.counts.total ?? 0}
            icon={<ShieldAlert />}
            detail={`${health?.summary.unresolvedCriticalAlerts ?? 0} critical · ${health?.summary.unresolvedWarnings ?? 0} warnings`}
          />
          <StatsCard
            label="Active admissions"
            value={health?.summary.activeAdmissions ?? 0}
            icon={<BedDouble />}
            detail="Inpatients under care"
          />
          <StatsCard
            label="Lab queue"
            value={health?.summary.pendingLabQueue ?? 0}
            icon={<FlaskConical />}
            detail="Orders awaiting results"
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            data-module={action.module}
            className="surface-spotlight group flex items-center gap-3.5 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-module-soft text-module transition-transform group-hover:scale-105">
              <action.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {action.title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {action.desc}
              </span>
            </span>
            <ArrowRight
              className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </Link>
        ))}
      </div>

      {isHealthy ? (
        <div className="flex items-center gap-4 rounded-xl border border-success/25 bg-success-soft/60 px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-success">System nominal</p>
            <p className="text-sm text-muted-foreground">
              No critical alerts, warnings, or stock blocks in the current scope.
            </p>
          </div>
        </div>
      ) : null}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          <SectionCard
            variant="spotlight"
            title="Active module operations"
            description="Live tracker across every operational department"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/reports">
                  Full ledger <ArrowRight data-icon="inline-end" aria-hidden />
                </Link>
              </Button>
            }
          >
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Total files", moduleReport?.summary.total ?? 0, ""],
                ["In progress", moduleReport?.summary.active ?? 0, "text-module"],
                ["Completed", moduleReport?.summary.completed ?? 0, "text-success"],
                ["Overdue", moduleReport?.summary.overdue ?? 0, "text-destructive"],
              ].map(([label, value, colorClass]) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-border bg-surface-2/60 p-4"
                >
                  <p className="text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p
                    className={cn(
                      "tabular mt-1 text-2xl font-bold",
                      colorClass || "text-foreground",
                    )}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {moduleOperations.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentModuleRecords.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck />}
                title="No module records tracking yet"
                description="Submissions appear here the moment departmental workflows begin."
              />
            ) : (
              <ul className="space-y-2.5">
                {recentModuleRecords.slice(0, 6).map((record) => (
                  <li key={record.id}>
                    <Link
                      href={`/${record.moduleSlug}`}
                      className="group flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-module/40 hover:shadow-sm sm:flex-row sm:items-center"
                    >
                      <span className="min-w-0">
                        <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge tone="info" withDot={false}>
                            {record.moduleTitle}
                          </StatusBadge>
                          <StatusBadge tone="neutral">
                            {record.statusCode}
                          </StatusBadge>
                        </span>
                        <span className="block truncate text-sm font-semibold text-foreground group-hover:text-module">
                          {record.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {record.recordNumber} · {record.workflowStage}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" aria-hidden />
                        {formatDate(record.dueAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            variant="spotlight"
            title="Operational pulse"
            description="Load across queues, admissions, stock, and billing"
          >
            <OperationalPulseChart data={pulseData} />
          </SectionCard>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-6">
          <div className="relative overflow-hidden rounded-xl bg-linear-150 from-brand-strong to-brand p-5 text-primary-foreground shadow-md dark:from-surface-3 dark:to-surface-2">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[0.68rem] font-semibold tracking-widest uppercase opacity-80">
                Active session
              </p>
              <span className="pulse-dot" aria-hidden />
            </div>
            <p className="text-lg font-bold">{user?.username || "—"}</p>
            <p className="text-sm opacity-80">
              {(user?.roleCode || "—").replaceAll("_", " ")}
            </p>
            <div className="mt-4 rounded-lg bg-black/15 px-3.5 py-2.5 text-xs leading-5 backdrop-blur-sm">
              <p className="font-semibold tracking-wider uppercase opacity-70">
                Scope visibility
              </p>
              <p className="mt-0.5 font-medium">{scopeText}</p>
            </div>
          </div>

          <PriorityAlertsPanel
            criticalCount={health?.summary.unresolvedCriticalAlerts ?? 0}
            warningCount={health?.summary.unresolvedWarnings ?? 0}
            pharmacyAlerts={pharmacy}
          />

          <LowStockPanel items={health?.panels.lowStockItems ?? []} />
        </div>
      </div>
    </div>
  );
}
