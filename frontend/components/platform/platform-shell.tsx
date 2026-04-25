"use client";

import { CodeBackground } from "@/components/platform/code-background";
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
    <div className="premium-system-bg relative h-screen overflow-hidden text-foreground">
      <div className="premium-aurora" />
      <CodeBackground />

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
          className="w-[20rem] border-white/10 bg-[#050816] p-0"
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
