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
    <header className="sticky top-0 z-30 border-b border-sky-200 bg-white shadow-sm">
      <div className="flex h-20 items-center gap-4 px-4 md:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-sky-200 bg-white lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-2 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white">
            <Shield className="h-5 w-5 text-sky-700" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Secure Area</p>
            <p className="font-semibold">Platform Administration</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-md border-sky-200 bg-white"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="flex items-center gap-3 rounded-md border border-sky-200 bg-white px-3 py-2 shadow-sm">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold">
                {user?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-100 font-semibold text-sky-800">
              {initials}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-md"
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
