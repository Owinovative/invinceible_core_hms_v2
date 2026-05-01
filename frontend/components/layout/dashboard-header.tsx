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
    <header className="sticky top-0 z-30 shrink-0 border-b border-sky-400 bg-sky-600 text-white shadow-lg">
      <div className="flex min-h-24 items-center gap-4 px-4 py-3 md:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-sky-200/70 bg-white/12 text-white hover:bg-white/20 lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden min-w-0 max-w-2xl flex-1 items-center gap-3 rounded-md border border-sky-200/70 bg-sky-500 px-4 py-3 md:flex">
          <Search className="h-4 w-4 shrink-0 text-sky-50" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {selectedBranchName || facilityName || "Active workspace"}
            </p>
            <p className="truncate text-xs text-sky-100/75">
              Patients, billing, lab, pharmacy, and admissions
            </p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
          <div className="hidden min-w-0 rounded-md border border-sky-200/70 bg-sky-500 px-4 py-2 shadow-sm md:flex md:items-center">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/65">
                Facility
              </p>
              <p className="max-w-[230px] truncate text-sm font-semibold text-white" title={facilityName || "No facility"}>
                {facilityName || "No facility"}
              </p>
            </div>
          </div>

          <div className="hidden min-w-[280px] max-w-[360px] rounded-md border border-sky-200/70 bg-sky-500 px-4 py-2 shadow-sm md:block">
            <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-sky-100/65">
              Branch
            </p>

            {canSwitchBranches ? (
              <Select
                value={selectedBranchId ? String(selectedBranchId) : "all"}
                onValueChange={(value) =>
                  setSelectedBranchId(value === "all" ? undefined : Number(value))
                }
              >
                <SelectTrigger className="h-8 border-0 bg-transparent px-0 text-white shadow-none focus:ring-0">
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
              <p className="truncate text-sm font-semibold text-white" title={selectedBranchName || "No branch"}>
                {selectedBranchName || "No branch"}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-md border-sky-200/70 bg-white/12 text-white hover:bg-white/20"
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
            className="relative rounded-md border-sky-200/70 bg-white/12 text-white hover:bg-white/20"
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

          <div className="flex min-w-0 items-center gap-3 rounded-md border border-sky-200/70 bg-sky-500 px-3 py-2 shadow-sm">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[210px] truncate text-sm font-semibold text-white" title={user?.username || "User"}>
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs text-sky-100/70">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-sky-700">
              {initials}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-white hover:bg-white/18 hover:text-white"
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
