"use client";

import {
  Activity,
  Bot,
  LockKeyhole,
  MapPin,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AdminCommandCenter } from "@/components/dashboard/admin-command-center";
import { SystemNavigatorAssistant } from "@/components/dashboard/system-navigator-assistant";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { useSystemHealth, useUnresolvedCounts } from "@/hooks/use-dashboard-data";

const controlSignals = [
  {
    title: "Access lockdown",
    text: "User lockouts, role checks, session control, and branch scope.",
    icon: LockKeyhole,
  },
  {
    title: "Location evidence",
    text: "Live and last-seen location intelligence for super admins.",
    icon: MapPin,
  },
  {
    title: "Revenue guard",
    text: "Invoice line edits, cashier close, reports, tariffs, and leakage review.",
    icon: Receipt,
  },
  {
    title: "AI navigation",
    text: "Guides stuck users to the right module without bypassing permissions.",
    icon: Bot,
  },
];

export default function AdminControlPage() {
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

  const health = systemHealth.data;
  const counts = unresolvedCounts.data;
  const canManage = ["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(
    user?.roleCode ?? "",
  );
  const scopeText = facilityName
    ? `${facilityName} - ${selectedBranchName || "All allowed branches"}`
    : "No facility scope";

  if (!canManage) {
    return (
      <div className="space-y-6">
        <Card className="rounded-lg gradient-border">
          <CardContent className="p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Admin access required</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              This control center is restricted to super admins, admins, and
              facility admins because it exposes high-impact hospital controls.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-cyan-300/15 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,.24),transparent_28%),linear-gradient(125deg,rgba(2,6,23,.98),rgba(8,47,73,.72),rgba(6,78,59,.55))]" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(34,211,238,.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,.12)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative grid gap-6 xl:grid-cols-[1fr_0.8fr] xl:items-end">
          <div className="space-y-4">
            <Badge className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-cyan-100">
              admin-control / command-intelligence
            </Badge>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10">
                <ShieldCheck className="h-7 w-7 text-cyan-200" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  Admin Control Center
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/68">
                  The hospital command layer for access, billing, pharmacy,
                  reports, patient flow, audit, facility structure, and AI
                  user guidance.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-cyan-300/14 bg-white/[0.06] p-4">
              <Activity className="mb-3 h-5 w-5 text-cyan-200" />
              <p className="text-3xl font-bold">
                {health?.healthScore ?? "--"}
              </p>
              <p className="text-xs text-white/55">health score</p>
            </div>
            <div className="rounded-lg border border-cyan-300/14 bg-white/[0.06] p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="text-3xl font-bold">{counts?.counts.total ?? 0}</p>
              <p className="text-xs text-white/55">open alerts</p>
            </div>
            <div className="rounded-lg border border-cyan-300/14 bg-white/[0.06] p-4">
              <Receipt className="mb-3 h-5 w-5 text-amber-200" />
              <p className="text-3xl font-bold">
                {health?.summary.billingFailures ?? 0}
              </p>
              <p className="text-xs text-white/55">billing failures</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {controlSignals.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="rounded-lg gradient-border">
              <CardContent className="p-4">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.text}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <SystemNavigatorAssistant
        user={user}
        scopeText={scopeText}
        healthScore={health?.healthScore ?? "--"}
        openAlerts={counts?.counts.total ?? 0}
        activeAdmissions={health?.summary.activeAdmissions ?? 0}
        pendingLabs={health?.summary.pendingLabQueue ?? 0}
      />

      <AdminCommandCenter />
    </div>
  );
}
