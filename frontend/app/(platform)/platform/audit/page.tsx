"use client";

import * as React from "react";
import {
  Activity,
  CalendarClock,
  Download,
  Fingerprint,
  Loader2,
  MonitorCog,
  Network,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { getAuditLogsExport } from "@/services/audit-log-service";

const modules = [
  "AUTH",
  "USERS",
  "SETTINGS",
  "PATIENTS",
  "LAB",
  "BILLING",
  "INVOICES",
  "PHARMACY",
  "STAFF",
  "FACILITIES",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actorName(log: {
  actorUser?: { username: string; fullName?: string | null } | null;
  actorStaff?: { firstName: string; lastName: string } | null;
}) {
  if (log.actorStaff) {
    return `${log.actorStaff.firstName} ${log.actorStaff.lastName}`.trim();
  }

  return log.actorUser?.fullName || log.actorUser?.username || "System";
}

export default function AuditPage() {
  const [moduleName, setModuleName] = React.useState("");
  const [entityId, setEntityId] = React.useState("");
  const [isExporting, setIsExporting] = React.useState(false);
  const { data, isLoading } = useAuditLogs({
    moduleName: moduleName || undefined,
    entityId: entityId || undefined,
  });

  const logs = Array.isArray(data) ? data : [];
  const criticalCount = logs.filter((log) =>
    log.actionName.toUpperCase().includes("FAILED"),
  ).length;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const file = await getAuditLogsExport({
        moduleName: moduleName || undefined,
        entityId: entityId || undefined,
      });
      const blob = new Blob([`\uFEFF${file.csvText}`], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.6rem] border surface-spotlight p-6 shadow-md md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(14,165,233,.12),transparent_48%,rgba(16,185,129,.09))]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-4">
            <Badge className="rounded-full border-0 bg-success/10 px-3 py-1 text-success">
              Audit and accountability
            </Badge>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-500">
                <Fingerprint className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Audit Trail
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Review who changed what, where it happened, when it happened,
                  and the device or network that touched the system.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <Activity className="mb-3 h-5 w-5 text-cyan-500" />
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">events loaded</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-500" />
              <p className="text-2xl font-bold">{modules.length}</p>
              <p className="text-xs text-muted-foreground">quick filters</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <MonitorCog className="mb-3 h-5 w-5 text-amber-500" />
              <p className="text-2xl font-bold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">failed actions</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[1.4rem] surface-spotlight shadow-md">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Trace Explorer</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export CSV
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={moduleName}
                  onChange={(event) =>
                    setModuleName(event.target.value.toUpperCase())
                  }
                  placeholder="Module"
                  className="h-10 rounded-xl pl-9 sm:w-44"
                />
              </div>
              <Input
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
                placeholder="Entity ID"
                className="h-10 rounded-xl sm:w-44"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {modules.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setModuleName(item === moduleName ? "" : item)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  moduleName === item
                    ? "border-cyan-400 bg-cyan-400/10 text-module"
                    : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading audit events...
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No audit events match this filter.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid min-w-[920px] grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr] border-b border-border bg-muted/55 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
                <span>Action</span>
                <span>Actor</span>
                <span>Scope</span>
                <span>Machine and network</span>
                <span>When</span>
              </div>
              <div className="max-h-[620px] min-w-[920px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr] gap-4 border-b border-border px-4 py-4 text-sm last:border-0"
                  >
                    <div>
                      <Badge className="mb-2 rounded-full border-0 bg-cyan-500/10 text-module">
                        {log.moduleName}
                      </Badge>
                      <p className="font-semibold">{log.actionName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.entityType || "ENTITY"} #{log.entityId || log.id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <UserRoundCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="font-medium">{actorName(log)}</p>
                        <p className="text-xs text-muted-foreground">
                          User #{log.actorUserId || "-"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">
                        {log.facility?.name || "System"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.branch?.name || "Facility-wide"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 font-mono text-xs">
                        <Network className="h-3.5 w-3.5 text-cyan-500" />
                        {log.ipAddress || "Unknown network"}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {log.userAgent || "Unknown device"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {formatDate(log.createdAt)}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
