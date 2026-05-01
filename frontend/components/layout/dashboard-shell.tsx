"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "@/providers/sidebar-provider";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <div className="relative h-screen overflow-hidden bg-sky-50 text-foreground dark:bg-sky-950">
      <div className="relative flex h-screen overflow-hidden">
        <DashboardSidebar />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[21rem] border-sky-300 bg-sky-500 p-0 lg:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <DashboardSidebar mobile />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader />

          <main className="min-h-0 flex-1 overflow-y-auto bg-sky-50 dark:bg-sky-950">
            <div className="mx-auto min-h-full max-w-[1700px] px-4 py-4 md:px-6 md:py-6 xl:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
