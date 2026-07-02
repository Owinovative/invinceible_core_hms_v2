"use client";

import { LogOut, Menu, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/providers/sidebar-provider";
import { useAuth } from "@/providers/auth-provider";
import { AppLogo } from "@/components/shared/app-logo";

export function PlatformHeader() {
  const { openMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const [photoOpen, setPhotoOpen] = useState(false);

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
    <header className="bg-surface-1 border-b border-border sticky top-0 z-40 shrink-0 border-b border-[#2db6ff] border-t-4 border-t-red-600 text-white shadow-[0_12px_28px_rgba(3,76,126,0.22)]">
      <div className="flex min-h-20 items-center gap-4 px-4 py-3 md:px-6">
        <div className="hidden min-w-[260px] shrink-0 items-center lg:flex">
          <AppLogo light />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-border-strong/70 bg-[#004b88] text-white hover:bg-[#006fbd] lg:hidden"
          onClick={openMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden min-w-0 items-center gap-3 rounded-lg border border-border-strong/60 bg-[#004f91] px-5 py-3 md:flex">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-card/15">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#e8f6ff]">Secure Area</p>
            <p className="truncate font-semibold text-white">Platform Administration</p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border-strong/60 bg-[#004f91] px-3 py-2.5 shadow-sm">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[230px] truncate text-sm font-semibold text-white" title={user?.username || "User"}>
                {user?.username || "User"}
              </p>
              <p className="truncate text-xs font-medium text-[#e8f6ff]">
                {user?.roleCode || "Role"}
              </p>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-card font-semibold text-[#005a9c]"
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
              className="rounded-md text-white hover:bg-[#006fbd] hover:text-white"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {photoOpen && user?.staffPassportPhotoUrl ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 p-4"
          onClick={() => setPhotoOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.staffPassportPhotoUrl}
            alt=""
            className="max-h-[86vh] max-w-[92vw] rounded-lg border-4 border-white bg-card object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </header>
  );
}
