"use client";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { FacilitySubscriptionBanner } from "@/components/layout/facility-subscription-banner";
import { ShellStatusFooter } from "@/components/layout/shell-status-footer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useScope } from "@/providers/scope-provider";
import { useSidebar } from "@/providers/sidebar-provider";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { facilityName, selectedBranchName } = useScope();
  const scope = [facilityName, selectedBranchName].filter(Boolean).join(" / ");

  return (
    <div className="clinical-shell-bg relative flex h-screen flex-col overflow-hidden text-foreground">
      {/* Floating Header */}
      <div className="px-3 pt-3 md:px-4 md:pt-4 z-40">
        <DashboardHeader />
        <FacilitySubscriptionBanner />
      </div>

      {/* Floating Body Area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden p-3 md:p-4 gap-4">
        <DashboardSidebar />
        
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="clinical-sidebar-bg w-[21rem] border-white/10 p-0 lg:hidden rounded-r-[2rem] panel-shadow"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <DashboardSidebar mobile />
          </SheetContent>
        </Sheet>

        {/* Main Workspace wrapped in glass */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] glass panel-shadow border border-white/60 animate-fade-in">
          <main className="clinical-workspace-bg min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto min-h-full max-w-[1700px] px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      <ShellStatusFooter label="Hospital operations console" scope={scope} />
    </div>
  );
}
