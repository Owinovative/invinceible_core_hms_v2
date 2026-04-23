"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  Building2,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
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
  { title: "Users", href: "/platform/users", icon: Users },
  { title: "Staff", href: "/platform/staff", icon: UserCog },
  { title: "Clinics", href: "/platform/clinics", icon: Stethoscope },
  { title: "Notifications", href: "/platform/notifications", icon: BellRing },
  { title: "Settings", href: "/platform/settings", icon: Settings },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleSidebar } = useSidebar();
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen shrink-0 flex-col border-r glass-panel transition-all duration-300",
        collapsed ? "w-24" : "w-72",
      )}
    >
      <div className="border-b px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="overflow-hidden">
            {collapsed ? <AppLogo iconOnly /> : <AppLogo />}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl"
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

      <div className="px-3 py-4">
        <div className="gradient-border panel-shadow rounded-[1.4rem] p-4">
          {collapsed ? (
            <div className="space-y-3 text-center">
              <div className="rounded-2xl bg-violet-500/10 p-2 text-xs font-semibold text-violet-300">
                PA
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Platform Access
              </p>

              <div className="flex items-center gap-2 rounded-2xl bg-violet-500/10 px-3 py-2">
                <Shield className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-violet-300">
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
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
