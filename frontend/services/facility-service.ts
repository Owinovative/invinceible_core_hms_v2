import { apiFetch } from "@/lib/api";

export interface Facility {
  id: number;
  code: string;
  branchCode?: string | null;
  name: string;
  facilityType?: string | null;
  county?: string | null;
  town?: string | null;
  country?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  postalAddress?: string | null;
  registrationNo?: string | null;
  taxPin?: string | null;
  licenseNumber?: string | null;
  logoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapLocationLabel?: string | null;
  googleMapsUrl?: string | null;
  timezone?: string | null;
  currency?: string | null;
  mpesaShortcode?: string | null;
  mpesaPaybill?: string | null;
  mpesaAccountNumber?: string | null;
  mpesaTillNumber?: string | null;
  mpesaPochiNumber?: string | null;
  mpesaEnabled?: boolean;
  mpesaEnvironment?: string | null;
  mpesaCallbackUrl?: string | null;
  mpesaTransactionType?: string | null;
  hasMpesaConsumerKey?: boolean;
  hasMpesaConsumerSecret?: boolean;
  hasMpesaPasskey?: boolean;
  showCashOnInvoice?: boolean;
  showPaybillOnInvoice?: boolean;
  showTillOnInvoice?: boolean;
  showPochiOnInvoice?: boolean;
  shaFidCode?: string | null;
  shaClaimStartNumber?: number;
  shaClaimNextNumber?: number;
  complianceStatus?: string | null;
  complianceReason?: string | null;
  complianceDeactivatedAt?: string | null;
  complianceGraceEndsAt?: string | null;
  complianceReactivatedAt?: string | null;
  accessStatus?: {
    complianceWriteLocked?: boolean;
    subscriptionWriteLocked?: boolean;
    loginBlocked?: boolean;
    lockReason?: string | null;
  };
  isHeadOffice?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFacilityPayload {
  name: string;
  facilityType?: string;
  county?: string;
  town?: string;
  country?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  address?: string;
  postalAddress?: string;
  registrationNo?: string;
  taxPin?: string;
  licenseNumber?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  mapLocationLabel?: string;
  googleMapsUrl?: string;
  timezone?: string;
  currency?: string;
  mpesaShortcode?: string;
  mpesaPaybill?: string;
  mpesaAccountNumber?: string;
  mpesaTillNumber?: string;
  mpesaPochiNumber?: string;
  mpesaEnabled?: boolean;
  mpesaEnvironment?: string;
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaPasskey?: string;
  mpesaCallbackUrl?: string;
  mpesaTransactionType?: string;
  showCashOnInvoice?: boolean;
  showPaybillOnInvoice?: boolean;
  showTillOnInvoice?: boolean;
  showPochiOnInvoice?: boolean;
  shaFidCode?: string;
  shaClaimStartNumber?: number;
  shaClaimNextNumber?: number;
  complianceStatus?: string;
  complianceReason?: string;
  isHeadOffice?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateFacilityPayload {
  code?: string;
  branchCode?: string;
  name?: string;
  facilityType?: string;
  county?: string;
  town?: string;
  country?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  website?: string;
  address?: string;
  postalAddress?: string;
  registrationNo?: string;
  taxPin?: string;
  licenseNumber?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  mapLocationLabel?: string;
  googleMapsUrl?: string;
  timezone?: string;
  currency?: string;
  mpesaShortcode?: string;
  mpesaPaybill?: string;
  mpesaAccountNumber?: string;
  mpesaTillNumber?: string;
  mpesaPochiNumber?: string;
  mpesaEnabled?: boolean;
  mpesaEnvironment?: string;
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaPasskey?: string;
  mpesaCallbackUrl?: string;
  mpesaTransactionType?: string;
  showCashOnInvoice?: boolean;
  showPaybillOnInvoice?: boolean;
  showTillOnInvoice?: boolean;
  showPochiOnInvoice?: boolean;
  shaFidCode?: string;
  shaClaimStartNumber?: number;
  shaClaimNextNumber?: number;
  complianceStatus?: string;
  complianceReason?: string;
  isHeadOffice?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

export async function getFacilities() {
  return apiFetch<Facility[]>("/facilities", {
    method: "GET",
  });
}

export async function createFacility(payload: CreateFacilityPayload) {
  return apiFetch<Facility>("/facilities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFacility(
  id: number,
  payload: UpdateFacilityPayload,
) {
  return apiFetch<Facility>(`/facilities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
