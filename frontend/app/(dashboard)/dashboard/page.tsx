"use client";

import Link from "next/link";
import type * as React from "react";
import {
  Activity, ArrowRight, BedDouble, Bot, ClipboardCheck, Clock3, FlaskConical,
  MessageCircle, PhoneCall, RefreshCw, ShieldAlert, Sparkles, TrendingUp, Wallet, CheckCircle2
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

function OperationalPulseChart({ isLoading, data }: { isLoading?: boolean; data: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div className="h-[280px] w-full">
      {isLoading ? (
        <div className="grid h-full grid-cols-6 items-end gap-4 opacity-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="rounded-t-xl bg-slate-200" style={{ height: `${30 + i * 12}%` }} />
          ))}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -24, right: 8, top: 12 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }} dy={10} />
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
    { label: "Alerts", value: counts?.counts.total ?? 0, color: "#cbd5e1" },
    { label: "Lab", value: health?.summary.pendingLabQueue ?? 0, color: "#38bdf8" },
    { label: "IPD", value: health?.summary.activeAdmissions ?? 0, color: "#fcd34d" },
    { label: "Stock", value: health?.summary.lowStock ?? 0, color: "#f87171" },
    { label: "Billing", value: health?.summary.billingFailures ?? 0, color: "#34d399" },
    { label: "Modules", value: moduleReport?.summary.active ?? 0, color: "#818cf8" },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      
      {/* HEADER & TOP METRICS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between px-2 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-800 shadow-none border-0 text-[10px] uppercase tracking-widest px-3 py-1">Command Center</Badge>
            {isRefreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Hospital Operations</h1>
        </div>

        <div className="flex gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health Score</p>
            <p className={cn("text-3xl font-black tracking-tight", status === "critical" ? "text-rose-500" : status === "warning" ? "text-amber-500" : "text-emerald-500")}>
              {healthScore}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Alerts</p>
            <p className="text-3xl font-black tracking-tight text-slate-800">{counts?.counts.total ?? 0}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admissions</p>
            <p className="text-3xl font-black tracking-tight text-cyan-600">{health?.summary.activeAdmissions ?? 0}</p>
          </div>
        </div>
      </div>

      {/* INTELLIGENCE & SUPPORT STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div className="rounded-[2rem] glass panel-shadow p-6 bg-gradient-to-r from-cyan-500/10 to-transparent border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">Intelligence Layer</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">Clinical AI is active and monitoring.</p>
            </div>
          </div>
          <Button asChild className="rounded-xl h-11 px-6 bg-slate-900 text-white hover:bg-slate-800 shadow-md">
            <Link href="/ai-assistant">Launch Assistant <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="rounded-[2rem] glass panel-shadow p-6 bg-white/60 border border-white/60 flex items-center gap-4 overflow-x-auto custom-scrollbar">
          <div className="shrink-0 mr-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Engineering</p>
            <p className="text-sm font-bold text-slate-800">Support Desk</p>
          </div>
          {supportContacts.map((creator) => (
            <a key={creator.name} href={getWhatsappLink(creator.whatsappNumber, creator.message)} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-2.5 pr-4 hover:border-emerald-200 hover:shadow-sm transition-all shrink-0">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{creator.name}</p>
                <p className="text-[9px] font-bold uppercase text-slate-400">{creator.role}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {isHealthy && (
        <div className="rounded-[2rem] glass panel-shadow p-8 flex flex-col items-center justify-center text-center border border-white/60 bg-emerald-50/30">
          <div className="h-16 w-16 rounded-3xl bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800">System Nominal</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">No critical alerts, warnings, or low stock blocks detected.</p>
        </div>
      )}

      {/* CORE GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        
        {/* LEFT PANE: MODULES & REPORTS */}
        <div className="space-y-6">
          <div className="rounded-[2rem] glass panel-shadow p-8 bg-white/60 border border-white/60">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Tracker</p>
                <h2 className="text-lg font-black text-slate-800 mt-0.5">Active Module Operations</h2>
              </div>
              <ClipboardCheck className="h-5 w-5 text-slate-300" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                ["Total", moduleReport?.summary.total ?? 0],
                ["Active", moduleReport?.summary.active ?? 0],
                ["Done", moduleReport?.summary.completed ?? 0],
                ["Overdue", moduleReport?.summary.overdue ?? 0, "text-rose-500"]
              ].map(([label, value, colorClass]) => (
                <div key={String(label)} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className={cn("text-2xl font-black mt-1", colorClass || "text-slate-800")}>{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Recent Submissions</p>
              {moduleOperations.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-300 mx-auto my-6" /> : recentModuleRecords.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 italic text-center py-6">No module records actively tracking.</p>
              ) : recentModuleRecords.slice(0, 5).map(record => (
                <Link key={record.id} href={`/${record.moduleSlug}`} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-cyan-200 hover:shadow-sm transition-all group">
                  <div className="min-w-0">
                    <div className="flex gap-2 mb-1.5">
                      <Badge className="bg-slate-100 text-slate-600 shadow-none border-0 text-[9px] font-bold uppercase">{record.moduleTitle}</Badge>
                      <Badge variant="outline" className="shadow-none border-slate-200 text-slate-500 text-[9px] font-bold uppercase">{record.statusCode}</Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-cyan-700">{record.title}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{record.recordNumber} • {record.workflowStage}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due</p>
                    <p className="text-xs font-bold text-slate-700">{formatDate(record.dueAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] glass panel-shadow p-8 bg-white/60 border border-white/60">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Analytics</p>
                <h2 className="text-lg font-black text-slate-800 mt-0.5">Operational Pulse</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-300" />
            </div>
            <OperationalPulseChart isLoading={isLoading} data={pulseData} />
          </div>
        </div>

        {/* RIGHT PANE: ALERTS & SESSION */}
        <div className="space-y-6 flex flex-col">
          <div className="rounded-[2rem] glass panel-shadow p-6 bg-slate-900 border border-slate-800 text-white shrink-0 shadow-xl shadow-slate-900/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Active Session</p>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Operator</p>
                <p className="text-lg font-black mt-0.5">{user?.username || "—"}</p>
                <p className="text-xs font-medium text-cyan-400">{user?.roleCode || "—"}</p>
              </div>
              <div className="border-t border-slate-800 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Scope</p>
                <p className="text-sm font-bold text-slate-300 mt-1">{scopeText}</p>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <PriorityAlertsPanel criticalCount={health?.summary.unresolvedCriticalAlerts ?? 0} warningCount={health?.summary.unresolvedWarnings ?? 0} pharmacyAlerts={pharmacy} />
          </div>
          
          <div className="flex-1">
            <LowStockPanel items={health?.panels.lowStockItems ?? []} />
          </div>
        </div>

      </div>
    </div>
  );
}
