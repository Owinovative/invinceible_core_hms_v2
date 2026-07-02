import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  CreditCard,
  DatabaseZap,
  GitBranch,
  KeyRound,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  ScrollText,
  ServerCog,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const platformItems = [
  {
    title: "Facilities",
    href: "/platform/facilities",
    icon: Building2,
    text: "Create and maintain hospital facility records.",
  },
  {
    title: "Branches",
    href: "/platform/branches",
    icon: GitBranch,
    text: "Control branch scope, service points, stock, and patient flow.",
  },
  {
    title: "Master Catalogs",
    href: "/platform/catalogs",
    icon: DatabaseZap,
    text: "Manage drugs, services, lab tests, and CSV imports.",
  },
  {
    title: "Users",
    href: "/platform/users",
    icon: Users,
    text: "Create users, assign roles, and recover locked accounts.",
  },
  {
    title: "Staff",
    href: "/platform/staff",
    icon: UserCog,
    text: "Link staff profiles to facility departments and system users.",
  },
  {
    title: "Clinics",
    href: "/platform/clinics",
    icon: Stethoscope,
    text: "Define service points used by doctors and front desk teams.",
  },
  {
    title: "Notifications",
    href: "/platform/notifications",
    icon: BellRing,
    text: "Send scoped messages to system, facility, or staff users.",
  },
  {
    title: "Feedback",
    href: "/platform/feedback",
    icon: MessageSquareText,
    text: "Read anonymous or named user comments and reply from platform.",
  },
  {
    title: "Subscriptions",
    href: "/platform/subscriptions",
    icon: CreditCard,
    text: "Record monthly facility payments and monitor lock risk.",
  },
  {
    title: "User Locations",
    href: "/platform/user-locations",
    icon: MapPin,
    text: "Review active sessions, network location, device, and route evidence.",
  },
  {
    title: "Audit Trail",
    href: "/platform/audit",
    icon: ScrollText,
    text: "Inspect actor, action, time, network, and module history.",
  },
];

const controlRows = [
  ["Catalog control", "Master drugs, lab services, billing services, CSV download, CSV import, and branch pricing paths."],
  ["Access control", "Users, staff links, role boundaries, locked accounts, and platform-only administration."],
  ["Security evidence", "Audit logs, login records, live sessions, last seen location, browser, device, and IP details."],
  ["Facility structure", "Facilities, branches, departments, clinics, and operational settings kept in one control area."],
];

const signalCards = [
  { title: "Facilities", label: "Structure", icon: Building2 },
  { title: "Roles", label: "Security", icon: KeyRound },
  { title: "Audit", label: "Evidence", icon: ScrollText },
  { title: "Locations", label: "Sessions", icon: MapPin },
];

export default function PlatformHomePage() {
  return (
    <div className="space-y-6">
      <section className="border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
          <div className="space-y-5">
            <Badge className="rounded-md border-0 bg-accent px-3 py-1 text-module">
              Platform control
            </Badge>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-border bg-surface-2 text-module">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight text-foreground md:text-5xl">
                  Platform Administration
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Control the system structure from one bright workspace:
                  facilities, branches, staff, users, clinics, master catalogs,
                  audit evidence, notifications, and location intelligence.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-md bg-primary text-white hover:bg-brand-strong">
                <Link href="/platform/admin-control">
                  Open admin control
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-md border-border-strong bg-card text-module hover:bg-surface-2"
              >
                <Link href="/dashboard">Return to hospital dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {signalCards.map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.title} className="border border-border bg-[#f8fcff] p-5">
                <Icon className="mb-4 h-6 w-6 text-module" />
                <p className="text-2xl font-bold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm font-semibold uppercase text-muted-foreground">
                  {item.label}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platformItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group border border-border bg-card p-5 shadow-sm transition hover:border-border-strong hover:bg-surface-2"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center border border-border bg-surface-2 text-module">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-module transition group-hover:translate-x-1" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {item.text}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-module" />
            <h2 className="text-xl font-semibold text-foreground">
              Admin Discipline
            </h2>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            Platform work stays separate from daily facility work. Super admin
            controls belong here, while hospital staff use the dashboard for
            patient care and operations.
          </p>
        </div>

        <div className="border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="h-5 w-5 text-module" />
            <h2 className="text-xl font-semibold text-foreground">
              What This Area Controls
            </h2>
          </div>
          <div className="overflow-hidden border border-border">
            {controlRows.map(([label, detail]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[190px_1fr]"
              >
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border border-border bg-[#eaf7ff] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <ServerCog className="h-5 w-5 text-module" />
              <h2 className="text-xl font-semibold text-foreground">
                Platform is the system owner area.
              </h2>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              Facility admins can run facility-level settings. Super admins can
              control the whole installation from this platform.
            </p>
          </div>
          <Button asChild className="rounded-md bg-primary text-white hover:bg-brand-strong">
            <Link href="/platform/settings">Open settings</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
