import Link from "next/link";
import {
  Ambulance,
  Baby,
  BadgeDollarSign,
  BedDouble,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  Dumbbell,
  FlaskConical,
  HeartPulse,
  Hospital,
  Landmark,
  Microscope,
  Monitor,
  PackageSearch,
  Pill,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  Syringe,
  TabletSmartphone,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const modules = [
  {
    title: "Patient Registry",
    href: "/patients",
    status: "Active",
    icon: Users,
    tone: "cyan",
  },
  {
    title: "Appointments",
    href: "/appointments",
    status: "Active",
    icon: CalendarClock,
    tone: "emerald",
  },
  {
    title: "Queue Control",
    href: "/queue",
    status: "Active",
    icon: ClipboardCheck,
    tone: "amber",
  },
  {
    title: "Triage",
    href: "/triage",
    status: "Active",
    icon: HeartPulse,
    tone: "rose",
  },
  {
    title: "Doctor Workbench",
    href: "/doctor-queue",
    status: "Active",
    icon: Stethoscope,
    tone: "cyan",
  },
  {
    title: "Laboratory",
    href: "/lab",
    status: "Active",
    icon: FlaskConical,
    tone: "emerald",
  },
  {
    title: "Admissions and IPD",
    href: "/ipd",
    status: "Active",
    icon: BedDouble,
    tone: "violet",
  },
  {
    title: "Billing Desk",
    href: "/billing",
    status: "Active",
    icon: BadgeDollarSign,
    tone: "amber",
  },
  {
    title: "Invoices",
    href: "/invoices",
    status: "Active",
    icon: ReceiptText,
    tone: "cyan",
  },
  {
    title: "Pharmacy Dispensing",
    href: "/pharmacy",
    status: "Active",
    icon: Pill,
    tone: "emerald",
  },
  {
    title: "Pharmacy Stock",
    href: "/pharmacy-stock",
    status: "Active",
    icon: Warehouse,
    tone: "amber",
  },
  {
    title: "Reports",
    href: "/reports",
    status: "Active",
    icon: ScrollText,
    tone: "violet",
  },
  {
    title: "Emergency Unit",
    status: "Blueprint",
    icon: Ambulance,
    tone: "rose",
  },
  { title: "Radiology", status: "Blueprint", icon: Monitor, tone: "cyan" },
  {
    title: "Theatre and Surgery",
    status: "Blueprint",
    icon: Syringe,
    tone: "emerald",
  },
  { title: "Maternity", status: "Blueprint", icon: Baby, tone: "rose" },
  {
    title: "Dental Clinic",
    status: "Blueprint",
    icon: Microscope,
    tone: "cyan",
  },
  {
    title: "Physiotherapy",
    status: "Blueprint",
    icon: Dumbbell,
    tone: "emerald",
  },
  { title: "Nutrition", status: "Blueprint", icon: Hospital, tone: "amber" },
  {
    title: "Insurance Claims",
    status: "Blueprint",
    icon: Landmark,
    tone: "violet",
  },
  { title: "Procurement", status: "Blueprint", icon: Truck, tone: "cyan" },
  {
    title: "Assets and Maintenance",
    status: "Blueprint",
    icon: PackageSearch,
    tone: "amber",
  },
  {
    title: "HR and Rostering",
    status: "Blueprint",
    icon: BriefcaseBusiness,
    tone: "emerald",
  },
  {
    title: "Patient Portal",
    status: "Blueprint",
    icon: TabletSmartphone,
    tone: "violet",
  },
  {
    title: "Compliance and Audit",
    status: "Blueprint",
    icon: ShieldCheck,
    tone: "rose",
  },
];

const toneClasses: Record<string, string> = {
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
};

export default function ModulesPage() {
  const activeModules = modules.filter((module) => module.status === "Active");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.6rem] border gradient-border p-6 panel-shadow md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(14,165,233,.12),transparent_45%,rgba(16,185,129,.1))]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-4 rounded-full border-0 bg-cyan-500/10 px-3 py-1 text-cyan-700 dark:text-cyan-200">
              National facility module map
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Level 6 Hospital Command Modules
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A premium operating map for the current HMS, with active areas
              ready to use and national-scale departments queued as blueprints.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-2xl font-bold">{modules.length}</p>
              <p className="text-xs text-muted-foreground">total modules</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-2xl font-bold">{activeModules.length}</p>
              <p className="text-xs text-muted-foreground">active now</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-2xl font-bold">
                {modules.length - activeModules.length}
              </p>
              <p className="text-xs text-muted-foreground">blueprints</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const content = (
            <div className="group h-full rounded-[1.25rem] border border-border bg-card/86 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-xl">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    toneClasses[module.tone]
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <Badge
                  className={`rounded-full border-0 ${
                    module.status === "Active"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {module.status}
                </Badge>
              </div>
              <h2 className="text-base font-semibold">{module.title}</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {module.status === "Active"
                  ? "Connected to the live workflow."
                  : "Mapped for the next implementation wave."}
              </p>
            </div>
          );

          return module.href ? (
            <Link key={module.title} href={module.href}>
              {content}
            </Link>
          ) : (
            <div key={module.title}>{content}</div>
          );
        })}
      </section>
    </div>
  );
}
