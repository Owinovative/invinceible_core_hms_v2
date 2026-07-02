"use client";

import Link from "next/link";
import type * as React from "react";
import {
  Activity, ArrowRight, BedDouble, ClipboardCheck, Clock3, FlaskConical,
  MessageCircle, PhoneCall, RefreshCw, ShieldAlert, Sparkles, TrendingUp, 
  Wallet, CheckCircle2, User, Loader2, Users, FileText, Pill, CalendarPlus, Stethoscope
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
    <div className="h-[280px] w-full mt-6">
      {isLoading ? (
        <div className="grid h-full grid-cols-6 items-end gap-4 opacity-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="rounded-t-xl bg-muted" style={{ height: `${30 + i * 12}%` }} />
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
    <div className="flex flex-col gap-8 animate-enter pb-12 max-w-[1700px] mx-auto">
      
      {/* 1. TOP HEADER & METRICS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between px-2 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-800 shadow-none border-0 text-[10px] uppercase tracking-widest px-3 py-1">
              Command Center
            </Badge>
            {isRefreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-subtle" />}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">Hospital Operations</h1>
        </div>

        <div className="flex gap-8 border-l border-border pl-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Health Score</p>
            <p className={cn("text-4xl font-black tracking-tight", status === "critical" ? "text-destructive" : status === "warning" ? "text-amber-500" : "text-emerald-500")}>
              {healthScore}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Open Alerts</p>
            <p className="text-4xl font-black tracking-tight text-foreground">{counts?.counts.total ?? 0}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Admissions</p>
            <p className="text-4xl font-black tracking-tight text-module">{health?.summary.activeAdmissions ?? 0}</p>
          </div>
        </div>
      </div>

      {/* 2. HERO BANNER: AI & ENGINEERING */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-slate-900 to-slate-950 p-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] pointer-events-none rounded-full" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-pulse to-brand-strong flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
            <Sparkles className="h-9 w-9 text-white" />
          </div>
          <div>
            <Badge className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 border-0 shadow-none px-3 py-1 mb-3 font-bold uppercase tracking-widest text-[10px]">
              Intelligence Layer Active
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Clinical AI Assistant is online.</h2>
            <p className="text-sm font-medium text-subtle mt-2 max-w-lg leading-relaxed">
              Accelerate your workflow. Use the AI engine to draft clinical notes, summarize complex patient context, and process laboratory results instantly.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <Button asChild className="rounded-xl h-14 px-8 bg-cyan-600 text-white hover:bg-cyan-500 shadow-md border-0 mr-4 font-bold text-sm">
            <Link href="/ai-assistant">Launch Assistant <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          
          <div className="flex gap-3">
            {supportContacts.map((creator) => (
              <a key={creator.name} href={getWhatsappLink(creator.whatsappNumber, creator.message)} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-card/5 border border-white/10 rounded-2xl p-3 pr-6 hover:bg-card/10 transition-all shrink-0">
                <div className="h-10 w-10 rounded-xl bg-success/20 text-emerald-400 flex items-center justify-center">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{creator.name}</p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{creator.role}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Register Patient", desc: "Front desk intake", icon: Users, href: "/patients", color: "text-module", bg: "bg-blue-50" },
          { title: "Consultations", desc: "Active doctor queue", icon: Stethoscope, href: "/consultation", color: "text-success", bg: "bg-success-soft" },
          { title: "Pharmacy POS", desc: "OTC & Prescriptions", icon: Pill, href: "/pharmacy/otc-sales", color: "text-purple-600", bg: "bg-purple-50" },
          { title: "Billing Desk", desc: "Invoices & Cashier", icon: Wallet, href: "/billing", color: "text-warning", bg: "bg-warning-soft" },
        ].map((action) => (
          <Link key={action.title} href={action.href} className="rounded-2xl bg-card/85 backdrop-blur-md shadow-md p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform border border-white/60 bg-card/40">
             <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", action.bg, action.color)}>
               <action.icon className="h-5 w-5" />
             </div>
             <div>
               <p className="text-sm font-black text-foreground">{action.title}</p>
               <p className="text-[10px] font-bold uppercase tracking-wider text-subtle mt-0.5">{action.desc}</p>
             </div>
          </Link>
        ))}
      </div>

      {isHealthy && (
        <div className="rounded-[2rem] bg-card/85 backdrop-blur-md shadow-md p-8 flex items-center gap-5 border border-emerald-500/20 bg-success-soft/50">
          <div className="h-12 w-12 rounded-2xl bg-success-soft flex items-center justify-center text-success shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-success">System Nominal</h2>
            <p className="text-sm font-medium text-success/80">No critical alerts, warnings, or low stock blocks detected in the current scope.</p>
          </div>
        </div>
      )}

      {/* 4. MAIN COMMAND GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
        
        {/* LEFT PANE: MODULES & REPORTS */}
        <div className="space-y-8">
          
          {/* Module Command Center */}
          <div className="rounded-[2.5rem] bg-card/85 backdrop-blur-md shadow-md p-8 md:p-10 bg-card/60 border border-white/60">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">Live Tracker</p>
                <h2 className="text-2xl font-black text-foreground mt-1">Active Module Operations</h2>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-subtle" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
              {[
                ["Total Files", moduleReport?.summary.total ?? 0],
                ["In Progress", moduleReport?.summary.active ?? 0],
                ["Completed", moduleReport?.summary.completed ?? 0],
                ["Overdue", moduleReport?.summary.overdue ?? 0, "text-destructive"]
              ].map(([label, value, colorClass]) => (
                <div key={String(label)} className="bg-card border border-border rounded-[1.5rem] p-6 shadow-sm hover:-translate-y-1 transition-transform">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-subtle">{label}</p>
                  <p className={cn("text-4xl font-black mt-2", colorClass || "text-foreground")}>{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-subtle">Recent Submissions Log</p>
                <Link href="/reports" className="text-[11px] font-bold uppercase tracking-wider text-module hover:text-module">View Complete Ledger</Link>
              </div>

              {moduleOperations.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-subtle mx-auto my-8" /> : recentModuleRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-surface-2/50 rounded-3xl border border-dashed border-border">
                  <FileText className="h-10 w-10 text-subtle mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">No module records actively tracking.</p>
                  <p className="text-xs font-medium text-subtle mt-1">Submissions will appear here once workflows begin.</p>
                </div>
              ) : recentModuleRecords.slice(0, 6).map(record => (
                <Link key={record.id} href={`/${record.moduleSlug}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-card border border-border rounded-2xl hover:border-border-strong hover:shadow-md transition-all group gap-4">
                  <div className="min-w-0">
                    <div className="flex gap-2 mb-2">
                      <Badge className="bg-muted text-muted-foreground shadow-none border-0 text-[9px] font-bold uppercase tracking-wider">{record.moduleTitle}</Badge>
                      <Badge variant="outline" className="shadow-none border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider">{record.statusCode}</Badge>
                    </div>
                    <p className="text-base font-bold text-foreground truncate group-hover:text-module transition-colors">{record.title}</p>
                    <p className="text-[11px] font-bold text-subtle mt-1.5 uppercase tracking-wider">{record.recordNumber} • Stage: {record.workflowStage}</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0 bg-surface-2 sm:bg-transparent p-4 sm:p-0 rounded-xl">
                    <p className="text-[10px] font-bold text-subtle uppercase tracking-wider">Target Deadline</p>
                    <div className="flex items-center gap-1.5 justify-start sm:justify-end mt-1">
                      <Clock3 className="h-3 w-3 text-subtle" />
                      <p className="text-sm font-bold text-muted-foreground">{formatDate(record.dueAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Operational Pulse Chart */}
          <div className="rounded-[2.5rem] bg-card/85 backdrop-blur-md shadow-md p-8 md:p-10 bg-card/60 border border-white/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">Analytics</p>
                <h2 className="text-2xl font-black text-foreground mt-1">Operational Pulse</h2>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-subtle" />
              </div>
            </div>
            <OperationalPulseChart isLoading={isLoading} data={pulseData} />
          </div>
        </div>

        {/* RIGHT PANE: ALERTS & SESSION */}
        <div className="space-y-8 flex flex-col">
          
          {/* Active Session Card */}
          <div className="rounded-[2.5rem] bg-card/85 backdrop-blur-md shadow-md p-8 bg-slate-900 border border-slate-800 text-white shrink-0 shadow-xl shadow-slate-900/20">
            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">Active Security Session</p>
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User className="h-6 w-6 text-subtle" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operator</p>
                <p className="text-xl font-black mt-0.5">{user?.username || "—"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                 <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Role</p>
                 <p className="text-sm font-bold text-cyan-400 mt-1">{user?.roleCode || "—"}</p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                 <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">System Scope Visibility</p>
                 <p className="text-sm font-bold text-slate-200 mt-1 leading-snug">{scopeText}</p>
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
