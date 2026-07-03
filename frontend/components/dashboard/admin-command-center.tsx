"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Banknote,
  BedDouble,
  BellRing,
  Bot,
  Building2,
  ClipboardCheck,
  CreditCard,
  DatabaseZap,
  FileCheck2,
  FlaskConical,
  Gauge,
  GitBranch,
  HeartPulse,
  KeyRound,
  LockKeyhole,
  MapPin,
  PackageCheck,
  PackageSearch,
  Pill,
  Receipt,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Truck,
  UserCog,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AdminCriticalFunction = {
  title: string;
  href: string;
  category: string;
  owner: string;
  impact: string;
  signal: string;
  urgency: "critical" | "high" | "standard";
  icon: LucideIcon;
};

export const adminCriticalFunctions: AdminCriticalFunction[] = [
  {
    title: "Locked user recovery",
    href: "/platform/users",
    category: "Access",
    owner: "Super admin",
    impact: "Reactivate locked accounts, reset access, and prevent workflow stoppage.",
    signal: "rbac.lockout.control",
    urgency: "critical",
    icon: LockKeyhole,
  },
  {
    title: "User location radar",
    href: "/platform/user-locations",
    category: "Security",
    owner: "Super admin",
    impact: "See live and last known user network location, device, and route activity.",
    signal: "session.geo.trace",
    urgency: "critical",
    icon: MapPin,
  },
  {
    title: "Audit evidence export",
    href: "/platform/audit",
    category: "Security",
    owner: "Admin",
    impact: "Export actor, date, action, module, IP, and device evidence for review.",
    signal: "audit.evidence.csv",
    urgency: "critical",
    icon: ScrollText,
  },
  {
    title: "Permission matrix",
    href: "/platform/settings",
    category: "Access",
    owner: "Facility admin",
    impact: "Control settings, facility scope, branch access, and admin-only operations.",
    signal: "permissions.scope",
    urgency: "critical",
    icon: KeyRound,
  },
  {
    title: "Facility registry",
    href: "/platform/facilities",
    category: "Structure",
    owner: "Super admin",
    impact: "Create, edit, activate, and govern facility-level records.",
    signal: "facility.registry",
    urgency: "high",
    icon: Building2,
  },
  {
    title: "Branch topology",
    href: "/platform/branches",
    category: "Structure",
    owner: "Admin",
    impact: "Control branches, service points, patient scoping, and stock separation.",
    signal: "branch.scope",
    urgency: "high",
    icon: GitBranch,
  },
  {
    title: "Staff and user linking",
    href: "/platform/staff",
    category: "People",
    owner: "Admin",
    impact: "Make sure staff profiles, users, roles, departments, and branches match.",
    signal: "staff.user.link",
    urgency: "high",
    icon: UserCog,
  },
  {
    title: "System notifications",
    href: "/platform/notifications",
    category: "Communication",
    owner: "Admin",
    impact: "Send scoped alerts to facility teams and resolve notification pressure.",
    signal: "notification.bus",
    urgency: "high",
    icon: BellRing,
  },
  {
    title: "Master catalogs",
    href: "/platform/catalogs",
    category: "Catalogs",
    owner: "Super admin",
    impact: "Control master drugs, services, lab services, CSV import, and templates.",
    signal: "catalog.master.csv",
    urgency: "critical",
    icon: DatabaseZap,
  },
  {
    title: "Service tariffs",
    href: "/billing/tariffs",
    category: "Revenue",
    owner: "Admin",
    impact: "Set branch-specific lab, consultation, bed, nursing, and service prices.",
    signal: "tariff.branch.price",
    urgency: "critical",
    icon: Banknote,
  },
  {
    title: "Invoice control",
    href: "/billing",
    category: "Revenue",
    owner: "Cashier",
    impact: "Open patient workspace, add/remove invoice lines, and print compact invoices.",
    signal: "invoice.line.control",
    urgency: "critical",
    icon: Receipt,
  },
  {
    title: "Revenue integrity",
    href: "/revenue-integrity",
    category: "Revenue",
    owner: "Admin",
    impact: "Review deleted lines, cashier close, payment summaries, and leakage risks.",
    signal: "revenue.integrity",
    urgency: "critical",
    icon: WalletCards,
  },
  {
    title: "Reports and exports",
    href: "/reports",
    category: "Reporting",
    owner: "Admin",
    impact: "Download financial, pharmacy profit, module, and operations reports.",
    signal: "reports.download",
    urgency: "high",
    icon: Activity,
  },
  {
    title: "Pharmacy pricing",
    href: "/pharmacy-pricing",
    category: "Pharmacy",
    owner: "Pharmacist",
    impact: "Set selling and buying prices by branch without losing master drug control.",
    signal: "drug.branch.price",
    urgency: "critical",
    icon: Pill,
  },
  {
    title: "Branch stock control",
    href: "/pharmacy-stock",
    category: "Pharmacy",
    owner: "Pharmacist",
    impact: "Track quantity, reorder level, batch pressure, and stock alerts per branch.",
    signal: "stock.branch.level",
    urgency: "critical",
    icon: Warehouse,
  },
  {
    title: "Central store",
    href: "/central-store",
    category: "Pharmacy",
    owner: "Store admin",
    impact: "Coordinate facility-level medicine movement into branches.",
    signal: "central.store.flow",
    urgency: "high",
    icon: PackageCheck,
  },
  {
    title: "Doctor queue control",
    href: "/doctor-queue",
    category: "Clinical",
    owner: "Clinician",
    impact: "Separate pending and started consultations so doctors see what matters.",
    signal: "doctor.queue",
    urgency: "high",
    icon: Stethoscope,
  },
  {
    title: "Lab queue and results",
    href: "/lab",
    category: "Diagnostics",
    owner: "Lab",
    impact: "Receive orders, result tests, and trigger billing once services are complete.",
    signal: "lab.result.billing",
    urgency: "critical",
    icon: FlaskConical,
  },
  {
    title: "Admissions and IPD",
    href: "/ipd",
    category: "Clinical",
    owner: "Nursing",
    impact: "Manage beds, treatment charts, vitals, reviews, summaries, and discharge flow.",
    signal: "ipd.bed.treatment",
    urgency: "critical",
    icon: BedDouble,
  },
  {
    title: "Triage flow",
    href: "/triage",
    category: "Clinical",
    owner: "Nurse",
    impact: "Capture vitals and route patients to the right doctor queue.",
    signal: "triage.route",
    urgency: "high",
    icon: HeartPulse,
  },
  {
    title: "Patient registration",
    href: "/patients",
    category: "Front desk",
    owner: "Reception",
    impact: "Register patients, facility entries, and billing workspace readiness.",
    signal: "patient.entry",
    urgency: "high",
    icon: Users,
  },
  {
    title: "Appointment scheduling",
    href: "/appointments",
    category: "Front desk",
    owner: "Reception",
    impact: "Book, route, and queue patients cleanly from arrival to doctor review.",
    signal: "appointment.queue",
    urgency: "standard",
    icon: ClipboardCheck,
  },
  {
    title: "Medical records",
    href: "/medical-records",
    category: "Records",
    owner: "Records team",
    impact: "Find summaries, patient documents, and clinical PDF outputs.",
    signal: "mrd.summary",
    urgency: "high",
    icon: FileCheck2,
  },
  {
    title: "AI clinical assistant",
    href: "/ai-assistant",
    category: "AI",
    owner: "Clinician",
    impact: "Draft notes, summaries, instructions, and navigation guidance for users.",
    signal: "ai.assist",
    urgency: "standard",
    icon: Bot,
  },
  {
    title: "Procurement",
    href: "/procurement",
    category: "Operations",
    owner: "Procurement",
    impact: "Track purchase needs, supplier movement, and stock replenishment work.",
    signal: "procurement.flow",
    urgency: "standard",
    icon: Truck,
  },
  {
    title: "Assets and biomedical",
    href: "/assets",
    category: "Operations",
    owner: "Operations",
    impact: "Control facility assets, equipment status, and maintenance accountability.",
    signal: "asset.equipment",
    urgency: "standard",
    icon: PackageSearch,
  },
  {
    title: "Compliance center",
    href: "/compliance",
    category: "Quality",
    owner: "Quality",
    impact: "Track policy adherence, evidence, and compliance work.",
    signal: "compliance.control",
    urgency: "high",
    icon: ShieldCheck,
  },
  {
    title: "Infection control",
    href: "/infection-control",
    category: "Quality",
    owner: "Quality",
    impact: "Monitor IPC tasks, isolation signals, and safety interventions.",
    signal: "ipc.monitor",
    urgency: "high",
    icon: ShieldAlert,
  },
  {
    title: "Cashier close",
    href: "/revenue-integrity",
    category: "Revenue",
    owner: "Cashier",
    impact: "Close cashier activity, compare collections, and flag removed billing lines.",
    signal: "cash.close",
    urgency: "critical",
    icon: CreditCard,
  },
  {
    title: "Platform control plane",
    href: "/platform",
    category: "Platform",
    owner: "Super admin",
    impact: "Operate the system structure, facilities, users, catalogs, audit, and locations.",
    signal: "platform.root",
    urgency: "critical",
    icon: Gauge,
  },
  {
    title: "Settings guard",
    href: "/platform/settings",
    category: "Configuration",
    owner: "Admin",
    impact: "Review hospital runtime settings and keep critical controls admin-only.",
    signal: "settings.guard",
    urgency: "high",
    icon: Settings,
  },
];

