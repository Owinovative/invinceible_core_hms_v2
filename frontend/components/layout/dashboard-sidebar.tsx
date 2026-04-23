"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BedDouble,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Receipt,
  Settings,
  Stethoscope,
  Users,
  Warehouse,
  Activity,
  UserPlus,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { AppLogo } from "@/components/shared/app-logo";
import { useScope } from "@/providers/scope-provider";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", href: "/patients", icon: Users },
  { title: "New Patient", href: "/patients/new", icon: UserPlus },
  { title: "Triage", href: "/triage", icon: HeartPulse },
  { title: "Doctor Queue", href: "/doctor-queue", icon: Stethoscope },
  { title: "Appointments", href: "/appointments", icon: Stethoscope },
  { title: "New Appointment", href: "/appointments/new", icon: CalendarPlus },
  { title: "Queue", href: "/queue", icon: Clock3 },
  { title: "Lab", href: "/lab", icon: FlaskConical },
  { title: "Pharmacy", href: "/pharmacy", icon: Pill },
  { title: "Pharmacy Stock", href: "/pharmacy-stock", icon: Warehouse },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Create Invoice", href: "/billing/invoices", icon: CreditCard },
  { title: "Invoices", href: "/invoices", icon: Receipt },
  { title: "Admissions", href: "/ipd", icon: BedDouble },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Reports", href: "/reports", icon: Activity },
  { title: "Settings", href: "/settings", icon: Settings },

];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleSidebar } = useSidebar();
  const { facilityName, selectedBranchName } = useScope();

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 glass-panel transition-all duration-300",
        collapsed ? "w-24" : "w-72",
      )}
    >
      <div className="shrink-0 border-b border-white/10 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="overflow-hidden">
            {collapsed ? <AppLogo iconOnly /> : <AppLogo />}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-2xl border-white/10 bg-white/[0.03]"
            onClick={toggleSidebar}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="shrink-0 px-3 py-4">
        <div className="gradient-border panel-shadow rounded-[1.6rem] p-4">
          {collapsed ? (
            <div className="space-y-3 text-center">
              <div className="rounded-2xl bg-blue-500/10 p-2 text-xs font-semibold text-blue-400">
                F
              </div>
              <div className="rounded-2xl bg-cyan-500/10 p-2 text-xs font-semibold text-cyan-400">
                B
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Current Scope
              </p>

              <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-xs text-muted-foreground">Facility</p>
                <p className="truncate font-semibold text-foreground">
                  {facilityName || "No facility"}
                </p>
              </div>

              <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-xs text-muted-foreground">Branch</p>
                <p className="truncate font-semibold text-foreground">
                  {selectedBranchName || "No branch"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 text-white shadow-[0_10px_30px_rgba(14,165,233,0.28)]"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110",
                )}
              />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
