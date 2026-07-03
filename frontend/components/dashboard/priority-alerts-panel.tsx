import type React from "react";
import { AlertTriangle, BellRing, Pill, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PharmacyAlertsResponseItem } from "@/types/dashboard";
import { cn } from "@/lib/utils";

function AlertBlock({
  title,
  message,
  icon: Icon,
  tone,
}: {
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "critical" | "warning" | "info" | "healthy";
}) {
  const toneClasses =
    tone === "critical"
      ? "border-red-500/20 bg-red-500/8"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/8"
        : tone === "healthy"
          ? "border-emerald-500/20 bg-success/8"
          : "border-cyan-500/20 bg-cyan-500/8";

  const iconClasses =
    tone === "critical"
      ? "text-red-400"
      : tone === "warning"
        ? "text-amber-400"
        : tone === "healthy"
          ? "text-emerald-400"
          : "text-cyan-400";

  return (
    <div
      className={cn(
        "rounded-[1.3rem] border p-4 transition-all duration-300 hover:-translate-y-0.5",
        toneClasses,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-card/[0.04]">
          <Icon className={cn("h-4 w-4", iconClasses)} />
        </div>
      </div>
    </div>
  );
}

export function PriorityAlertsPanel({
  criticalCount,
  warningCount,
  pharmacyAlerts,
}: {
  criticalCount: number;
  warningCount: number;
  pharmacyAlerts: PharmacyAlertsResponseItem[];
}) {
  const topAlerts = pharmacyAlerts.slice(0, 3);
  const hasAnyAlerts =
    criticalCount > 0 || warningCount > 0 || topAlerts.length > 0;

  return (
    <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/[0.03] via-transparent to-pulse/[0.03]" />

      <CardHeader className="relative flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Priority Alerts</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            High-signal issues needing attention first
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-card/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Live
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {!hasAnyAlerts ? (
          <AlertBlock
            title="No active alerts"
            message="Everything is currently stable in this scope."
            icon={ShieldCheck}
            tone="healthy"
          />
        ) : (
          <>
            {criticalCount > 0 && (
              <AlertBlock
                title="Critical alerts"
                message={`${criticalCount} unresolved critical issues need immediate attention.`}
                icon={AlertTriangle}
                tone="critical"
              />
            )}

            {warningCount > 0 && (
              <AlertBlock
                title="Warnings"
                message={`${warningCount} warning-level items are still open.`}
                icon={BellRing}
                tone="warning"
              />
            )}

            {topAlerts.map((alert) => (
              <AlertBlock
                key={alert.id}
                title={alert.title}
                message={alert.message}
                icon={Pill}
                tone="info"
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
