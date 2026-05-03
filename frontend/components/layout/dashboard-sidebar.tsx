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
  MessageSquareText,
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
      { title: "Platform Control", href: "/platform", icon: ShieldCheck, superAdminOnly: true },
      { title: "AI Assistant", href: "/ai-assistant", icon: Bot },
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Feedback", href: "/feedback", icon: MessageSquareText },
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
    label: "Doctor Workbench",
    items: [
      { title: "Doctor Queue", href: "/doctor-queue", icon: Stethoscope },
      { title: "Consultations", href: "/consultation", icon: Stethoscope },
      { title: "Medical Reports", href: "/medical-records", icon: FileCheck2 },
      { title: "AI Clinical Notes", href: "/ai-assistant", icon: Bot },
    ],
  },
  {
    label: "Clinical",
    items: [
      { title: "Triage", href: "/triage", icon: HeartPulse },
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
      { title: "SHA Claims", href: "/sha-claims", icon: FileCheck2 },
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
      { title: "Medical Records", href: "/medical-records", icon: FileCheck2 },
      { title: "Procurement", href: "/procurement", icon: Truck },
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
      {
        title: "Patient Portal",
        href: "/patient-portal",
        icon: TabletSmartphone,
      },
      {
        title: "Infection Control",
        href: "/infection-control",
        icon: ShieldCheck,
      },
      { title: "Compliance", href: "/compliance", icon: ShieldCheck },
      {
        title: "Quality Assurance",
        href: "/quality-assurance",
        icon: ShieldCheck,
      },
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
  const isSuperAdmin = user?.roleCode === "SUPER_ADMIN";

  return (
    <aside
      className={cn(
        "clinical-sidebar-bg flex h-full shrink-0 flex-col overflow-hidden border-r border-[#0b5f9e] text-white transition-all duration-300",
        mobile ? "w-full" : "hidden h-full lg:flex",
        !mobile && (compact ? "w-24" : "w-80"),
      )}
    >
      <div className="shrink-0 border-b border-[#113b63] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 overflow-hidden">
            {mobile ? (
              compact ? (
                <AppLogo iconOnly light />
              ) : (
                <AppLogo light />
              )
            ) : (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
                  Menu
                </p>
                {!compact ? (
                  <p className="truncate text-sm font-semibold text-white">
                    Hospital controls
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {!mobile ? (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-md border-[#2c6fa4] bg-[#071d33] text-white hover:bg-[#0b3154]"
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
        <div className="rounded-lg border border-[#113b63] bg-[#06192d] p-3 shadow-[0_14px_35px_rgba(0,0,0,0.25)]">
          {compact ? (
            <div className="space-y-2 text-center text-xs font-semibold text-white">
              <div className="rounded-md bg-[#0b3154] px-2 py-2 text-white">
                F
              </div>
              <div className="rounded-md bg-[#0b3154] px-2 py-2 text-white">
                B
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
                  Facility
                </p>
                <p className="truncate text-sm font-semibold text-white" title={facilityName || "No facility"}>
                  {facilityName || "No facility"}
                </p>
              </div>
              <Separator className="bg-[#113b63]" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
                  Branch
                </p>
                <p className="truncate text-sm font-semibold text-white" title={selectedBranchName || "No branch"}>
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
                  "flex items-center justify-center gap-2 rounded-md border border-[#164d7d] bg-[#071d33] px-3 py-2 text-xs font-semibold text-white transition hover:border-sky-400 hover:bg-[#0b3154]",
                  compact && "px-2",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-white" />
                {!compact ? <span className="min-w-0 truncate">{item.title}</span> : null}
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
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                  {section.label}
                </p>
              ) : null}

              <div className="space-y-1">
                {section.items
                  .filter((item) => !item.adminOnly || canManageSettings)
                  .filter((item) => !item.superAdminOnly || isSuperAdmin)
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
                          "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          compact && "justify-center px-2",
                          isActive
                            ? "bg-[#0aa35c] text-white ring-1 ring-[#28e486] shadow-[0_0_22px_rgba(10,163,92,0.28)]"
                            : "text-sky-50 hover:bg-[#071d33] hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            !isActive && "group-hover:scale-110",
                          )}
                        />
                        {!compact ? <span className="min-w-0 truncate">{item.title}</span> : null}
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
