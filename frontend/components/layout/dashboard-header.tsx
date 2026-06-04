"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { useMemo, useState } from "react";
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
  const router = useRouter();
  const { openMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
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

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(""); // Optional: clear after search
    }
  };

  return (
    <header className="clinical-header-bg shrink-0 rounded-[1.5rem] border border-white/20 text-white panel-shadow">
      <div className="flex min-h-[4.5rem] items-center gap-4 px-4 py-2 md:px-6">
        <div className="hidden min-w-[260px] shrink-0 items-center lg:flex">
          <AppLogo light />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* --- ACTUAL WORKING SEARCH BAR --- */}
        <form 
          onSubmit={handleGlobalSearch}
          className="hidden min-w-0 max-w-2xl flex-1 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-1 transition-all focus-within:bg-white/20 md:flex"
        >
          <Search className="h-5 w-5 shrink-0 text-cyan-100" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients, billing, lab, pharmacy..."
            className="w-full h-10 bg-transparent border-none text-white placeholder-cyan-100/60 focus:outline-none focus:ring-0 text-sm font-medium"
          />
        </form>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
          <div className="hidden min-w-0 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-2 shadow-sm md:flex md:items-center">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">
                Facility
              </p>
              <p className="max-w-[230px] truncate text-sm font-semibold text-white" title={facilityName || "No facility"}>
                {facilityName || "No facility"}
              </p>
            </div>
          </div>

          <div className="hidden min-w-[260px] max-w-[340px] rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-2 shadow-sm md:block">
            <p className="mb-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">
              Branch
            </p>

            {canSwitchBranches ? (
              <Select
                value={selectedBranchId ? String(selectedBranchId) : "all"}
                onValueChange={(value) =>
                  setSelectedBranchId(value === "all" ? undefined : Number(value))
                }
              >
                <SelectTrigger className="h-6 border-0 bg-transparent px-0 text-white shadow-none focus:ring-0 text-sm font-semibold">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="rounded-xl glass border-white/40">
                  <SelectItem value="all" className="rounded-lg">All branches</SelectItem>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)} className="rounded-lg">
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
            asChild
            variant="outline"
            size="icon"
            className="relative rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all"
          >
            <Link href="/notifications" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {isCountsLoading ? (
                <Skeleton className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-white/30" />
              ) : unreadCount > 0 ? (
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full border-2 border-cyan-800 bg-rose-500 px-1 text-[10px] text-white shadow-md">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              ) : null}
            </Link>
          </Button>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-3 py-2 shadow-sm transition-all hover:bg-white/15">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[210px] truncate text-sm font-semibold text-white" title={user?.username || "User"}>
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs font-medium text-cyan-100/80">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-gradient-to-tr from-cyan-400 to-blue-500 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
              onClick={() => user?.staffPassportPhotoUrl && setPhotoOpen(true)}
            >
              {user?.staffPassportPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.staffPassportPhotoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-cyan-100 hover:bg-white/20 hover:text-white"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Photo Modal */}
      {photoOpen && user?.staffPassportPhotoUrl ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPhotoOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.staffPassportPhotoUrl}
            alt=""
            className="max-h-[86vh] max-w-[92vw] rounded-2xl border-4 border-white/80 bg-white object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </header>
  );
}
