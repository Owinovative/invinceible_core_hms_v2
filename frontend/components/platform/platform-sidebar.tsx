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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppLogo } from "@/components/shared/app-logo";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";

const navItems = [
  { title: "Platform Home",  href: "/platform",                  icon: LayoutDashboard },
  { title: "Admin Control",  href: "/platform/admin-control",    icon: LockKeyhole },
  { title: "Facilities",     href: "/platform/facilities",       icon: Building2 },
  { title: "Branches",       href: "/platform/branches",         icon: GitBranch },
  { title: "Departments",    href: "/platform/departments",      icon: Building2 },
  { title: "Master Catalogs",href: "/platform/catalogs",         icon: DatabaseZap },
  { title: "Users",          href: "/platform/users",            icon: Users },
  { title: "Staff",          href: "/platform/staff",            icon: UserCog },
  { title: "Clinics",        href: "/platform/clinics",          icon: Stethoscope },
  { title: "Notifications",  href: "/platform/notifications",    icon: BellRing },
  { title: "Feedback",       href: "/platform/feedback",         icon: MessageSquareText },
  { title: "Subscriptions",  href: "/platform/subscriptions",    icon: CreditCard },
  { title: "User Locations", href: "/platform/user-locations",   icon: MapPin },
  { title: "Audit Trail",    href: "/platform/audit",            icon: ScrollText },
  { title: "Settings",       href: "/platform/settings",         icon: Settings },
];

export function PlatformSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar, closeMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const compact = collapsed && !mobile;

  return (
    <aside
      aria-label="Platform navigation"
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-[#061525] text-white",
        "transition-[width] duration-300 ease-out",
        mobile ? "w-full" : "hidden h-full lg:flex",
        !mobile && (compact ? "w-[var(--sidebar-width-rail)]" : "w-[var(--sidebar-width)]"),
      )}
      style={{ zIndex: "var(--z-sidebar)" }}
    >
      {/* Brand header */}
      <div
        className={cn(
          "flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-white/10 px-4",
          compact && "justify-center px-2",
        )}
      >
        <div className={cn("min-w-0 flex-1 overflow-hidden", compact && "flex-none")}>
          {mobile ? (
            compact ? <AppLogo iconOnly light /> : <AppLogo light />
          ) : (
            <div className="min-w-0">
              {!compact && (
                <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/50">
                  Platform
                </p>
              )}
              {!compact && (
                <p className="truncate text-sm font-semibold text-white">
                  Control Centre
                </p>
              )}
            </div>
          )}
        </div>

        {!mobile ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto shrink-0 text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-ring"
            onClick={toggleSidebar}
          >
            {compact ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        ) : null}
      </div>

      {/* User context card */}
      {!compact && (
        <div className="shrink-0 px-3 pt-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/40">
              Platform Access
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Shield className="size-3.5 shrink-0 text-white/70" aria-hidden />
              <span
                className="min-w-0 truncate text-xs font-semibold text-white"
                title={user?.roleCode || "SUPER_ADMIN"}
              >
                {user?.roleCode || "SUPER_ADMIN"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/platform" && pathname.startsWith(`${item.href}/`));

          const link = (
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={mobile ? closeMobileSidebar : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                compact && "justify-center px-0 py-2.5",
                isActive
                  ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                  : "text-white/65 hover:bg-white/8 hover:text-white",
              )}
            >
              {isActive && !compact && (
                <span
                  aria-hidden
                  className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-white/90"
                />
              )}
              <Icon
                className={cn(
                  "size-[1.05rem] shrink-0",
                  isActive ? "opacity-100" : "opacity-60 group-hover:opacity-90",
                )}
                aria-hidden
              />
              {!compact ? (
                <span className="min-w-0 truncate">{item.title}</span>
              ) : (
                <span className="sr-only">{item.title}</span>
              )}
            </Link>
          );

          return (
            <div key={item.href}>
              {compact ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
