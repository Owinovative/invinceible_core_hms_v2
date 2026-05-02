import { apiFetch } from "@/lib/api";

export interface BranchFacility {
  id: number;
  code?: string;
  name?: string;
}

export interface Branch {
  id: number;
  code: string;
  name: string;
  facilityId: number;
  county?: string | null;
  town?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  postalAddress?: string | null;
  timezone?: string | null;
  currency?: string | null;
  mpesaShortcode?: string | null;
  mpesaPaybill?: string | null;
  mpesaAccountNumber?: string | null;
  mpesaTillNumber?: string | null;
  mpesaPochiNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapLocationLabel?: string | null;
  googleMapsUrl?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  facility?: BranchFacility | null;
}

export interface CreateBranchPayload {
  name: string;
  facilityId: number;
  county?: string;
  town?: string;
  country?: string;
  phone?: string;
  email?: string;
  address?: string;
  postalAddress?: string;
  timezone?: string;
  currency?: string;
  mpesaShortcode?: string;
  mpesaPaybill?: string;
  mpesaAccountNumber?: string;
  mpesaTillNumber?: string;
  mpesaPochiNumber?: string;
  latitude?: number;
  longitude?: number;
  mapLocationLabel?: string;
  googleMapsUrl?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateBranchPayload {
  code?: string;
  name?: string;
  facilityId?: number;
  county?: string;
  town?: string;
  country?: string;
  phone?: string;
  email?: string;
  address?: string;
  postalAddress?: string;
  timezone?: string;
  currency?: string;
  mpesaShortcode?: string;
  mpesaPaybill?: string;
  mpesaAccountNumber?: string;
  mpesaTillNumber?: string;
  mpesaPochiNumber?: string;
  latitude?: number;
  longitude?: number;
  mapLocationLabel?: string;
  googleMapsUrl?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export async function getBranches() {
  return apiFetch<Branch[]>("/branches", {
    method: "GET",
  });
}

export async function createBranch(payload: CreateBranchPayload) {
  return apiFetch<Branch>("/branches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBranch(id: number, payload: UpdateBranchPayload) {
  return apiFetch<Branch>(`/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
