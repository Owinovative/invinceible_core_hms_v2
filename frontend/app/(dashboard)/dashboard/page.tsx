"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BedDouble,
  Bot,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PriorityAlertsPanel } from "@/components/dashboard/priority-alerts-panel";
import { LowStockPanel } from "@/components/dashboard/low-stock-panel";
import { AdminCommandCenter } from "@/components/dashboard/admin-command-center";
import { SystemNavigatorAssistant } from "@/components/dashboard/system-navigator-assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePharmacyAlerts,
  useSystemHealth,
  useUnresolvedCounts,
} from "@/hooks/use-dashboard-data";
import { useModuleOperationsReport } from "@/hooks/use-module-operations-report";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { cn } from "@/lib/utils";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";

function SummaryCard({
  title,
  value,
  hint,
  isLoading,
}: {
  title: string;
  value: string | number;
  hint?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.05]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <p className="text-sm text-muted-foreground">{title}</p>
        {isLoading ? (
          <Skeleton className="mt-3 h-8 w-20 rounded-xl" />
        ) : (
          <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
        )}
        {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleString();
}

function SessionCard({
  username,
  roleCode,
  scopeText,
  isRefreshing,
}: {
  username?: string;
  roleCode?: string | null;
  scopeText: string;
  isRefreshing?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden rounded-[1.8rem] gradient-border panel-shadow">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
      <CardHeader className="relative flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Current Session</CardTitle>
        {isRefreshing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Live
          </div>
        )}
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            User
          </p>
          <p className="mt-2 text-base font-semibold">{username || "—"}</p>
        </div>

        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Role
          </p>
          <p className="mt-2 text-base font-semibold">{roleCode || "—"}</p>
        </div>

        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Access Scope
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{scopeText}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightStrip({
  isLoading,
  status,
  unresolved,
  admissions,
}: {
  isLoading?: boolean;
  status: string;
  unresolved: number;
  admissions: number;
}) {
  const items = [
    { label: "System Status", value: String(status).toUpperCase(), icon: Sparkles },
    { label: "Open Alerts", value: unresolved, icon: ShieldAlert },
    { label: "Admissions", value: admissions, icon: BedDouble },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 panel-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06]">
                <Icon className="h-5 w-5 text-cyan-400" />
              </div>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-2 h-6 w-24 rounded-lg" />
                ) : (
                  <p className="truncate text-lg font-bold tracking-tight">
                    {item.value}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AiAndSupportStrip() {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="premium-card motion-sheen rounded-[1.8rem] py-0">
        <CardContent className="relative p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="rounded-full border-0 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                Clinical intelligence layer
              </Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">
                AI doctor note assistant is now connected.
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                The dashboard now connects to a backend AI assistant that helps
                doctors draft notes, clean clinical text, and prepare structured
                summaries from patient context.
              </p>
              <Button
                asChild
                className="mt-4 rounded-md bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                <Link href="/ai-assistant">
                  Open AI assistant
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid min-w-[280px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {["Notes", "Autofill", "Summaries"].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                      <Bot className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card rounded-[1.8rem] py-0">
        <CardContent className="relative p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Builder support
              </p>
              <h2 className="mt-1 text-xl font-bold">Engineering assistance</h2>
            </div>
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>

          <div className="grid gap-3">
            {creatorContacts.map((creator) => (
              <a
                key={creator.name}
                href={getWhatsappLink(creator.whatsappNumber, creator.message)}
                target="_blank"
                rel="noreferrer"
                className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{creator.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {creator.role}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-emerald-500">
                      <PhoneCall className="h-4 w-4" />
                      {creator.phone}
                    </div>
                  </div>
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function OperationalPulseChart({
  isLoading,
  data,
}: {
  isLoading?: boolean;
  data: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="h-[320px] rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
      {isLoading ? (
        <div className="grid h-full grid-cols-6 items-end gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="rounded-t-xl"
              style={{ height: `${38 + index * 11}%` }}
            />
          ))}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -24, right: 8, top: 12 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                color: "hsl(var(--foreground))",
              }}
            />
            <Bar dataKey="value" radius={[10, 10, 4, 4]}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } =
    useScope();

  const systemHealth = useSystemHealth({
    facilityId,
    branchId: selectedBranchId,
  });

  const unresolvedCounts = useUnresolvedCounts({
    facilityId,
    branchId: selectedBranchId,
  });

  const pharmacyAlerts = usePharmacyAlerts({
    facilityId,
    branchId: selectedBranchId,
  });
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

  const healthScore = health?.healthScore ?? "--";
  const status = health?.status ?? "healthy";

  const statusClass =
    status === "critical"
      ? "status-critical"
      : status === "warning"
        ? "status-warning"
        : "status-success";

  const facilityLabel = facilityName || "No facility";
  const branchLabel = selectedBranchName || "No branch";

  const scopeText = facilityName
    ? `${facilityName} - ${branchLabel}`
    : "No facility";

  const showHealthyEmptyState =
    !isLoading &&
    (health?.summary.unresolvedCriticalAlerts ?? 0) === 0 &&
    (health?.summary.unresolvedWarnings ?? 0) === 0 &&
    (counts?.counts.total ?? 0) === 0 &&
    (health?.summary.pendingLabQueue ?? 0) === 0 &&
    (health?.summary.activeAdmissions ?? 0) === 0 &&
    (health?.summary.lowStock ?? 0) === 0;

  const pulseData = [
    {
      label: "Alerts",
      value: counts?.counts.total ?? 0,
      color: "#22d3ee",
    },
    {
      label: "Lab",
      value: health?.summary.pendingLabQueue ?? 0,
      color: "#38bdf8",
    },
    {
      label: "IPD",
      value: health?.summary.activeAdmissions ?? 0,
      color: "#f59e0b",
    },
    {
      label: "Stock",
      value: health?.summary.lowStock ?? 0,
      color: "#ef4444",
    },
    {
      label: "Billing",
      value: health?.summary.billingFailures ?? 0,
      color: "#34d399",
    },
    {
      label: "Modules",
      value: moduleReport?.summary.active ?? 0,
      color: "#a78bfa",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="premium-card motion-sheen relative overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-emerald-500/5 to-amber-400/10" />
        <div className="clinical-mesh opacity-40" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl space-y-4">
            <Badge className="rounded-full border-0 bg-blue-600/10 px-3 py-1 text-blue-700 dark:text-blue-300">
              Operations Command Center
            </Badge>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Hospital Dashboard
              </h1>
              {isRefreshing ? (
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    statusClass,
                  )}
                >
                  {String(status).toUpperCase()}
                </div>
              )}
            </div>

            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Live control over alerts, admissions, lab pressure, pharmacy
              issues, and operational flow across your current scope.
            </p>

            <InsightStrip
              isLoading={isLoading}
              status={status}
              unresolved={counts?.counts.total ?? 0}
              admissions={health?.summary.activeAdmissions ?? 0}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
            <div className="rounded-[1.35rem] border border-white/10 glass-panel panel-shadow px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              {isLoading ? (
                <Skeleton className="mt-3 h-5 w-28 rounded-lg" />
              ) : (
                <p className="mt-3 truncate text-sm font-semibold">
                  {facilityLabel}
                </p>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-white/10 glass-panel panel-shadow px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Branch
              </p>
              {isLoading ? (
                <Skeleton className="mt-3 h-5 w-28 rounded-lg" />
              ) : (
                <p className="mt-3 truncate text-sm font-semibold">
                  {branchLabel}
                </p>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-white/10 glass-panel panel-shadow px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Health Score
              </p>
              {isLoading ? (
                <Skeleton className="mt-3 h-6 w-20 rounded-lg" />
              ) : (
                <p className="mt-3 text-lg font-bold">{healthScore}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <AiAndSupportStrip />

      <section>
        <SystemNavigatorAssistant
          user={user}
          scopeText={scopeText}
          healthScore={healthScore}
          openAlerts={counts?.counts.total ?? 0}
          activeAdmissions={health?.summary.activeAdmissions ?? 0}
          pendingLabs={health?.summary.pendingLabQueue ?? 0}
        />
      </section>

      {["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(
        user?.roleCode ?? "",
      ) ? (
        <section>
          <AdminCommandCenter compact />
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Health Score"
          value={healthScore}
          subtitle="Overall system status"
          icon={Activity}
          chip={String(status).toUpperCase()}
          chipClassName={statusClass}
          glowClassName="from-blue-500/20 to-cyan-500/10"
          isLoading={isLoading}
        />

        <MetricCard
          title="Critical Alerts"
          value={health?.summary.unresolvedCriticalAlerts ?? 0}
          subtitle="Need immediate review"
          icon={ShieldAlert}
          chip="Critical"
          chipClassName="status-critical"
          glowClassName="from-red-500/20 to-rose-500/10"
          isLoading={isLoading}
        />

        <MetricCard
          title="Pending Lab Queue"
          value={health?.summary.pendingLabQueue ?? 0}
          subtitle="Awaiting completion"
          icon={FlaskConical}
          chip="Active"
          chipClassName="status-info"
          glowClassName="from-cyan-500/20 to-sky-500/10"
          isLoading={isLoading}
        />

        <MetricCard
          title="Active Admissions"
          value={health?.summary.activeAdmissions ?? 0}
          subtitle="Current inpatient load"
          icon={BedDouble}
          chip="Live"
          chipClassName="status-warning"
          glowClassName="from-amber-500/20 to-orange-500/10"
          isLoading={isLoading}
        />
      </section>

      {showHealthyEmptyState ? (
        <section>
          <Card className="relative overflow-hidden rounded-[1.9rem] gradient-border panel-shadow">
            <CardContent className="relative flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10">
                <Activity className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="relative text-2xl font-bold tracking-tight">
                System is healthy
              </h2>
              <p className="relative mt-2 max-w-xl text-muted-foreground">
                No active alerts, no low stock items, and no pending clinical
                pressure in the current scope.
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="relative overflow-hidden rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Operational Summary</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                High-level pressure points across your current scope
              </p>
            </div>

            <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground md:block">
              Live Snapshot
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="Unresolved Alerts"
              value={counts?.counts.total ?? 0}
              hint="All open notifications"
              isLoading={isLoading}
            />
            <SummaryCard
              title="Unread Alerts"
              value={counts?.counts.unread ?? 0}
              hint="Still awaiting review"
              isLoading={isLoading}
            />
            <SummaryCard
              title="Low Stock Alerts"
              value={counts?.counts.lowStock ?? 0}
              hint="Pharmacy pressure points"
              isLoading={isLoading}
            />
            <SummaryCard
              title="Out of Stock Alerts"
              value={counts?.counts.outOfStock ?? 0}
              hint="Needs replenishment"
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Growth & Flow</CardTitle>
            <TrendingUp className="h-5 w-5 text-cyan-400" />
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Operational Readiness</p>
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
              {isLoading ? (
                <Skeleton className="mt-3 h-6 w-24 rounded-lg" />
              ) : (
                <p className="mt-3 text-3xl font-bold">{healthScore}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Composite score from alerts, queues, stock, and clinical load.
              </p>
            </div>

            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Clinical Pressure</p>
                <BedDouble className="h-4 w-4 text-amber-400" />
              </div>
              {isLoading ? (
                <Skeleton className="mt-3 h-6 w-24 rounded-lg" />
              ) : (
                <p className="mt-3 text-3xl font-bold">
                  {(health?.summary.activeAdmissions ?? 0) +
                    (health?.summary.pendingLabQueue ?? 0)}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Combined inpatient and pending lab workflow load.
              </p>
            </div>

            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Financial Watch</p>
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
              {isLoading ? (
                <Skeleton className="mt-3 h-6 w-24 rounded-lg" />
              ) : (
                <p className="mt-3 text-3xl font-bold">
                  {health?.summary.billingFailures ?? 0}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Billing failures needing follow-up.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="relative overflow-hidden rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Module Command Center</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Live work moving through the new operational modules
              </p>
            </div>
            <ClipboardCheck className="h-5 w-5 text-cyan-400" />
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="Module Records"
              value={moduleReport?.summary.total ?? 0}
              hint="All captured module work"
              isLoading={moduleOperations.isLoading}
            />
            <SummaryCard
              title="Active Work"
              value={moduleReport?.summary.active ?? 0}
              hint="Open, waiting, escalated, or in progress"
              isLoading={moduleOperations.isLoading}
            />
            <SummaryCard
              title="Completed"
              value={moduleReport?.summary.completed ?? 0}
              hint="Finished module work"
              isLoading={moduleOperations.isLoading}
            />
            <SummaryCard
              title="Overdue"
              value={moduleReport?.summary.overdue ?? 0}
              hint="Past due and still active"
              isLoading={moduleOperations.isLoading}
            />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Module Work</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The newest operational records across all added modules
              </p>
            </div>
            <Link href="/reports">
              <Button type="button" variant="outline" className="rounded-xl">
                Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="space-y-3">
            {moduleOperations.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : recentModuleRecords.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                No module work has been captured yet.
              </div>
            ) : (
              recentModuleRecords.slice(0, 5).map((record) => (
                <Link
                  key={record.id}
                  href={`/${record.moduleSlug}`}
                  className="block rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {record.moduleTitle}
                        </Badge>
                        <Badge className="rounded-full border-0 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                          {record.statusCode}
                        </Badge>
                      </div>
                      <p className="mt-3 font-semibold">{record.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {record.recordNumber} / {record.workflowStage}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      {formatDate(record.dueAt)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PriorityAlertsPanel
            criticalCount={health?.summary.unresolvedCriticalAlerts ?? 0}
            warningCount={health?.summary.unresolvedWarnings ?? 0}
            pharmacyAlerts={pharmacy}
          />
        </div>

        <SessionCard
          username={user?.username}
          roleCode={user?.roleCode}
          scopeText={scopeText}
          isRefreshing={isRefreshing}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <LowStockPanel items={health?.panels.lowStockItems ?? []} />

        <Card className="relative overflow-hidden rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Operational Pulse</CardTitle>
            <Badge className="rounded-full border-0 bg-cyan-500/10 text-cyan-300">
              Live
            </Badge>
          </CardHeader>

          <CardContent>
            <OperationalPulseChart isLoading={isLoading} data={pulseData} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
