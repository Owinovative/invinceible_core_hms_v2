"use client";

import Link from "next/link";
import type * as React from "react";
import {
  Activity, ArrowRight, BedDouble, ClipboardCheck, Clock3, FlaskConical,
  MessageCircle, PhoneCall, RefreshCw, ShieldAlert, Sparkles, TrendingUp, Wallet, CheckCircle2, User
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";

import { PriorityAlertsPanel } from "@/components/dashboard/priority-alerts-panel";
import { LowStockPanel } from "@/components/dashboard/low-stock-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmacyAlerts, useSystemHealth, useUnresolvedCounts } from "@/hooks/use-dashboard-data";
import { useModuleOperationsReport } from "@/hooks/use-module-operations-report";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { cn } from "@/lib/utils";
import { getWhatsappLink, supportContacts } from "@/lib/creator-contacts";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

// Fixed Chart: Removed invalid textTransform from Recharts tick
function OperationalPulseChart({ isLoading, data }: { isLoading?: boolean; data: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div className="h-[280px] w-full mt-6">
      {isLoading ? (
        <div className="grid h-full grid-cols-6 items-end gap-4 opacity-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="rounded-t-xl bg-slate-200" style={{ height: `${30 + i * 12}%` }} />
          ))}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -24, right: 8, top: 12 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} dy={10} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
            <ChartTooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} contentStyle={{ background: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: "12px", color: "#0f172a" }} />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={40}>
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
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } = useScope();

  const systemHealth = useSystemHealth({ facilityId, branchId: selectedBranchId });
  const unresolvedCounts = useUnresolvedCounts({ facilityId, branchId: selectedBranchId });
  const pharmacyAlerts = usePharmacyAlerts({ facilityId, branchId: selectedBranchId });
  const moduleOperations = useModuleOperationsReport();

  const health = systemHealth.data;
  const counts = unresolvedCounts.data;
  const pharmacy = pharmacyAlerts.data ?? [];
  const moduleReport = moduleOperations.data;
  const recentModuleRecords = moduleReport?.recentRecords ?? [];

  const isLoading = systemHealth.isLoading || unresolvedCounts.isLoading || pharmacyAlerts.isLoading || moduleOperations.isLoading;
  const isRefreshing = systemHealth.isFetching || unresolvedCounts.isFetching || pharmacyAlerts.isFetching || moduleOperations.isFetching;

  const healthScore = health?.healthScore ?? "--";
  const status = health?.status ?? "healthy";

  const scopeText = facilityName ? `${facilityName} / ${selectedBranchName || "All Branches"}` : "System Wide";
  
  const isHealthy = !isLoading && (health?.summary.unresolvedCriticalAlerts ?? 0) === 0 && (health?.summary.unresolvedWarnings ?? 0) === 0;

  const pulseData = [
    { label: "ALERTS", value: counts?.counts.total ?? 0, color: "#cbd5e1" },
    { label: "LAB", value: health?.summary.pendingLabQueue ?? 0, color: "#38bdf8" },
    { label: "IPD", value: health?.summary.activeAdmissions ?? 0, color: "#fcd34d" },
    { label: "STOCK", value: health?.summary.lowStock ?? 0, color: "#f87171" },
    { label: "BILLING", value: health?.summary.billingFailures ?? 0, color: "#34d399" },
    { label: "MODULES", value: moduleReport?.summary.active ?? 0, color: "#818cf8" },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12 max-w-[1700px] mx-auto">
      
      {/* 1. TOP HEADER & METRICS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between px-2 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-800 shadow-none border-0 text-[10px] uppercase tracking-widest px-3 py-1">
              Command Center
            </Badge>
            {isRefreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Hospital Operations</h1>
        </div>

        <div className="flex gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health Score</p>
            <p className={cn("text-4xl font-black tracking-tight", status === "critical" ? "text-rose-500" : status === "warning" ? "text-amber-500" : "text-emerald-500")}>
              {healthScore}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Alerts</p>
            <p className="text-4xl font-black tracking-tight text-slate-800">{counts?.counts.total ?? 0}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admissions</p>
            <p className="text-4xl font-black tracking-tight text-cyan-600">{health?.summary.activeAdmissions ?? 0}</p>
          </div>
        </div>
      </div>

      {/* 2. HERO BANNER: AI & ENGINEERING */}
      <div className="rounded-[2rem] bg-gradient-to-r from-slate-900 to-slate-950 p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <Badge className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 border-0 shadow-none px-2.5 py-0.5 mb-2 font-bold uppercase tracking-widest text-[9px]">
              Intelligence Layer Active
            </Badge>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Clinical AI Assistant is online.</h2>
            <p className="text-sm font-medium text-slate-400 mt-1">Draft notes, summarize context, and process lab results instantly.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <Button asChild className="rounded-xl h-12 px-6 bg-cyan-600 text-white hover:bg-cyan-500 shadow-md border-0 mr-4">
            <Link href="/ai-assistant">Launch Assistant <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          
          {supportContacts.map((creator) => (
            <a key={creator.name} href={getWhatsappLink(creator.whatsappNumber, creator.message)} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 pr-5 hover:bg-white/10 transition-all shrink-0">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <PhoneCall className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">{creator.name}</p>
                <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">{creator.role}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {isHealthy && (
        <div className="rounded-[2rem] glass panel-shadow p-8 flex items-center gap-5 border border-emerald-500/20 bg-emerald-50/50">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-emerald-900">System Nominal</h2>
            <p className="text-sm font-medium text-emerald-700/80">No critical alerts, warnings, or low stock blocks detected in the current scope.</p>
          </div>
        </div>
      )}

      {/* 3. MAIN COMMAND GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
        
        {/* LEFT PANE: MODULES & REPORTS */}
        <div className="space-y-8">
          
          {/* Module Command Center */}
          <div className="rounded-[2.5rem] glass panel-shadow p-8 bg-white/60 border border-white/60">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Tracker</p>
                <h2 className="text-xl font-black text-slate-800 mt-0.5">Active Module Operations</h2>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                ["Total Files", moduleReport?.summary.total ?? 0],
                ["In Progress", moduleReport?.summary.active ?? 0],
                ["Completed", moduleReport?.summary.completed ?? 0],
                ["Overdue", moduleReport?.summary.overdue ?? 0, "text-rose-500"]
              ].map(([label, value, colorClass]) => (
                <div key={String(label)} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className={cn("text-3xl font-black mt-2", colorClass || "text-slate-800")}>{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Submissions</p>
                <Link href="/reports" className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 hover:text-cyan-800">View All</Link>
              </div>

              {moduleOperations.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-300 mx-auto my-6" /> : recentModuleRecords.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 italic text-center py-6 bg-slate-50 rounded-xl">No module records actively tracking.</p>
              ) : recentModuleRecords.slice(0, 5).map(record => (
                <Link key={record.id} href={`/${record.moduleSlug}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-cyan-200 hover:shadow-md transition-all group gap-4">
                  <div className="min-w-0">
                    <div className="flex gap-2 mb-2">
                      <Badge className="bg-slate-100 text-slate-600 shadow-none border-0 text-[9px] font-bold uppercase">{record.moduleTitle}</Badge>
                      <Badge variant="outline" className="shadow-none border-slate-200 text-slate-500 text-[9px] font-bold uppercase">{record.statusCode}</Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-cyan-700">{record.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">{record.recordNumber} • {record.workflowStage}</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{formatDate(record.dueAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Operational Pulse Chart */}
          <div className="rounded-[2.5rem] glass panel-shadow p-8 bg-white/60 border border-white/60">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Analytics</p>
                <h2 className="text-xl font-black text-slate-800 mt-0.5">Operational Pulse</h2>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-slate-400" />
              </div>
            </div>
            <OperationalPulseChart isLoading={isLoading} data={pulseData} />
          </div>
        </div>

        {/* RIGHT PANE: ALERTS & SESSION */}
        <div className="space-y-8 flex flex-col">
          
          {/* Active Session Card */}
          <div className="rounded-[2.5rem] glass panel-shadow p-8 bg-white/60 border border-white/60 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Operator</p>
                <p className="text-sm font-black text-slate-800">{user?.username || "—"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white border border-slate-100 rounded-2xl p-4">
                 <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Role</p>
                 <p className="text-xs font-bold text-slate-700 mt-1">{user?.roleCode || "—"}</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-4">
                 <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">System Scope</p>
                 <p className="text-xs font-bold text-slate-700 mt-1">{scopeText}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <PriorityAlertsPanel criticalCount={health?.summary.unresolvedCriticalAlerts ?? 0} warningCount={health?.summary.unresolvedWarnings ?? 0} pharmacyAlerts={pharmacy} />
          </div>
          
          <div className="flex-1 min-h-0">
            <LowStockPanel items={health?.panels.lowStockItems ?? []} />
          </div>
        </div>

      </div>
    </div>
  );
}
