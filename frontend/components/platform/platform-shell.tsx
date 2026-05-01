"use client";

import { PlatformHeader } from "@/components/platform/platform-header";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { ShellStatusFooter } from "@/components/layout/shell-status-footer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSidebar } from "@/providers/sidebar-provider";

export function PlatformShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#001a33] text-foreground">
      <PlatformHeader />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <PlatformSidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-[#001a33] p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[20rem] border-[#242424] bg-[#303030] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Platform navigation</SheetTitle>
          </SheetHeader>
          <PlatformSidebar mobile />
        </SheetContent>
      </Sheet>

      <ShellStatusFooter label="Platform control console" scope="Super admin operations" />
    </div>
  );
}
