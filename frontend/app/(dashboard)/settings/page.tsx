"use client";

import { SettingsManager } from "@/components/settings/settings-manager";
import { useAuth } from "@/providers/auth-provider";

export default function SettingsPage() {
  const { user } = useAuth();
  const canManageSettings = ["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(
    user?.roleCode ?? "",
  );

  if (!canManageSettings) {
    return (
      <div className="rounded-md border border-sky-200 bg-white p-6 text-slate-700 shadow-sm">
        <h1 className="text-xl font-bold text-[#07345f]">Settings restricted</h1>
        <p className="mt-2 text-sm">
          Settings are available only to super admins and facility
          administrators.
        </p>
      </div>
    );
  }

  return (
    <SettingsManager
      title="Hospital Settings"
      badge="Workspace Configuration"
    />
  );
}
