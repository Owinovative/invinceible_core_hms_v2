"use client";

import { LogOut, Menu, Moon, Shield, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";

export function PlatformHeader() {
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
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
    <header className="sticky top-0 z-30 border-b bg-[rgba(7,11,20,0.72)] backdrop-blur-2xl">
      <div className="flex h-20 items-center gap-4 px-4 md:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden items-center gap-3 rounded-[1.2rem] border glass-panel px-4 py-2 panel-shadow md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10">
            <Shield className="h-5 w-5 text-violet-400" />
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
            className="rounded-xl"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="flex items-center gap-3 rounded-[1.3rem] border glass-panel px-3 py-2 panel-shadow">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold">
                {user?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 font-semibold text-white shadow-lg">
              {initials}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
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
