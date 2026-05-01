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
    <header className="sticky top-0 z-30 border-b border-sky-400 bg-sky-600 text-white shadow-lg">
      <div className="flex min-h-24 items-center gap-4 px-4 py-3 md:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-sky-200/70 bg-white/12 text-white hover:bg-white/20 lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden min-w-0 items-center gap-3 rounded-md border border-sky-200/70 bg-sky-500 px-4 py-3 md:flex">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/15">
            <Shield className="h-5 w-5 text-sky-50" />
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
            className="rounded-md border-sky-200/70 bg-white/12 text-white hover:bg-white/20"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="flex min-w-0 items-center gap-3 rounded-md border border-sky-200/70 bg-sky-500 px-3 py-2 shadow-sm">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[230px] truncate text-sm font-semibold text-white" title={user?.username || "User"}>
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs text-sky-100/70">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white font-semibold text-sky-700">
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
