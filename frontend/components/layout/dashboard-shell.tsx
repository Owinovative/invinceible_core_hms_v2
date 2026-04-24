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
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.22] dark:opacity-[0.14]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)
              `,
              backgroundSize: "34px 34px",
            }}
          />
        </div>
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-500/[0.08] to-transparent" />
      </div>

      <div className="relative flex h-screen overflow-hidden">
        <DashboardSidebar />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[21rem] border-white/10 bg-background p-0 lg:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <DashboardSidebar mobile />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader />

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto min-h-full max-w-[1700px] px-4 py-4 md:px-6 md:py-6 xl:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
