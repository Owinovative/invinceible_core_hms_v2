"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useDhaStatus } from "@/hooks/use-sha-eligibility";
import { useShaClaims } from "@/hooks/use-sha-claims";
import { useShaClaimSummary } from "@/hooks/use-sha-claim-summary";
import { cn } from "@/lib/utils";

function formatMoney(v?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

type ClaimItem = { statusCode: string; claimedAmount?: number; approvedAmount?: number; paidAmount?: number };

export function ShaOperationalWidget() {
  const { data: dhaStatus, isLoading: isStatusLoading } = useDhaStatus();
  const { data: claimsRaw = [] } = useShaClaims();
  const { data: summary } = useShaClaimSummary();

  const claims = (Array.isArray(claimsRaw) ? claimsRaw : []) as ClaimItem[];
  const dhaEnabled = dhaStatus?.enabled ?? false;

  const pendingClaims = claims.filter((c) => ["DRAFT", "PENDING"].includes(c.statusCode)).length;
  const submittedClaims = claims.filter((c) => c.statusCode === "SUBMITTED").length;
  const rejectedClaims = claims.filter((c) => c.statusCode === "REJECTED").length;
  const paidClaims = claims.filter((c) => c.statusCode === "PAID").length;

  // Success rate
  const total = claims.length;
  const successRate = total > 0
    ? Math.round(((paidClaims + claims.filter((c) => c.statusCode === "ACCEPTED").length) / total) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">SHA Integration</h3>
            <p className="text-[11px] text-muted-foreground">AfyaLink · DHA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isStatusLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <span className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              dhaEnabled
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", dhaEnabled ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
              {dhaEnabled ? "Live" : "Offline"}
            </span>
          )}
          <Link
            href="/integration"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            Full view <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 divide-x divide-border/60">
        <div className="p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Claims Filed</p>
          <p className="mt-1 text-2xl font-bold">{summary?.count ?? total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatMoney(summary?.claimedAmount)} claimed</p>
        </div>
        <div className="p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Paid Out</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{formatMoney(summary?.paidAmount)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{paidClaims} claims settled</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="px-5 pb-4 space-y-2.5">
        {[
          { label: "Awaiting submission", count: pendingClaims, color: "text-amber-400", dot: "bg-amber-400", urgent: pendingClaims > 5 },
          { label: "Submitted to SHA", count: submittedClaims, color: "text-blue-400", dot: "bg-blue-400 animate-pulse", urgent: false },
          { label: "Rejected — need review", count: rejectedClaims, color: "text-red-400", dot: "bg-red-400", urgent: rejectedClaims > 0 },
          { label: "Approved & paid", count: paidClaims, color: "text-emerald-400", dot: "bg-emerald-400", urgent: false },
        ].map(({ label, count, color, dot, urgent }) => (
          count > 0 ? (
            <div key={label} className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2",
              urgent ? "bg-red-500/8 border border-red-500/20" : "bg-white/[0.03] border border-white/8"
            )}>
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                <span className="text-muted-foreground">{label}</span>
              </div>
              <span className={cn("text-sm font-bold", color)}>{count}</span>
            </div>
          ) : null
        ))}

        {/* Success rate bar */}
        {total > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">Claim success rate</span>
              <span className="text-[11px] font-semibold text-foreground">{successRate}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  successRate >= 80 ? "bg-emerald-500" : successRate >= 50 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer CTAs */}
      <div className="flex border-t border-border/60 divide-x divide-border/60">
        <Link
          href="/sha-claims"
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <FileCheck2 className="h-3.5 w-3.5" />
          Manage Claims
        </Link>
        <Link
          href="/patients"
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Verify Eligibility
        </Link>
      </div>
    </div>
  );
}
