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
    <div className="relative h-screen overflow-hidden bg-[#f5fbff] text-foreground dark:bg-[#061526]">
      <div className="relative flex h-screen">
        <PlatformSidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PlatformHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[20rem] border-sky-200 bg-background p-0"
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
