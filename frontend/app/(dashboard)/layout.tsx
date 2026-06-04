import * as React from "react";
import Link from "next/link";
import { Activity, Users, Pill, LayoutDashboard, Settings, Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// IMPORTANT: Double-check that this path matches where your AuthGuard is actually located!
// If it was imported differently in your original file, use that import instead.
import { AuthGuard } from "@/components/auth/auth-guard"; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Floating Modern Sidebar */}
        <aside className="hidden w-72 flex-col p-4 md:flex">
          <div className="flex h-full flex-col overflow-y-auto rounded-[2rem] glass panel-shadow p-4">
            <div className="flex items-center gap-3 px-4 py-4 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-700 to-blue-800">
                Invinceible
              </span>
            </div>

            <nav className="flex-1 space-y-2">
              <SidebarItem href="/dashboard" icon={<LayoutDashboard />} label="Overview" active />
              <SidebarItem href="/patients" icon={<Users />} label="Patients" />
              <SidebarItem href="/pharmacy" icon={<Pill />} label="Pharmacy" />
              <SidebarItem href="/platform/settings" icon={<Settings />} label="Settings" />
            </nav>

            {/* User Profile Snippet */}
            <div className="mt-auto rounded-2xl bg-slate-50/50 p-4 border border-slate-100 flex items-center gap-3 transition-all hover:bg-slate-100/50 cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-400 to-cyan-400 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold">
                SA
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">Super Admin</span>
                <span className="text-xs text-slate-500">System Controller</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden px-4 pt-4 pb-0 md:pl-0">
          {/* Modern Top Header */}
          <header className="mb-6 flex items-center justify-between rounded-[2rem] glass panel-shadow px-6 py-4 animate-fade-in">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                placeholder="Search patients, invoices, or staff..." 
                className="pl-10 h-11 border-none bg-slate-100/50 rounded-2xl focus-visible:ring-1 focus-visible:ring-cyan-500 focus-visible:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                <Bell className="h-6 w-6" />
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white"></span>
              </button>
            </div>
          </header>

          {/* Page Content Rendered Here */}
          <div className="flex-1 overflow-y-auto rounded-t-[2.5rem] bg-white panel-shadow border border-b-0 border-slate-100 p-8 animate-fade-in pb-20">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

// Helper component for the sidebar navigation
function SidebarItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group ${
        active 
          ? "bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100/50" 
          : "text-slate-500 hover:bg-slate-50 hover:text-cyan-700"
      }`}
    >
      <span className={`${active ? "text-cyan-600" : "text-slate-400 group-hover:text-cyan-600"} transition-colors`}>
        {icon}
      </span>
      {label}
    </Link>
  );
}
