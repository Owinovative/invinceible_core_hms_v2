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
import { AppLogo } from "@/components/shared/app-logo";

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
    <header className="clinical-header-bg sticky top-0 z-40 shrink-0 border-b border-[#2db6ff] border-t-4 border-t-red-600 text-white shadow-[0_12px_28px_rgba(3,76,126,0.22)]">
      <div className="flex min-h-20 items-center gap-4 px-4 py-3 md:px-6">
        <div className="hidden min-w-[260px] shrink-0 items-center lg:flex">
          <AppLogo light />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-sky-300/70 bg-[#004b88] text-white hover:bg-[#006fbd] lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden min-w-0 max-w-2xl flex-1 items-center gap-3 rounded-lg border border-sky-300/60 bg-[#004f91] px-5 py-3 md:flex">
          <Search className="h-4 w-4 shrink-0 text-white" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {selectedBranchName || facilityName || "Active workspace"}
            </p>
            <p className="truncate text-xs font-medium text-[#e8f6ff]">
              Patients, billing, lab, pharmacy, and admissions
            </p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
          <div className="hidden min-w-0 rounded-lg border border-sky-300/60 bg-[#004f91] px-4 py-2.5 shadow-sm md:flex md:items-center">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#e8f6ff]">
                Facility
              </p>
              <p className="max-w-[230px] truncate text-sm font-semibold text-white" title={facilityName || "No facility"}>
                {facilityName || "No facility"}
              </p>
            </div>
          </div>

          <div className="hidden min-w-[260px] max-w-[340px] rounded-lg border border-sky-300/60 bg-[#004f91] px-4 py-2.5 shadow-sm md:block">
            <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-[#e8f6ff]">
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
            className="rounded-md border-sky-300/70 bg-[#004b88] text-white hover:bg-[#006fbd]"
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
            className="relative rounded-md border-sky-300/70 bg-[#004b88] text-white hover:bg-[#006fbd]"
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

          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-sky-300/60 bg-[#004f91] px-3 py-2.5 shadow-sm">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[210px] truncate text-sm font-semibold text-white" title={user?.username || "User"}>
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs font-medium text-[#e8f6ff]">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-[#005a9c]">
              {initials}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-white hover:bg-[#006fbd] hover:text-white"
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
