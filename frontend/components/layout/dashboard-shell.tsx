import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.28] dark:opacity-[0.16]">
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

        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />
        <div className="absolute right-[-40px] top-16 h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/10" />
        <div className="absolute bottom-[-60px] left-1/3 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-400/10" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/10" />
      </div>

      <div className="relative flex h-screen overflow-hidden">
        <DashboardSidebar />

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
