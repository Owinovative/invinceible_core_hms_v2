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
    <div className="relative h-screen overflow-hidden bg-[#eaf7ff] text-foreground dark:bg-[#081b31]">
      <div className="relative flex h-screen">
        <PlatformSidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PlatformHeader />
          <main className="flex-1 overflow-y-auto bg-[#eaf7ff] p-4 md:p-6 lg:p-8 dark:bg-[#081b31]">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[20rem] border-sky-900 bg-[#061a2f] p-0"
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
