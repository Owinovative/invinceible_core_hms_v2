import {
  Activity,
  BellRing,
  Bot,
  Braces,
  Building2,
  Code2,
  DatabaseZap,
  GitBranch,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  ScrollText,
  ServerCog,
  Shield,
  ShieldCheck,
  Stethoscope,
  TerminalSquare,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";

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
  "Audit trail inspectable",
  "Facility topology controlled",
];

const upgrades = [
  { title: "Audit review", icon: ScrollText },
  { title: "Permission matrix", icon: KeyRound },
  { title: "Deployment health", icon: Activity },
  { title: "AI clinical assistant", icon: Bot },
];

export default function PlatformHomePage() {
  return (
    <div className="space-y-6">
      <section className="premium-card motion-sheen relative overflow-hidden rounded-[1.8rem] p-6 md:p-8">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-18"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=2200&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,6,23,0.96),rgba(8,47,73,0.62),rgba(6,78,59,0.42))]" />
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(34,211,238,.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,.1)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative grid gap-8 text-white xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="space-y-6">
            <Badge className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-cyan-100">
              root@invinceible-core:/platform
            </Badge>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 ring-1 ring-cyan-300/20">
                <TerminalSquare className="h-7 w-7 text-cyan-200" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight md:text-5xl">
                  Platform Engineering Console
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
                  A restricted control plane for structure, access, facility
                  topology, service points, notifications, audit visibility, and
                  operational discipline.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {checks.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[1.05rem] border border-white/12 bg-white/[0.07] px-4 py-3 backdrop-blur-xl"
                >
                  <LockKeyhole className="h-4 w-4 text-emerald-300" />
                  <span className="font-mono text-xs text-white/82">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-cyan-300/15 bg-black/52 p-4 font-mono text-xs text-cyan-100 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 border-b border-cyan-300/10 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-2 text-white/45">ops-kernel.ts</span>
            </div>
            <pre className="overflow-hidden leading-6 text-cyan-100/82">
              {`const console = await boot({
  owner: "PLATFORM_ENGINEERING",
  surface: "hospital.control-plane",
  guard: ["jwt", "rbac", "scope", "audit"],
});

await console.verify([
  "facilities",
  "branches",
  "users",
  "staff",
  "clinics",
  "notifications",
  "reports",
]);

emit("system.level", 6);`}
            </pre>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="premium-card group rounded-[1.35rem] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/35"
            >
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Braces className="h-4 w-4 text-muted-foreground transition group-hover:text-cyan-400" />
                </div>

                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 font-mono text-xs text-cyan-700/70 dark:text-cyan-200/70">
                  {item.signal}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="premium-card rounded-[1.5rem] p-5">
          <div className="relative">
            <div className="mb-5 flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-semibold">Access Discipline</h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Only platform owners should operate this console.</p>
              <p>Define facility structure before clinical teams work.</p>
              <p>
                Every facility, branch, staff, and user decision should be
                traceable from this area.
              </p>
            </div>
          </div>
        </div>

        <div className="premium-card rounded-[1.5rem] p-5">
          <div className="relative">
            <div className="mb-5 flex items-center gap-3">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold">Next Control Upgrades</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {upgrades.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[1.1rem] border border-cyan-300/10 bg-black/[0.08] px-4 py-3 font-mono text-sm dark:bg-black/25"
                  >
                    <Icon className="mb-3 h-4 w-4 text-cyan-400" />
                    {item.title}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="premium-card rounded-[1.5rem] p-5">
        <div className="relative grid gap-5 xl:grid-cols-[0.75fr_1.25fr] xl:items-center">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Code2 className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold">Engineering Support</h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Built by Eng. Otieno Owino and Eng. Moikoyo Paul, full-stack
              engineers with more than 7 years of production software
              experience.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {creatorContacts.map((creator) => (
              <a
                key={creator.name}
                href={getWhatsappLink(creator.whatsappNumber, creator.message)}
                target="_blank"
                rel="noreferrer"
                className="group rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{creator.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {creator.role}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-500">
                      <PhoneCall className="h-4 w-4" />
                      {creator.phone}
                    </div>
                  </div>
                  <MessageCircle className="h-5 w-5 text-emerald-400 transition group-hover:scale-110" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          asChild
          className="motion-sheen rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300"
        >
          <Link href="/dashboard">
            Return to hospital dashboard
            <ShieldCheck className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
