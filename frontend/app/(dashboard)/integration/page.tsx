"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileSearch,
  Loader2,
  Network,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
  Database,
  GitBranch,
  Eye,
} from "lucide-react";
import { useDhaStatus, useDhaTransactions } from "@/hooks/use-sha-eligibility";
import { useCheckShaEligibility } from "@/hooks/use-sha-eligibility";
import { useShaClaims } from "@/hooks/use-sha-claims";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DhaTransaction } from "@/services/dha-service";
import type { EligibilityResult } from "@/services/dha-service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
}

function formatMoney(v?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

// ─── Status config ────────────────────────────────────────────────────────────

const TX_STATUS: Record<string, { color: string; dot: string; label: string }> = {
  COMPLETED: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Completed" },
  PENDING: { color: "text-amber-400", dot: "bg-amber-400", label: "Pending" },
  QUEUED: { color: "text-blue-400", dot: "bg-blue-400", label: "Queued" },
  PROCESSING: { color: "text-cyan-400", dot: "bg-cyan-400 animate-pulse", label: "Processing" },
  FAILED: { color: "text-red-400", dot: "bg-red-400", label: "Failed" },
  RETRYING: { color: "text-orange-400", dot: "bg-orange-400 animate-pulse", label: "Retrying" },
};

const TX_TYPE_LABELS: Record<string, string> = {
  CLAIM_SUBMISSION: "Claim Submission",
  ENCOUNTER_SUBMISSION: "Encounter",
  ELIGIBILITY_CHECK: "Eligibility Check",
  PATIENT_VERIFICATION: "Patient Verify",
  PRACTITIONER_VERIFICATION: "Practitioner Verify",
  FACILITY_VERIFICATION: "Facility Verify",
  CONSENT: "Consent",
  REFERRAL: "Referral",
};

// ─── Quick Eligibility ────────────────────────────────────────────────────────

function QuickEligibilityWidget() {
  const [identifier, setIdentifier] = React.useState("");
  const [result, setResult] = React.useState<EligibilityResult | null>(null);
  const mutation = useCheckShaEligibility();

  const handleVerify = async () => {
    if (!identifier.trim()) return;
    const isMember = !(/^\d{5,8}$/.test(identifier.trim()));
    try {
      const res = await mutation.mutateAsync(
        isMember ? { memberNumber: identifier.trim() } : { nationalId: identifier.trim() }
      );
      setResult(res);
    } catch {
      setResult(null);
    }
  };

  return (
    <Card className="overflow-hidden border border-border/50 bg-card/50 backdrop-blur-xl">
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          Quick Eligibility Check
        </CardTitle>
        <CardDescription>Enter SHA member number or National ID</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="SHA-XXXXXX or NID"
            className="h-10 rounded-xl font-mono text-sm"
          />
          <Button
            onClick={handleVerify}
            disabled={mutation.isPending || !identifier.trim()}
            size="sm"
            className="h-10 shrink-0 rounded-xl gap-1.5"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Verify
          </Button>
        </div>

        {mutation.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            {mutation.error?.message ?? "Verification failed"}
          </div>
        )}

        {result && (
          <div className={cn(
            "rounded-xl border p-3 space-y-2",
            result.status === "ELIGIBLE"
              ? "border-emerald-500/30 bg-emerald-500/8"
              : result.status === "NOT_FOUND"
              ? "border-amber-500/30 bg-amber-500/8"
              : "border-red-500/30 bg-red-500/8"
          )}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{result.memberName ?? "Unknown"}</span>
              <span className={cn("text-xs font-bold",
                result.status === "ELIGIBLE" ? "text-emerald-400"
                : result.status === "NOT_FOUND" ? "text-amber-400"
                : "text-red-400"
              )}>
                {result.status.replace("_", " ")}
              </span>
            </div>
            {result.memberNumber && (
              <p className="font-mono text-xs text-muted-foreground">
                No: {result.memberNumber}
              </p>
            )}
            {result.scheme && (
              <p className="text-xs text-muted-foreground">Scheme: {result.scheme}</p>
            )}
            {result.membershipStatus && (
              <p className="text-xs">
                Status:{" "}
                <span className={result.membershipStatus === "ACTIVE" ? "text-emerald-400" : "text-red-400"}>
                  {result.membershipStatus}
                </span>
              </p>
            )}
            {result.responseTimestamp && (
              <p className="text-[10px] text-muted-foreground border-t border-white/8 pt-2">
                <Clock className="inline h-3 w-3 mr-1" />
                {new Date(result.responseTimestamp).toLocaleString("en-KE")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx, onViewPayload }: { tx: DhaTransaction; onViewPayload?: (tx: DhaTransaction) => void }) {
  const s = TX_STATUS[tx.statusCode] ?? { color: "text-muted-foreground", dot: "bg-muted-foreground", label: tx.statusCode };
  const typeLabel = TX_TYPE_LABELS[tx.transactionType] ?? tx.transactionType;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3 transition-colors hover:bg-background/60">
      <span className={cn("h-2 w-2 rounded-full shrink-0 mt-0.5", s.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{typeLabel}</span>
          {tx.fhirResourceType && (
            <span className="text-[10px] text-muted-foreground border border-border/40 rounded px-1.5 py-0.5 bg-background/60 font-mono">
              {tx.fhirResourceType}
            </span>
          )}
          {tx.apiVersion && (
            <span className="text-[10px] text-muted-foreground">v{tx.apiVersion}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatTime(tx.createdAt)}</span>
          {tx.externalRef && (
            <span className="font-mono">Ref: {tx.externalRef}</span>
          )}
          {tx.errorMessage && (
            <span className="text-red-400 truncate max-w-[200px]" title={tx.errorMessage}>
              {tx.errorMessage.slice(0, 60)}…
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-xs font-semibold", s.color)}>{s.label}</span>
        {onViewPayload && (
          <button
            type="button"
            onClick={() => onViewPayload(tx)}
            className="rounded-lg border border-border/50 p-1 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="View FHIR payload"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── FHIR Payload Viewer ──────────────────────────────────────────────────────

function FhirPayloadModal({ tx, onClose }: { tx: DhaTransaction; onClose: () => void }) {
  const payload = tx.responsePayload ?? tx.requestPayload;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-bold">{TX_TYPE_LABELS[tx.transactionType] ?? tx.transactionType}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transaction #{tx.id} · {tx.fhirResourceType} · {tx.statusCode}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-accent">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-5">
          <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-all bg-black/40 rounded-xl p-4 border border-green-500/20">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
        <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {tx.externalRef && <span className="mr-4">Ext Ref: {tx.externalRef}</span>}
          {tx.correlationId && <span>Correlation: {tx.correlationId}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IntegrationDashboardPage() {
  const { data: dhaStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useDhaStatus();
  const { data: transactions = [], isLoading: isTxLoading, refetch: refetchTx } = useDhaTransactions({ limit: 50 });
  const { data: claimsData = [] } = useShaClaims();

  const [viewTx, setViewTx] = React.useState<DhaTransaction | null>(null);
  const [txFilter, setTxFilter] = React.useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const claims = Array.isArray(claimsData) ? claimsData : [];

  // ── Derived metrics from real data ────────────────────────────────────────

  const txList = Array.isArray(transactions) ? transactions : [];

  const txByStatus = React.useMemo(() => {
    return txList.reduce((acc, tx) => {
      acc[tx.statusCode] = (acc[tx.statusCode] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [txList]);

  const txByType = React.useMemo(() => {
    return txList.reduce((acc, tx) => {
      acc[tx.transactionType] = (acc[tx.transactionType] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [txList]);

  const totalTx = txList.length;
  const successTx = txByStatus["COMPLETED"] ?? 0;
  const failedTx = txByStatus["FAILED"] ?? 0;
  const pendingTx = (txByStatus["PENDING"] ?? 0) + (txByStatus["QUEUED"] ?? 0);
  const successRate = totalTx > 0 ? Math.round((successTx / totalTx) * 100) : 0;

  const claimsByStatus = React.useMemo(() => {
    return claims.reduce((acc, c: any) => {
      const s = String(c.statusCode ?? "UNKNOWN");
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [claims]);

  const totalClaimedAmount = claims.reduce((sum, c: any) => sum + Number(c.claimedAmount ?? 0), 0);
  const totalApprovedAmount = claims.reduce((sum, c: any) => sum + Number(c.approvedAmount ?? 0), 0);

  // Queue health derived from status
  const queue = dhaStatus?.queue ?? [];
  const queuePending = queue.reduce((s, q) =>
    ["PENDING", "QUEUED", "PROCESSING"].includes(q.status ?? "") ? s + q.count : s
  , 0) || pendingTx;

  const filteredTx = React.useMemo(() => {
    if (txFilter === "ALL") return txList;
    if (txFilter === "FAILED") return txList.filter((t) => t.statusCode === "FAILED");
    if (txFilter === "CLAIMS") return txList.filter((t) => t.transactionType === "CLAIM_SUBMISSION");
    if (txFilter === "ELIGIBILITY") return txList.filter((t) =>
      ["ELIGIBILITY_CHECK", "PATIENT_VERIFICATION"].includes(t.transactionType)
    );
    return txList;
  }, [txList, txFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchStatus(), refetchTx()]);
    setIsRefreshing(false);
  };

  const dhaEnabled = dhaStatus?.enabled ?? false;

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn(
              "rounded-full border-0 px-3 py-1 text-xs font-semibold",
              dhaEnabled ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            )}>
              <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full inline-block",
                dhaEnabled ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              )} />
              DHA {dhaEnabled ? "Online" : "Offline"}
            </Badge>
            {dhaStatus?.mode && (
              <Badge variant="outline" className="text-xs font-mono">
                {dhaStatus.mode}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AfyaLink Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of your SHA/DHA Health Information Exchange
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI tiles ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Integration Status",
            value: dhaEnabled ? "Connected" : "Disconnected",
            sub: `API v${dhaStatus?.apiVersion ?? "1"} · ${dhaStatus?.mode ?? "—"}`,
            icon: <Network className="h-5 w-5" />,
            color: dhaEnabled ? "text-emerald-400" : "text-red-400",
            border: dhaEnabled ? "border-emerald-500/20" : "border-red-500/20",
            bg: dhaEnabled ? "bg-emerald-500/5" : "bg-red-500/5",
          },
          {
            title: "Success Rate",
            value: `${successRate}%`,
            sub: `${successTx} completed of ${totalTx} total`,
            icon: <BadgeCheck className="h-5 w-5" />,
            color: successRate >= 90 ? "text-emerald-400" : successRate >= 70 ? "text-amber-400" : "text-red-400",
            border: "border-primary/20",
            bg: "bg-primary/5",
          },
          {
            title: "Queue / Pending",
            value: String(queuePending),
            sub: `${failedTx} failed · needs attention`,
            icon: <Server className="h-5 w-5" />,
            color: failedTx > 0 ? "text-red-400" : "text-primary",
            border: failedTx > 0 ? "border-red-500/20" : "border-primary/20",
            bg: failedTx > 0 ? "bg-red-500/5" : "bg-primary/5",
          },
          {
            title: "Claims Pipeline",
            value: String(claims.length),
            sub: `${formatMoney(totalClaimedAmount)} claimed · ${formatMoney(totalApprovedAmount)} approved`,
            icon: <Zap className="h-5 w-5" />,
            color: "text-primary",
            border: "border-primary/20",
            bg: "bg-primary/5",
          },
        ].map((tile, i) => (
          <Card key={i} className={cn("overflow-hidden border backdrop-blur-xl", tile.border, tile.bg)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.title}</CardTitle>
              <div className={cn("p-2 rounded-xl bg-background/60 border border-border/40", tile.color)}>
                {tile.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold tracking-tight", tile.color)}>{tile.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{tile.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* Left: Transaction Feed */}
        <div className="space-y-4">
          <Card className="overflow-hidden border border-border/50 bg-card/50 backdrop-blur-xl">
            <div className="h-1 bg-gradient-to-r from-primary to-cyan-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  DHA Transaction Log
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {isTxLoading ? "Loading…" : `${txList.length} transactions`}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Filter tabs */}
              <div className="flex gap-1 rounded-xl border border-border/50 bg-background/40 p-1">
                {[
                  { id: "ALL", label: `All (${txList.length})` },
                  { id: "FAILED", label: `Failed (${failedTx})` },
                  { id: "CLAIMS", label: `Claims (${txByType["CLAIM_SUBMISSION"] ?? 0})` },
                  { id: "ELIGIBILITY", label: "Eligibility" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTxFilter(tab.id)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      txFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Transactions list */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {isTxLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse h-16 rounded-xl bg-white/[0.04]" />
                  ))
                ) : filteredTx.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Database className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {dhaEnabled
                        ? "No transactions yet. Run an eligibility check or submit a claim."
                        : "DHA integration is disabled. Enable it to start processing."}
                    </p>
                  </div>
                ) : (
                  filteredTx.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} onViewPayload={setViewTx} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Claims pipeline summary */}
          {claims.length > 0 && (
            <Card className="overflow-hidden border border-border/50 bg-card/50 backdrop-blur-xl">
              <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-4 w-4 text-amber-400" />
                  SHA Claims Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  {[
                    { status: "DRAFT", label: "Draft", color: "text-muted-foreground" },
                    { status: "SUBMITTED", label: "Submitted", color: "text-blue-400" },
                    { status: "ACCEPTED", label: "Accepted", color: "text-emerald-400" },
                    { status: "REJECTED", label: "Rejected", color: "text-red-400" },
                    { status: "PAID", label: "Paid", color: "text-emerald-400" },
                    { status: "PENDING", label: "Pending", color: "text-amber-400" },
                  ].map(({ status, label, color }) => (
                    <div key={status} className="rounded-xl border border-border/40 bg-background/40 p-3">
                      <p className={cn("text-2xl font-bold", color)}>{claimsByStatus[status] ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/40 pt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Claimed: </span>
                    <span className="font-semibold">{formatMoney(totalClaimedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Approved: </span>
                    <span className="font-semibold text-emerald-400">{formatMoney(totalApprovedAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Quick eligibility + queue health */}
        <div className="space-y-4">
          <QuickEligibilityWidget />

          {/* DHA queue health */}
          <Card className="overflow-hidden border border-border/50 bg-card/50 backdrop-blur-xl">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4 text-violet-400" />
                Outbound Queue Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {queue.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {isStatusLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    "Queue is clear"
                  )}
                </div>
              ) : (
                queue.map((q, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{q.operation ?? q.integration}</p>
                      <p className="text-xs text-muted-foreground">{q.status}</p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      q.count > 10 ? "text-red-400" : q.count > 0 ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {q.count}
                    </span>
                  </div>
                ))
              )}

              {/* Summary from transactions if no queue data */}
              {queue.length === 0 && pendingTx > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Pending transactions</p>
                    <p className="text-xs text-muted-foreground">Awaiting processing</p>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{pendingTx}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction type breakdown */}
          {Object.keys(txByType).length > 0 && (
            <Card className="overflow-hidden border border-border/50 bg-card/50 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSearch className="h-4 w-4 text-primary" />
                  Activity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(txByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="truncate text-xs">{TX_TYPE_LABELS[type] ?? type}</span>
                          <span className="font-semibold text-xs shrink-0">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.round((count / totalTx) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {failedTx > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/8 p-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">{failedTx} Failed Transaction{failedTx !== 1 ? "s" : ""}</p>
                <p className="text-xs text-red-300 mt-0.5">
                  Review the Transaction Log for error details. Failed claims may need manual resubmission.
                </p>
              </div>
            </div>
          )}

          {!dhaEnabled && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-400">DHA Integration Disabled</p>
                <p className="text-xs text-amber-300 mt-0.5">
                  Set <code className="font-mono bg-black/20 px-1 rounded">DHA_ENABLED=true</code> and configure credentials to activate.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FHIR Payload Modal ───────────────────────────────────────────── */}
      {viewTx && (
        <FhirPayloadModal tx={viewTx} onClose={() => setViewTx(null)} />
      )}
    </div>
  );
}
