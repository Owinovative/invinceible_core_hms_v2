"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Ambulance, Baby, Banknote, BedDouble, Bell, Bot, CalendarPlus,
  ChevronLeft, ChevronRight, Clock3, CreditCard, Dumbbell, FileCheck2,
  FlaskConical, HeartPulse, LayoutDashboard, Monitor, MessageSquareText,
  PackageCheck, PackageSearch, Pill, Plus, RadioTower, Receipt, ScanLine,
  Settings, ShieldCheck, Stethoscope, UserPlus, Users, Warehouse,
  BriefcaseBusiness, Building2, Microscope, Syringe, TabletSmartphone, Truck,
  ShoppingCart, Sparkles, type LucideIcon,
} from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScope } from "@/providers/scope-provider";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  allowedRoles?: string[];
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// --- REORGANIZED HUB ARCHITECTURE ---
const navSections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Command Center", href: "/dashboard", icon: LayoutDashboard },
      { title: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
      { title: "Patients", href: "/patients", icon: Users },
      { title: "Appointments", href: "/appointments", icon: CalendarPlus },
      { title: "Active Queue", href: "/queue", icon: Clock3 },
    ],
  },
  {
    label: "Medical Care",
    items: [
      { title: "Consultations", href: "/consultation", icon: Stethoscope },
      { title: "Triage & Vitals", href: "/triage", icon: HeartPulse },
      { title: "OPD Clinics", href: "/opd-clinics", icon: UserPlus },
      { title: "Admissions (IPD)", href: "/ipd", icon: BedDouble },
      { title: "Emergency", href: "/emergency", icon: Ambulance },
      { title: "Theatre", href: "/theatre", icon: Syringe },
      { title: "Maternity", href: "/maternity", icon: Baby },
    ],
  },
  {
    label: "Diagnostics",
    items: [
      { title: "Laboratory", href: "/lab", icon: FlaskConical },
      { title: "Radiology", href: "/radiology", icon: Monitor },
      { title: "Blood Bank", href: "/blood-bank", icon: ScanLine },
    ],
  },
  {
    label: "Pharmacy & Inventory",
    items: [
      { title: "Dispensing", href: "/pharmacy", icon: Pill },
      { title: "OTC Sales", href: "/pharmacy/otc-sales", icon: ShoppingCart },
      { title: "Branch Stock", href: "/pharmacy-stock", icon: Warehouse },
      { title: "Procurement", href: "/procurement", icon: Truck },
    ],
  },
  {
    label: "Revenue Cycle",
    items: [
      { title: "Billing & Cashier", href: "/billing", icon: CreditCard },
      { title: "Invoices", href: "/invoices", icon: Receipt },
      { title: "Insurance & Claims", href: "/insurance", icon: ShieldCheck },
    ],
  },
  {
    label: "Specialties",
    items: [
      { title: "Dental", href: "/dental", icon: Microscope },
      { title: "Physiotherapy", href: "/physiotherapy", icon: Dumbbell },
      { title: "Oncology", href: "/oncology", icon: Activity },
      { title: "Renal/Dialysis", href: "/renal-dialysis", icon: HeartPulse },
      { title: "Mental Health", href: "/mental-health", icon: HeartPulse },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Medical Records", href: "/medical-records", icon: FileCheck2 },
      { title: "Analytics & Reports", href: "/reports", icon: Activity },
      { title: "Human Resources", href: "/hr", icon: BriefcaseBusiness },
      { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
      { title: "Platform Control", href: "/platform", icon: ShieldCheck, superAdminOnly: true },
    ],
  },
];

const quickActions = [
  { title: "Patient", href: "/patients/new", icon: UserPlus },
  { title: "Appt", href: "/appointments/new", icon: CalendarPlus },
  { title: "Invoice", href: "/billing/invoices", icon: Plus },
];

export function DashboardSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar, closeMobileSidebar } = useSidebar();
  const { facilityName, selectedBranchName } = useScope();
  const { user } = useAuth();
  
  const compact = collapsed && !mobile;
  const roleCode = user?.roleCode ?? "";
  const canManageSettings = ["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(roleCode);
  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  return (
    <aside
      className={cn(
        "clinical-sidebar-bg flex h-full shrink-0 flex-col overflow-hidden text-white transition-all duration-300",
        mobile ? "w-full" : "hidden h-full lg:flex rounded-[2rem] panel-shadow border border-white/10",
        !mobile && (compact ? "w-[88px]" : "w-[300px]"),
      )}
    >
      {/* BRANDING HEADER */}
      <div className="shrink-0 px-6 py-6 flex items-center justify-between">
        <div className="min-w-0 overflow-hidden">
          {mobile ? (
            <AppLogo light />
          ) : (
            <div className="min-w-0 flex items-center gap-3">
              {compact ? (
                <AppLogo iconOnly light />
              ) : (
                <>
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-black tracking-tight text-white">Invinceible</span>
                </>
              )}
            </div>
          )}
        </div>

        {!mobile && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-8 w-8 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/20 backdrop-blur-sm"
            onClick={toggleSidebar}
          >
            {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* CONTEXT SWITCHER (FACILITY/BRANCH) */}
      <div className="shrink-0 px-4 pb-4">
        <div className="rounded-[1.2rem] border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
          {compact ? (
            <div className="space-y-2 text-center text-xs font-black text-white">
              <div className="rounded-lg bg-white/10 h-8 w-8 mx-auto flex items-center justify-center text-cyan-200">F</div>
              <div className="rounded-lg bg-white/10 h-8 w-8 mx-auto flex items-center justify-center text-cyan-200">B</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-200/50 font-bold mb-1">Active Facility</p>
                <p className="truncate text-sm font-bold text-slate-100" title={facilityName || "No facility"}>
                  {facilityName || "No facility"}
                </p>
              </div>
              <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent" />
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-200/50 font-bold mb-1">Active Branch</p>
                <p className="truncate text-sm font-bold text-white" title={selectedBranchName || "No branch"}>
                  {selectedBranchName || "No branch"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="shrink-0 px-4 pb-6">
        <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-3")}>
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={mobile ? closeMobileSidebar : undefined}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-bold text-cyan-50 transition-all hover:bg-cyan-500/20 hover:text-white hover:border-cyan-500/30",
                  compact && "py-3",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                {!compact && <span className="min-w-0 truncate">{item.title}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* MAIN NAVIGATION SCROLL AREA */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-8 custom-scrollbar">
        <div className="space-y-8">
          {navSections.map((section) => {
            // Pre-filter items based on roles to check if section should render at all
            const visibleItems = section.items
              .filter((item) => !item.adminOnly || canManageSettings)
              .filter((item) => !item.superAdminOnly || isSuperAdmin)
              .filter((item) => !item.allowedRoles || item.allowedRoles.includes(roleCode));

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label} className="space-y-1">
                {!compact && (
                  <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/40">
                    {section.label}
                  </p>
                )}

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={mobile ? closeMobileSidebar : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
                          compact && "justify-center px-2 py-3",
                          isActive
                            ? "text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {/* Active State Background & Border Accent */}
                        {isActive && (
                          <>
                            <div className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-transparent opacity-100" />
                          </>
                        )}
                        
                        <Icon 
                          className={cn(
                            "relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200", 
                            isActive ? "text-cyan-300" : "opacity-60 group-hover:opacity-100 group-hover:scale-110"
                          )} 
                        />
                        {!compact && (
                          <span className={cn("relative z-10 min-w-0 truncate", isActive && "font-bold")}>
                            {item.title}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
