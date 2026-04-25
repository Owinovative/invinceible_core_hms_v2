"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Ambulance,
  Baby,
  Banknote,
  BedDouble,
  Bell,
  Bot,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Dumbbell,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Monitor,
  PackageCheck,
  PackageSearch,
  Pill,
  Plus,
  RadioTower,
  Receipt,
  ScanLine,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  Warehouse,
  BriefcaseBusiness,
  Building2,
  Microscope,
  Syringe,
  TabletSmartphone,
  Truck,
} from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useScope } from "@/providers/scope-provider";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";

const navSections = [
  {
    label: "Command",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "AI Assistant", href: "/ai-assistant", icon: Bot },
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Reports", href: "/reports", icon: Activity },
      { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
  {
    label: "Front Desk",
    items: [
      { title: "Patients", href: "/patients", icon: Users },
      { title: "Appointments", href: "/appointments", icon: CalendarPlus },
      { title: "Queue", href: "/queue", icon: Clock3 },
    ],
  },
  {
    label: "Clinical",
    items: [
      { title: "Triage", href: "/triage", icon: HeartPulse },
      { title: "Doctor Queue", href: "/doctor-queue", icon: Stethoscope },
      { title: "OPD Clinics", href: "/opd-clinics", icon: Stethoscope },
      { title: "Lab", href: "/lab", icon: FlaskConical },
      { title: "Admissions", href: "/ipd", icon: BedDouble },
      { title: "Emergency", href: "/emergency", icon: Ambulance },
      { title: "Radiology", href: "/radiology", icon: Monitor },
      { title: "Theatre", href: "/theatre", icon: Syringe },
      { title: "Maternity", href: "/maternity", icon: Baby },
      { title: "ICU/HDU", href: "/icu", icon: BedDouble },
      { title: "Renal/Dialysis", href: "/renal-dialysis", icon: HeartPulse },
      { title: "Oncology", href: "/oncology", icon: ShieldCheck },
      { title: "Dental", href: "/dental", icon: Microscope },
      { title: "Physiotherapy", href: "/physiotherapy", icon: Dumbbell },
      { title: "Nutrition", href: "/nutrition", icon: HeartPulse },
      { title: "Mental Health", href: "/mental-health", icon: HeartPulse },
      { title: "Vaccination", href: "/vaccination", icon: Syringe },
    ],
  },
  {
    label: "Diagnostics",
    items: [
      { title: "Blood Bank", href: "/blood-bank", icon: ScanLine },
      { title: "Telemedicine", href: "/telemedicine", icon: Stethoscope },
    ],
  },
  {
    label: "Revenue",
    items: [
      { title: "Billing", href: "/billing", icon: CreditCard },
      { title: "Invoices", href: "/invoices", icon: Receipt },
      { title: "Tariffs", href: "/billing/tariffs", icon: Banknote },
      {
        title: "Revenue Integrity",
        href: "/revenue-integrity",
        icon: CreditCard,
      },
      { title: "Insurance", href: "/insurance", icon: Banknote },
    ],
  },
  {
    label: "Pharmacy",
    items: [
      { title: "Dispensing", href: "/pharmacy", icon: Pill },
      { title: "Stock", href: "/pharmacy-stock", icon: Warehouse },
      { title: "Pricing", href: "/pharmacy-pricing", icon: Pill },
      { title: "Central Store", href: "/central-store", icon: Warehouse },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Procurement", href: "/procurement", icon: Truck },
      { title: "Medical Records", href: "/medical-records", icon: FileCheck2 },
      { title: "Assets", href: "/assets", icon: PackageSearch },
      { title: "Biomedical", href: "/biomedical", icon: Building2 },
      { title: "CSSD", href: "/cssd", icon: PackageCheck },
      { title: "Kitchen", href: "/kitchen", icon: PackageCheck },
      { title: "Laundry", href: "/laundry", icon: PackageSearch },
      { title: "Ambulance", href: "/ambulance", icon: RadioTower },
      { title: "Mortuary", href: "/mortuary", icon: FileCheck2 },
      { title: "Security Desk", href: "/security-desk", icon: ShieldCheck },
      { title: "HR/Rostering", href: "/hr", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Digital & Quality",
    items: [
      { title: "Patient Portal", href: "/patient-portal", icon: TabletSmartphone },
      {
        title: "Infection Control",
        href: "/infection-control",
        icon: ShieldCheck,
      },
      { title: "Compliance", href: "/compliance", icon: ShieldCheck },
      { title: "Quality Assurance", href: "/quality-assurance", icon: ShieldCheck },
    ],
  },
];

const quickActions = [
  { title: "Patient", href: "/patients/new", icon: UserPlus },
  { title: "Appointment", href: "/appointments/new", icon: CalendarPlus },
  { title: "Invoice", href: "/billing/invoices", icon: Plus },
];

export function DashboardSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar, closeMobileSidebar } = useSidebar();
  const { facilityName, selectedBranchName } = useScope();
  const { user } = useAuth();
  const compact = collapsed && !mobile;
  const canManageSettings = ["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(
    user?.roleCode ?? "",
  );

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-border/70 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70",
        mobile ? "w-full" : "hidden h-screen lg:flex",
        !mobile && (compact ? "w-24" : "w-72"),
      )}
    >
      <div className="shrink-0 border-b border-white/10 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="overflow-hidden">
            {compact ? <AppLogo iconOnly /> : <AppLogo />}
          </div>

          {!mobile ? (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-2xl border-white/10 bg-white/[0.03]"
              onClick={toggleSidebar}
            >
              {compact ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-3 py-4">
        <div className="premium-card rounded-[1.2rem] p-3">
          {compact ? (
            <div className="space-y-2 text-center text-xs font-semibold text-muted-foreground">
              <div className="rounded-xl bg-cyan-500/10 px-2 py-2 text-cyan-300">
                F
              </div>
              <div className="rounded-xl bg-emerald-500/10 px-2 py-2 text-emerald-300">
                B
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Facility
                </p>
                <p className="truncate text-sm font-semibold">
                  {facilityName || "No facility"}
                </p>
              </div>
              <Separator className="bg-white/10" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Branch
                </p>
                <p className="truncate text-sm font-semibold">
                  {selectedBranchName || "No branch"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-4">
        <div
          className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-3")}
        >
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.title}
                onClick={mobile ? closeMobileSidebar : undefined}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cyan-500/10",
                  compact && "px-2",
                )}
              >
                <Icon className="h-4 w-4 text-cyan-300" />
                {!compact ? <span>{item.title}</span> : null}
              </Link>
            );
          })}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <div className="space-y-5">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-2">
              {!compact ? (
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {section.label}
                </p>
              ) : null}

              <div className="space-y-1">
                {section.items
                  .filter((item) => !item.adminOnly || canManageSettings)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-label={item.title}
                        onClick={mobile ? closeMobileSidebar : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          compact && "justify-center px-2",
                          isActive
                            ? "bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-400/25 dark:text-cyan-100"
                            : "text-muted-foreground hover:bg-cyan-500/10 hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            !isActive && "group-hover:scale-110",
                          )}
                        />
                        {!compact ? <span>{item.title}</span> : null}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
