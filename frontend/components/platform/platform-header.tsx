"use client";

import { LogOut, Menu, Moon, Shield, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";

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
    <header className="sticky top-0 z-30 border-b border-sky-900 bg-[#08243f] text-white shadow-lg">
      <div className="flex min-h-24 items-center gap-4 px-4 py-3 md:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-sky-500/40 bg-sky-400/10 text-white hover:bg-sky-400/20 lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden min-w-0 items-center gap-3 rounded-md border border-sky-500/30 bg-[#0d3155] px-4 py-3 md:flex">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-sky-400/15">
            <Shield className="h-5 w-5 text-sky-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-sky-100/70">Secure Area</p>
            <p className="truncate font-semibold text-white">Platform Administration</p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-md border-sky-500/40 bg-sky-400/10 text-white hover:bg-sky-400/20"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="flex min-w-0 items-center gap-3 rounded-md border border-sky-500/30 bg-[#0d3155] px-3 py-2 shadow-sm">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[230px] truncate text-sm font-semibold text-white" title={user?.username || "User"}>
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs text-sky-100/70">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-sky-400 font-semibold text-[#06213b]">
              {initials}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-white hover:bg-sky-400/15 hover:text-white"
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
