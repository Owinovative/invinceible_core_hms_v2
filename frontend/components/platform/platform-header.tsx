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
    <header className="sticky top-0 z-30 border-b border-[#00477f] border-t-4 border-t-red-600 bg-[#005a9c] text-white shadow-md">
      <div className="flex min-h-16 items-center gap-4 px-4 py-2 md:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-white/60 bg-[#0b6ead] text-white hover:bg-[#1478bb] lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden min-w-0 items-center gap-3 rounded-md border border-[#75c7f2] bg-[#0b6ead] px-4 py-2.5 md:flex">
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
            className="rounded-md border-white/60 bg-[#0b6ead] text-white hover:bg-[#1478bb]"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="flex min-w-0 items-center gap-3 rounded-md border border-[#75c7f2] bg-[#0b6ead] px-3 py-2 shadow-sm">
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
              className="rounded-md text-white hover:bg-[#1478bb] hover:text-white"
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
