"use client";

import Link from "next/link";
import { Bell, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { useUnresolvedCounts } from "@/hooks/use-dashboard-data";

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { openMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const {
    facilityId,
    facilityName,
    selectedBranchId,
    selectedBranchName,
    availableBranches,
    canSwitchBranches,
    setSelectedBranchId,
  } = useScope();

  const { data: counts, isLoading: isCountsLoading } = useUnresolvedCounts({
    facilityId,
    branchId: selectedBranchId,
  });

  const initials = useMemo(() => {
    const source = user?.username || "U";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const unreadCount = counts?.counts.unread ?? 0;

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border/70 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-20 items-center gap-4 px-4 md:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-2xl border-white/10 bg-white/[0.03] lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="premium-card hidden max-w-xl flex-1 items-center gap-3 rounded-[1.35rem] px-4 py-3 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {selectedBranchName || facilityName || "Active workspace"}
            </p>
            <p className="text-xs text-muted-foreground">
              Patients, billing, lab, pharmacy, and admissions
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden rounded-[1.25rem] border border-white/10 glass-panel px-4 py-2 panel-shadow md:flex md:items-center">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="max-w-[190px] truncate text-sm font-semibold text-foreground">
                {facilityName || "No facility"}
              </p>
            </div>
          </div>

          <div className="hidden min-w-[240px] rounded-[1.25rem] border border-white/10 glass-panel px-4 py-2 panel-shadow md:block">
            <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Branch
            </p>

            {canSwitchBranches ? (
              <Select
                value={selectedBranchId ? String(selectedBranchId) : "all"}
                onValueChange={(value) =>
                  setSelectedBranchId(value === "all" ? undefined : Number(value))
                }
              >
                <SelectTrigger className="h-8 border-0 bg-transparent px-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="truncate text-sm font-semibold">
                {selectedBranchName || "No branch"}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-2xl border-white/10 bg-white/[0.05]"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button
            asChild
            variant="outline"
            size="icon"
            className="relative rounded-2xl border-white/10 bg-white/[0.05]"
          >
            <Link href="/notifications" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {isCountsLoading ? (
                <Skeleton className="absolute -right-2 -top-2 h-5 w-5 rounded-full" />
              ) : unreadCount > 0 ? (
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full border-0 bg-red-500 px-1 text-[10px] text-white shadow">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              ) : null}
            </Link>
          </Button>

          <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 glass-panel px-3 py-2 panel-shadow">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold">
                {user?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-emerald-500 to-amber-300 text-sm font-bold text-slate-950 shadow-[0_12px_24px_rgba(14,165,233,0.28)]">
              {initials}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
