"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  Building2,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  GitBranch,
  LayoutDashboard,
  MapPin,
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
  { title: "Facilities", href: "/platform/facilities", icon: Building2 },
  { title: "Branches", href: "/platform/branches", icon: GitBranch },
  { title: "Departments", href: "/platform/departments", icon: Building2 },
  { title: "Master Catalogs", href: "/platform/catalogs", icon: DatabaseZap },
  { title: "Users", href: "/platform/users", icon: Users },
  { title: "Staff", href: "/platform/staff", icon: UserCog },
  { title: "Clinics", href: "/platform/clinics", icon: Stethoscope },
  { title: "Notifications", href: "/platform/notifications", icon: BellRing },
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
        "flex h-full shrink-0 flex-col border-r border-white/10 bg-background/80 backdrop-blur-2xl transition-all duration-300",
        mobile ? "w-full" : "hidden h-screen lg:flex",
        !mobile && (compact ? "w-24" : "w-72"),
      )}
    >
      <div className="border-b px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="overflow-hidden">
            {compact ? <AppLogo iconOnly /> : <AppLogo />}
          </div>

          {!mobile ? (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl border-white/10 bg-white/[0.03]"
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
        <div className="premium-card rounded-[1.2rem] p-4">
          {compact ? (
            <div className="space-y-3 text-center">
              <div className="rounded-lg bg-cyan-500/10 p-2 text-xs font-semibold text-cyan-300">
                PA
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Platform Access
              </p>

              <div className="flex items-center gap-2 rounded-2xl bg-cyan-500/10 px-3 py-2">
                <Shield className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-semibold text-cyan-200">
                  {user?.roleCode || "SUPER_ADMIN"}
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="truncate font-semibold text-foreground">
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
                  ? "bg-cyan-400/10 text-cyan-700 ring-1 ring-cyan-300/25 dark:text-cyan-100"
                  : "text-muted-foreground hover:bg-cyan-500/10 hover:text-foreground",
              )}
              onClick={mobile ? closeMobileSidebar : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!compact && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
