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
 * Meridian primary sidebar.
 * — Smooth 300 ms width transition, no layout jump.
 * — Labels animate out with opacity (no reflow).
 * — Tooltips surface nav labels in compact/icon-rail mode.
 * — Ctrl+B keyboard shortcut wired via SidebarProvider.
 * — Full aria-current / aria-expanded / aria-label support.
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
      aria-expanded={!compact}
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-1",
        "transition-[width] duration-300 ease-out",
        mobile ? "w-full" : "hidden lg:flex",
        !mobile && (compact ? "w-[var(--sidebar-width-rail)]" : "w-[var(--sidebar-width)]"),
      )}
      style={{ zIndex: "var(--z-sidebar)" }}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-[var(--header-height)] shrink-0 items-center gap-2.5 border-b border-border px-4",
          compact && "justify-center px-2",
        )}
      >
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
          onClick={mobile ? closeMobileSidebar : undefined}
          tabIndex={0}
        >
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-120 from-brand to-pulse text-primary-foreground shadow-sm"
          >
            <Activity className="size-5" />
          </span>
          {/* Text label fades out in compact mode without collapsing immediately */}
          <span
            className={cn(
              "min-w-0 overflow-hidden transition-[opacity,max-width] duration-300 ease-out",
              compact ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100",
            )}
          >
            <span className="block truncate text-[0.95rem] leading-tight font-bold tracking-tight text-foreground">
              Invinceible <span className="text-gradient-brand">Core</span>
            </span>
            <span className="block text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase">
              Hospital OS
            </span>
          </span>
        </Link>

        {/* Collapse toggle — visible only in expanded desktop mode */}
        {!mobile && !compact ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Collapse sidebar (Ctrl+B)"
                className="ml-auto text-muted-foreground hover:text-foreground"
                onClick={toggleSidebar}
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Collapse <kbd className="ml-1 font-mono text-[0.65rem]">Ctrl B</kbd>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* ── Scope context ─────────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          compact ? "max-h-0 opacity-0" : "max-h-24 opacity-100",
        )}
      >
        <div className="px-3 pt-3">
          <div className="rounded-xl border border-border bg-surface-2/70 px-3 py-2.5">
            <p
              className="truncate text-xs font-semibold text-foreground"
              title={facilityName || "No facility"}
            >
              {facilityName || "No facility"}
            </p>
            <p
              className="mt-0.5 flex items-center gap-1.5 truncate text-[0.7rem] text-muted-foreground"
              title={selectedBranchName || "All branches"}
            >
              <span className="pulse-dot" aria-hidden />
              {selectedBranchName || "All branches"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          compact ? "max-h-0 opacity-0" : "max-h-24 opacity-100",
        )}
      >
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
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {sections.map((section) => (
          <div
            key={section.label}
            data-module={section.module}
            className="mb-4 last:mb-0"
          >
            {/* Section label fades out in compact mode */}
            <div
              className={cn(
                "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
                compact ? "max-h-0 opacity-0" : "max-h-8 opacity-100",
              )}
            >
              <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground/80 uppercase">
                {section.label}
              </p>
            </div>

            {/* Separator in compact mode */}
            {compact && (
              <div className="mx-3 mb-2 mt-1 border-t border-border first:hidden" />
            )}

            <ul className="space-y-0.5" role="list">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (pathname.startsWith(`${item.href}/`) &&
                    !sections.some((s) =>
                      s.items.some(
                        (i) =>
                          i.href !== item.href &&
                          pathname.startsWith(i.href) &&
                          i.href.length > item.href.length,
                      ),
                    ));

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
                        "size-[1.1rem] shrink-0 transition-opacity",
                        active
                          ? "text-module"
                          : "opacity-70 group-hover:opacity-100",
                      )}
                      aria-hidden
                    />
                    {/* Label slides out instead of jumping */}
                    <span
                      className={cn(
                        "min-w-0 overflow-hidden truncate transition-[max-width,opacity] duration-300 ease-out",
                        compact ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100",
                      )}
                    >
                      {item.title}
                    </span>
                    {compact && <span className="sr-only">{item.title}</span>}
                  </Link>
                );

                return (
                  <li key={item.href}>
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
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Expand rail control ───────────────────────────────── */}
      {!mobile && compact ? (
        <div className="shrink-0 border-t border-border p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Expand sidebar (Ctrl+B)"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={toggleSidebar}
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Expand <kbd className="ml-1 font-mono text-[0.65rem]">Ctrl B</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </aside>
  );
}
