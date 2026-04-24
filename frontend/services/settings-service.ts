import { apiFetch } from "@/lib/api";

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  valueType?: string | null;
  category?: string | null;
  description?: string | null;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getSettings() {
  return apiFetch<SystemSetting[]>("/settings", {
    method: "GET",
  });
}

export async function seedDefaultSettings() {
  return apiFetch<{
    message: string;
    createdCount: number;
    created: SystemSetting[];
  }>("/settings/seed-defaults", {
    method: "POST",
  });
}

export async function updateSettingValue(settingKey: string, value: string) {
  return apiFetch<SystemSetting>(`/settings/key/${settingKey}/value`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}
