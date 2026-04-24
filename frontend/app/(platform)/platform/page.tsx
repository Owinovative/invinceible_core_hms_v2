import {
  Activity,
  BellRing,
  Braces,
  Building2,
  DatabaseZap,
  GitBranch,
  KeyRound,
  LockKeyhole,
  ScrollText,
  ServerCog,
  Shield,
  Stethoscope,
  TerminalSquare,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const items = [
  {
    title: "Facilities",
    href: "/platform/facilities",
    icon: Building2,
    signal: "facility.registry",
  },
  {
    title: "Branches",
    href: "/platform/branches",
    icon: GitBranch,
    signal: "branch.scope",
  },
  {
    title: "Departments",
    href: "/platform/departments",
    icon: DatabaseZap,
    signal: "dept.map",
  },
  {
    title: "Users",
    href: "/platform/users",
    icon: Users,
    signal: "rbac.users",
  },
  {
    title: "Staff",
    href: "/platform/staff",
    icon: UserCog,
    signal: "staff.link",
  },
  {
    title: "Clinics",
    href: "/platform/clinics",
    icon: Stethoscope,
    signal: "service.points",
  },
  {
    title: "Notifications",
    href: "/platform/notifications",
    icon: BellRing,
    signal: "alert.bus",
  },
  {
    title: "Audit Trail",
    href: "/platform/audit",
    icon: ScrollText,
    signal: "audit.trace",
  },
  {
    title: "Settings",
    href: "/platform/settings",
    icon: ServerCog,
    signal: "runtime.cfg",
  },
];

const checks = [
  "JWT guard online",
  "Scope service enforced",
  "Notification bus scoped",
  "Role gates active",
];

export default function PlatformHomePage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-cyan-400/15 bg-[#050816]/90 p-6 shadow-2xl md:p-8">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(34,211,238,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,.1)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

        <div className="relative grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
          <div className="space-y-6">
            <Badge className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-cyan-100">
              root@invinceible-core:/platform
            </Badge>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-400/10">
                  <TerminalSquare className="h-7 w-7 text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold md:text-5xl">
                    Platform Engineering Console
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                    The restricted control plane for structure, access, service
                    topology, and operational signals.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {checks.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3"
                >
                  <LockKeyhole className="h-4 w-4 text-emerald-300" />
                  <span className="font-mono text-sm text-white/80">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-300/15 bg-black/45 p-4 font-mono text-xs text-cyan-100 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 border-b border-cyan-300/10 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-2 text-muted-foreground">ops-kernel.ts</span>
            </div>
            <pre className="overflow-hidden leading-6 text-cyan-100/80">
              {`const console = await boot({
  owner: "SUPER_ADMIN",
  surface: "platform",
  guard: ["jwt", "rbac", "scope"],
});

await console.verify([
  "facilities",
  "branches",
  "users",
  "staff",
  "clinics",
  "notifications",
]);

emit("system.level", 6);`}
            </pre>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-lg border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-300/[0.045]"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <Braces className="h-4 w-4 text-muted-foreground transition group-hover:text-cyan-300" />
              </div>

              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 font-mono text-xs text-cyan-200/70">
                {item.signal}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-5 flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-300" />
            <h2 className="text-xl font-semibold">Access Discipline</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Only platform owners should enter this console.</p>
            <p>Use it to define structure before clinical teams operate.</p>
            <p>
              Every facility, branch, staff, and user decision flows from here.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-semibold">Next Control Upgrades</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {["Audit review", "Permission matrix", "Deployment health"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-lg border border-cyan-300/10 bg-black/25 px-4 py-3 font-mono text-sm text-cyan-100/80"
                >
                  <KeyRound className="mb-3 h-4 w-4 text-cyan-300" />
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          asChild
          className="rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300"
        >
          <Link href="/dashboard">Return to hospital dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
