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
import { ClinicalAiAssistant } from "@/components/ai/clinical-ai-assistant";
import { SystemNavigatorAssistant } from "@/components/dashboard/system-navigator-assistant";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { useSystemHealth, useUnresolvedCounts } from "@/hooks/use-dashboard-data";

const controlSignals = [
  {
    title: "Access lockdown",
    text: "Recover locked users, inspect roles, control sessions, and confirm branch scope.",
    icon: LockKeyhole,
  },
  {
    title: "Location evidence",
    text: "Review live and last-seen location records for authenticated users.",
    icon: MapPin,
  },
  {
    title: "Revenue guard",
    text: "Move quickly to invoices, tariffs, removed lines, cashier work, and reports.",
    icon: Receipt,
  },
  {
    title: "AI navigation",
    text: "Help staff find the correct module without bypassing their permissions.",
    icon: Bot,
  },
];

export default function PlatformAdminControlPage() {
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
        <Card className="rounded-lg border border-warning/30 bg-card">
          <CardContent className="p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center border border-warning/30 bg-warning-soft text-warning">
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
      <section className="overflow-hidden border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr] xl:items-end">
          <div className="space-y-4">
            <Badge className="rounded border border-border bg-surface-2 px-3 py-1 text-module">
              platform-control / admin-intelligence
            </Badge>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-border bg-surface-2">
                <ShieldCheck className="h-7 w-7 text-module" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                  Platform Admin Control Center
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  The platform control layer for users, facilities, catalogs,
                  audit, location evidence, pricing paths, reports, and AI user
                  guidance.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-y border-border bg-surface-2/70 p-4 sm:grid-cols-3">
            <div className="border-l-2 border-border-strong pl-3">
              <Activity className="mb-3 h-5 w-5 text-module" />
              <p className="text-3xl font-bold text-foreground">
                {health?.healthScore ?? "--"}
              </p>
              <p className="text-xs text-muted-foreground">health score</p>
            </div>
            <div className="border-l-2 border-border-strong pl-3">
              <ShieldCheck className="mb-3 h-5 w-5 text-module" />
              <p className="text-3xl font-bold text-foreground">{counts?.counts.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">open alerts</p>
            </div>
            <div className="border-l-2 border-border-strong pl-3">
              <Receipt className="mb-3 h-5 w-5 text-module" />
              <p className="text-3xl font-bold text-foreground">
                {health?.summary.billingFailures ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">billing failures</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-y border-border bg-surface-2/70 p-4 md:grid-cols-2 xl:grid-cols-4">
        {controlSignals.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-3 border-l-2 border-border-strong pl-3">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-module" />
              <div>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-6">
        <ClinicalAiAssistant
          title="Clinical AI"
          defaultTask="GENERAL_DRAFT"
          subtitle="Draft clinical text, discharge wording, reports, and patient instructions for staff review."
        />

        <SystemNavigatorAssistant
          user={user}
          scopeText={scopeText}
          healthScore={health?.healthScore ?? "--"}
          openAlerts={counts?.counts.total ?? 0}
          activeAdmissions={health?.summary.activeAdmissions ?? 0}
          pendingLabs={health?.summary.pendingLabQueue ?? 0}
        />
      </section>

      <AdminCommandCenter />
    </div>
  );
}
