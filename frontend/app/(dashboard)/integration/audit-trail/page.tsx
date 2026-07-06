"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Shield,
  X,
  XCircle,
} from "lucide-react";
import { useDhaTransactions } from "@/hooks/use-dha-transactions";
import { useDhaStatus } from "@/hooks/use-sha-eligibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DhaTransaction } from "@/services/dha-service";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  COMPLETED: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  PENDING:   { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-500/10"   },
  QUEUED:    { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-500/10"    },
  PROCESSING:{ dot: "bg-cyan-400 animate-pulse", text: "text-cyan-400", bg: "bg-cyan-500/10" },
  FAILED:    { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10"     },
  RETRYING:  { dot: "bg-orange-400 animate-pulse", text: "text-orange-400", bg: "bg-orange-500/10" },
};

const TX_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  CLAIM_SUBMISSION:         { label: "Claim Submission",          icon: "📋" },
  ENCOUNTER_SUBMISSION:     { label: "Encounter",                 icon: "🏥" },
  ELIGIBILITY_CHECK:        { label: "Eligibility Check",         icon: "🛡️" },
  PATIENT_VERIFICATION:     { label: "Patient Verification",      icon: "👤" },
  PRACTITIONER_VERIFICATION:{ label: "Practitioner Verification", icon: "👨‍⚕️" },
  FACILITY_VERIFICATION:    { label: "Facility Verification",     icon: "🏢" },
  CONSENT:                  { label: "Consent Record",            icon: "✍️" },
  REFERRAL:                 { label: "Referral",                  icon: "↗️" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFullTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ─── Row detail panel ─────────────────────────────────────────────────────────

function TransactionDetail({ tx, onClose }: { tx: DhaTransaction; onClose: () => void }) {
  const statusCfg = STATUS_CONFIG[tx.statusCode] ?? STATUS_CONFIG["PENDING"];
  const typeInfo = TX_TYPE_LABELS[tx.transactionType] ?? { label: tx.transactionType, icon: "🔗" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeInfo.icon}</span>
              <h3 className="font-bold">{typeInfo.label}</h3>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusCfg.bg, statusCfg.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                {tx.statusCode}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Transaction #{tx.id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Metadata grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "FHIR Resource",   value: tx.fhirResourceType ?? "—" },
              { label: "API Version",     value: tx.apiVersion ? `v${tx.apiVersion}` : "—" },
              { label: "External Ref",    value: tx.externalRef ?? "None" },
              { label: "Correlation ID",  value: tx.correlationId ?? "—" },
              { label: "Created",         value: formatFullTime(tx.createdAt) },
              { label: "Submitted",       value: formatFullTime(tx.submittedAt) },
              { label: "Completed",       value: formatFullTime(tx.completedAt) },
              { label: "Facility ID",     value: String(tx.facilityId) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 font-mono text-xs break-all">{value}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          {tx.errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4">
              <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Error Details
              </p>
              <p className="text-xs text-red-300 font-mono leading-relaxed">{tx.errorMessage}</p>
            </div>
          )}

          {/* Request Payload */}
          {!!tx.requestPayload && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">FHIR Request Payload</p>
              <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-all bg-black/40 rounded-xl p-4 border border-green-500/20 max-h-64 overflow-y-auto">
                {JSON.stringify(tx.requestPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Response Payload */}
          {!!tx.responsePayload && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">DHA Response Payload</p>
              <pre className="text-xs text-cyan-400 font-mono leading-relaxed whitespace-pre-wrap break-all bg-black/40 rounded-xl p-4 border border-cyan-500/20 max-h-64 overflow-y-auto">
                {JSON.stringify(tx.responsePayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DhaAuditTrailPage() {
  const { data: dhaStatus } = useDhaStatus();
  const { data: txData = [], isLoading, refetch, isFetching } = useDhaTransactions({ limit: 200 });

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [selectedTx, setSelectedTx] = React.useState<DhaTransaction | null>(null);

  const transactions = Array.isArray(txData) ? txData : [];

  // Derived
  const statusCounts = React.useMemo(() =>
    transactions.reduce((acc, t) => { acc[t.statusCode] = (acc[t.statusCode] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    [transactions]
  );
  const typeCounts = React.useMemo(() =>
    transactions.reduce((acc, t) => { acc[t.transactionType] = (acc[t.transactionType] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    [transactions]
  );

  const filtered = React.useMemo(() => {
    let list = transactions;
    if (statusFilter !== "ALL") list = list.filter((t) => t.statusCode === statusFilter);
    if (typeFilter !== "ALL") list = list.filter((t) => t.transactionType === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        [String(t.id), t.transactionType, t.statusCode, t.externalRef, t.correlationId, t.errorMessage]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, statusFilter, typeFilter, search]);

  const failedCount = statusCounts["FAILED"] ?? 0;
  const pendingCount = (statusCounts["PENDING"] ?? 0) + (statusCounts["QUEUED"] ?? 0);
  const completedCount = statusCounts["COMPLETED"] ?? 0;

  // CSV export
  const exportCsv = () => {
    const header = "ID,Type,Status,FHIR Resource,External Ref,Created,Submitted,Error";
    const rows = filtered.map((t) =>
      [t.id, t.transactionType, t.statusCode, t.fhirResourceType ?? "", t.externalRef ?? "", t.createdAt, t.submittedAt ?? "", t.errorMessage?.slice(0, 80) ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dha-audit-trail.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-800/10 via-purple-700/5 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-xs">DHA AfyaLink</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Integration Audit Trail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Full history of every DHA transaction — eligibility checks, encounters, claims, referrals
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="rounded-xl gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </section>

      {/* ── KPI band ────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Transactions", value: String(transactions.length), color: "text-foreground", border: "border-white/10" },
          { label: "Completed",          value: String(completedCount), color: "text-emerald-400", border: "border-emerald-500/20" },
          { label: "Pending / Queued",   value: String(pendingCount),   color: "text-amber-400",   border: "border-amber-500/20" },
          { label: "Failed",             value: String(failedCount),    color: "text-red-400",     border: "border-red-500/20"  },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={cn("rounded-2xl border bg-white/[0.03] p-4", border)}>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={cn("mt-1.5 text-2xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters bar ─────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
        <CardContent className="p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, type, ref, correlation ID, or error…"
              className="h-11 rounded-2xl pl-10"
            />
          </div>

          {/* Status filter */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3 w-3" /> Status
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  statusFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-white/[0.04] text-muted-foreground border border-white/10 hover:text-foreground"
                )}
              >
                All ({transactions.length})
              </button>
              {Object.entries(statusCounts).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === status ? "ALL" : status)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all border",
                      statusFilter === status
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-white/[0.04] border-white/10 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cfg && <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />}
                    {status} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Transaction Type</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  typeFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-white/[0.04] text-muted-foreground border border-white/10 hover:text-foreground"
                )}
              >
                All types
              </button>
              {Object.entries(typeCounts).map(([type, count]) => {
                const info = TX_TYPE_LABELS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(typeFilter === type ? "ALL" : type)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all border",
                      typeFilter === type
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-white/[0.04] border-white/10 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {info ? `${info.icon} ${info.label}` : type} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {(statusFilter !== "ALL" || typeFilter !== "ALL" || search) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Showing {filtered.length} of {transactions.length} transactions</span>
              <button
                type="button"
                onClick={() => { setStatusFilter("ALL"); setTypeFilter("ALL"); setSearch(""); }}
                className="text-primary hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Transaction table ────────────────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Transaction Log
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse h-14 rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Server className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">No transactions found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {transactions.length === 0
                    ? dhaStatus?.enabled
                      ? "No DHA transactions recorded yet. Run an eligibility check to start."
                      : "DHA integration is disabled. Enable it to start recording transactions."
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
              {filtered.map((tx) => {
                const statusCfg = STATUS_CONFIG[tx.statusCode] ?? { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/10" };
                const typeInfo = TX_TYPE_LABELS[tx.transactionType] ?? { label: tx.transactionType, icon: "🔗" };

                return (
                  <div
                    key={tx.id}
                    className="group flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3 transition-all hover:border-primary/30 hover:bg-background/60"
                  >
                    {/* Status dot */}
                    <span className={cn("h-2 w-2 shrink-0 rounded-full mt-0.5", statusCfg.dot)} />

                    {/* ID + type */}
                    <div className="w-8 shrink-0 text-center">
                      <span className="text-[10px] font-mono text-muted-foreground">#{tx.id}</span>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{typeInfo.icon} {typeInfo.label}</span>
                        {tx.fhirResourceType && (
                          <span className="font-mono text-[10px] border border-border/40 rounded px-1.5 py-0.5 text-muted-foreground bg-background/60">
                            {tx.fhirResourceType}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(tx.createdAt)}
                        </span>
                        {tx.externalRef && (
                          <span className="font-mono">Ref: {tx.externalRef}</span>
                        )}
                        {tx.errorMessage && (
                          <span className="text-red-400 truncate max-w-[200px]" title={tx.errorMessage}>
                            ⚠ {tx.errorMessage.slice(0, 50)}…
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={cn(
                      "hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
                      statusCfg.bg, statusCfg.text
                    )}>
                      {tx.statusCode}
                    </span>

                    {/* View button */}
                    <button
                      type="button"
                      onClick={() => setSelectedTx(tx)}
                      className="rounded-xl border border-border/50 p-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:border-primary/40 transition-all"
                      title="View FHIR payload"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      {selectedTx && (
        <TransactionDetail tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}
