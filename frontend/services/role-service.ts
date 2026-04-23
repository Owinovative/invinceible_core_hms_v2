import { apiFetch } from "@/lib/api";

export interface RoleItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
}

export async function getRoles() {
  return apiFetch<RoleItem[]>("/roles", {
    method: "GET",
  });
}
