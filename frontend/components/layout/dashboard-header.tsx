"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnresolvedCounts } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { useSidebar } from "@/providers/sidebar-provider";
import { useTheme } from "@/providers/theme-provider";

/**
 * Meridian header: sticky glass chrome with the ⌘K launcher, branch
 * switcher, theme toggle, live notification count, and account menu.
 */
export function DashboardHeader({
  onOpenPalette,
}: {
  onOpenPalette: () => void;
}) {
  const { openMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const { resolved, toggle } = useTheme();

  const {
    facilityId,
    selectedBranchId,
    selectedBranchName,
    availableBranches,
    canSwitchBranches,
    setSelectedBranchId,
  } = useScope();

  const { data: counts } = useUnresolvedCounts({
    facilityId,
    branchId: selectedBranchId,
  });
  const unreadCount = counts?.counts.unread ?? 0;

  const initials = useMemo(() => {
    const source = user?.username || "U";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <header
      className="glass-chrome sticky top-0 flex h-(--header-height) shrink-0 items-center gap-2 px-3 md:px-5 border-b border-border/50"
      style={{ zIndex: "var(--z-header)" }}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        className="lg:hidden"
        onClick={openMobileSidebar}
      >
        <Menu />
      </Button>

      {/* Command palette launcher doubles as global search */}
      <button
        type="button"
        onClick={onOpenPalette}
        className="hidden h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-border bg-surface-2/60 px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring md:flex"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">
          Search modules, patients, actions…
        </span>
        <span className="kbd" aria-hidden>Ctrl K</span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        className="md:hidden"
        onClick={onOpenPalette}
      >
        <Search />
      </Button>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        {/* Branch switcher */}
        {canSwitchBranches ? (
          <Select
            value={selectedBranchId ? String(selectedBranchId) : "all"}
            onValueChange={(value) =>
              setSelectedBranchId(value === "all" ? undefined : Number(value))
            }
          >
            <SelectTrigger
              aria-label="Switch branch"
              className="hidden h-9 max-w-52 rounded-lg border-border bg-surface-2/60 text-sm font-medium sm:flex"
            >
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All branches</SelectItem>
              {availableBranches.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : selectedBranchName ? (
          <span className="hidden max-w-44 truncate rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-sm font-medium text-muted-foreground sm:block">
            {selectedBranchName}
          </span>
        ) : null}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={toggle}
        >
          {resolved === "dark" ? <Sun /> : <Moon />}
        </Button>

        {/* Notifications */}
        <Button asChild variant="ghost" size="icon" className="relative">
          <Link
            href="/notifications"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell />
            {unreadCount > 0 ? (
              <Badge className="absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            ) : null}
          </Link>
        </Button>

        {/* Account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-120 from-brand to-pulse text-xs font-bold text-primary-foreground">
                {user?.staffPassportPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.staffPassportPhotoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              <span className="hidden min-w-0 text-left lg:block">
                <span className="block max-w-36 truncate text-sm leading-tight font-semibold text-foreground">
                  {user?.username || "User"}
                </span>
                <span className="block text-[0.68rem] leading-tight text-muted-foreground">
                  {(user?.roleCode || "ROLE").replaceAll("_", " ")}
                </span>
              </span>
              <ChevronDown
                className="hidden size-3.5 text-muted-foreground lg:block"
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-semibold">
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {(user?.roleCode || "").replaceAll("_", " ")}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserRound /> Profile & settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
