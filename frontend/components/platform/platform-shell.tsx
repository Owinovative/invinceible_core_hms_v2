"use client";

import { PlatformHeader } from "@/components/platform/platform-header";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
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
    <div className="relative h-screen overflow-hidden bg-[#eeeeee] text-foreground dark:bg-[#111827]">
      <div className="relative flex h-screen">
        <PlatformSidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PlatformHeader />
          <main className="flex-1 overflow-y-auto bg-[#eeeeee] p-4 md:p-6 lg:p-8 dark:bg-[#111827]">
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
    </div>
  );
}
