"use client";

import { LogOut, Menu, Moon, Shield, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";
import { AppLogo } from "@/components/shared/app-logo";

export function PlatformHeader() {
  const { theme, setTheme } = useTheme();
  const { openMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();

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
    <header className="sticky top-0 z-40 shrink-0 border-b border-[#2db6ff] border-t-4 border-t-red-600 bg-[#005da8] text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
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

        <div className="hidden min-w-0 items-center gap-3 rounded-lg border border-sky-300/60 bg-[#004f91] px-5 py-3 md:flex">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/15">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#e8f6ff]">Secure Area</p>
            <p className="truncate font-semibold text-white">Platform Administration</p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
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

          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-sky-300/60 bg-[#004f91] px-3 py-2.5 shadow-sm">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[230px] truncate text-sm font-semibold text-white" title={user?.username || "User"}>
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs font-medium text-[#e8f6ff]">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white font-semibold text-[#005a9c]">
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
