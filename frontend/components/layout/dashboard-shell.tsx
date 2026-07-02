"use client";

import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { FacilitySubscriptionBanner } from "@/components/layout/facility-subscription-banner";
import { ShellStatusFooter } from "@/components/layout/shell-status-footer";
import {
  CommandPalette,
  useCommandPalette,
} from "@/components/ui/command-palette";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { moduleForPath } from "@/lib/navigation";
import { useScope } from "@/providers/scope-provider";
import { useSidebar } from "@/providers/sidebar-provider";

/**
 * Meridian app shell: fixed sidebar + glass header + scrollable canvas +
 * slim status footer. The active module family sets data-module so every
 * page inherits its accent. Includes skip link and ⌘K palette.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { facilityName, selectedBranchName } = useScope();
  const palette = useCommandPalette();

  const scope = [facilityName, selectedBranchName].filter(Boolean).join(" · ");
  const moduleFamily = moduleForPath(pathname);

  return (
    <div
      data-module={moduleFamily}
      className="flex h-screen overflow-hidden text-foreground"
    >
      <a
        href="#main-content"
        className="sr-only z-100 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      <DashboardSidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-80 border-border p-0 lg:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <DashboardSidebar mobile />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader onOpenPalette={() => palette.setOpen(true)} />
        <FacilitySubscriptionBanner />
        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          <div className="mx-auto min-h-full w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <ShellStatusFooter
          label="Hospital operations console"
          scope={scope}
        />
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
}
