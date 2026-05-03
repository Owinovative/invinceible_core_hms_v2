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
      <DashboardHeader />
      <FacilitySubscriptionBanner />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="clinical-sidebar-bg w-[21rem] border-[#0b5f9e] p-0 lg:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <DashboardSidebar mobile />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="clinical-workspace-bg min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto min-h-full max-w-[1700px] px-4 py-4 md:px-6 md:py-6 xl:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      <ShellStatusFooter label="Hospital operations console" scope={scope} />
    </div>
  );
}
