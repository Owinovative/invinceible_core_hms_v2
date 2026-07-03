"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { quickActions, visibleNavSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { useSidebar } from "@/providers/sidebar-provider";

/**
 * Meridian sidebar: layered light/dark surface, module-accented groups,
 * collapsible icon rail with tooltips, and full keyboard operability.
 */
export function DashboardSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar, closeMobileSidebar } = useSidebar();
  const { facilityName, selectedBranchName } = useScope();
  const { user } = useAuth();

  const compact = collapsed && !mobile;
  const sections = visibleNavSections(user?.roleCode ?? "");

  return (
    <aside
      aria-label="Primary navigation"
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-1 transition-[width] duration-300",
        mobile ? "w-full" : "hidden lg:flex",
        !mobile &&
          (compact
            ? "w-(--sidebar-width-rail)"
            : "w-(--sidebar-width)"),
      )}
      style={{ zIndex: "var(--z-sidebar)" }}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-(--header-height) shrink-0 items-center gap-2.5 border-b border-border px-4",
          compact && "justify-center px-2",
        )}
      >
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
          onClick={mobile ? closeMobileSidebar : undefined}
        >
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-120 from-brand to-pulse text-primary-foreground shadow-sm"
          >
            <Activity className="size-5" />
          </span>
          {!compact ? (
            <span className="min-w-0">
              <span className="block truncate text-[0.95rem] leading-tight font-bold tracking-tight text-foreground">
                Invinceible <span className="text-gradient-brand">Core</span>
              </span>
              <span className="block text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase">
                Hospital OS
              </span>
            </span>
          ) : null}
        </Link>
        {!mobile && !compact ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse sidebar"
            className="ml-auto text-muted-foreground"
            onClick={toggleSidebar}
          >
            <PanelLeftClose />
          </Button>
        ) : null}
      </div>

      {/* Scope context */}
      {!compact ? (
        <div className="shrink-0 px-3 pt-3">
          <div className="rounded-xl border border-border bg-surface-2/70 px-3 py-2.5">
            <p className="truncate text-xs font-semibold text-foreground" title={facilityName || "No facility"}>
              {facilityName || "No facility"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.7rem] text-muted-foreground" title={selectedBranchName || "All branches"}>
              <span className="pulse-dot" aria-hidden />
              {selectedBranchName || "All branches"}
            </p>
          </div>
        </div>
      ) : null}

      {/* Quick actions */}
      {!compact ? (
        <div className="grid shrink-0 grid-cols-3 gap-1.5 px-3 pt-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={mobile ? closeMobileSidebar : undefined}
                className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface-2/50 px-1 py-2 text-[0.65rem] font-medium text-muted-foreground transition-colors hover:border-module/40 hover:bg-module-soft hover:text-module focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon className="size-3.5" aria-hidden />
                <span className="truncate">{action.title.replace("New ", "")}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div
            key={section.label}
            data-module={section.module}
            className="mb-4 last:mb-0"
          >
            {!compact ? (
              <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground/80 uppercase">
                {section.label}
              </p>
            ) : (
              <div className="mx-3 mb-2 border-t border-border first:hidden" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const link = (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={mobile ? closeMobileSidebar : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                      compact && "justify-center px-0 py-2.5",
                      active
                        ? "bg-surface-2 shadow-xs border border-border/50 font-semibold text-module"
                        : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent",
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-module"
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        "size-[1.1rem] shrink-0",
                        active
                          ? "text-module"
                          : "opacity-70 group-hover:opacity-100",
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
                  <li key={item.href}>
                    {compact ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rail expand control */}
      {!mobile && compact ? (
        <div className="shrink-0 border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Expand sidebar"
            className="w-full text-muted-foreground"
            onClick={toggleSidebar}
          >
            <PanelLeftOpen />
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