const urgencyClasses = {
  critical:
    "border-red-500/25 bg-red-500/10 text-destructive",
  high: "border-amber-500/25 bg-amber-500/10 text-warning",
  standard:
    "border-cyan-500/25 bg-cyan-500/10 text-module",
};

export function AdminCommandCenter({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const categories = Array.from(
    new Set(adminCriticalFunctions.map((item) => item.category)),
  );
  const shownFunctions = compact
    ? adminCriticalFunctions.slice(0, 12)
    : adminCriticalFunctions;

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-[1.4rem] surface-spotlight shadow-md",
        className,
      )}
    >
      <CardHeader className="relative gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge className="rounded-md border border-border bg-surface-2 text-module">
              {adminCriticalFunctions.length}+ admin critical functions
            </Badge>
            <CardTitle className="mt-3 text-2xl">
              Admin Intelligence Control Board
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              High-control shortcuts for access, audit, pricing, pharmacy,
              billing, clinical movement, quality, reports, and platform
              ownership.
            </p>
          </div>

          {compact ? (
            <Button asChild className="rounded-md">
              <Link href="/platform/admin-control">Open full control board</Link>
            </Button>
          ) : null}
        </div>

        {!compact ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="rounded-md bg-background/70"
              >
                {category}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="relative">
        <div
          className={cn(
            "grid gap-3",
            compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
          )}
        >
          {shownFunctions.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={`${item.title}-${item.href}`}
                href={item.href}
                className="group rounded-lg border border-border bg-background/72 p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/45 hover:bg-cyan-500/5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-module">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge
                    className={cn(
                      "rounded-md border px-2 py-1 text-[10px] uppercase",
                      urgencyClasses[item.urgency],
                    )}
                  >
                    {item.urgency}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold tracking-tight">{item.title}</p>
                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {item.impact}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                      {item.signal}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      {item.owner}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
