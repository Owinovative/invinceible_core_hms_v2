"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DatabaseZap,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  ScrollText,
  Settings,
  Shield,
  Stethoscope,
  Users,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/shared/app-logo";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";

const navItems = [
  { title: "Platform Home", href: "/platform", icon: LayoutDashboard },
  { title: "Admin Control", href: "/platform/admin-control", icon: LockKeyhole },
  { title: "Facilities", href: "/platform/facilities", icon: Building2 },
  { title: "Branches", href: "/platform/branches", icon: GitBranch },
  { title: "Departments", href: "/platform/departments", icon: Building2 },
  { title: "Master Catalogs", href: "/platform/catalogs", icon: DatabaseZap },
  { title: "Users", href: "/platform/users", icon: Users },
  { title: "Staff", href: "/platform/staff", icon: UserCog },
  { title: "Clinics", href: "/platform/clinics", icon: Stethoscope },
  { title: "Notifications", href: "/platform/notifications", icon: BellRing },
  { title: "Feedback", href: "/platform/feedback", icon: MessageSquareText },
  { title: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard },
  { title: "User Locations", href: "/platform/user-locations", icon: MapPin },
  { title: "Audit Trail", href: "/platform/audit", icon: ScrollText },
  { title: "Settings", href: "/platform/settings", icon: Settings },
];

export function PlatformSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar, closeMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const compact = collapsed && !mobile;

  return (
    <aside
      className={cn(
        "bg-surface-1 border-r border-border flex h-full shrink-0 flex-col border-r border-[#0b5f9e] text-white transition-all duration-300",
        mobile ? "w-full" : "hidden h-full lg:flex",
        !mobile && (compact ? "w-24" : "w-80"),
      )}
    >
      <div className="border-b border-[#113b63] px-4 py-4">
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
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Platform
                </p>
                {!compact ? (
                  <p className="truncate text-sm font-semibold text-white">
                    Control center
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

      <div className="px-3 py-4">
        <div className="rounded-lg border border-[#113b63] bg-[#06192d] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.25)]">
          {compact ? (
            <div className="space-y-3 text-center">
              <div className="rounded-md bg-[#0b3154] p-2 text-xs font-semibold text-white">
                PA
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Platform Access
              </p>

              <div className="flex min-w-0 items-center gap-2 rounded-md bg-[#0b3154] px-3 py-2">
                <Shield className="h-4 w-4 shrink-0 text-white" />
                <span className="min-w-0 truncate text-sm font-semibold text-white" title={user?.roleCode || "SUPER_ADMIN"}>
                  {user?.roleCode || "SUPER_ADMIN"}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Area</p>
                <p className="truncate font-semibold text-white" title="Platform Administration">
                  Platform Administration
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                compact && "justify-center px-2",
                isActive
                  ? "bg-[#0aa35c] text-white ring-1 ring-[#28e486] shadow-[0_0_22px_rgba(10,163,92,0.28)]"
                  : "text-sky-50 hover:bg-[#071d33] hover:text-white",
              )}
              onClick={mobile ? closeMobileSidebar : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!compact && <span className="min-w-0 truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
