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
  timezone?: string | null;
  currency?: string | null;
  mpesaShortcode?: string | null;
  mpesaPaybill?: string | null;
  mpesaTillNumber?: string | null;
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
  timezone?: string;
  currency?: string;
  mpesaShortcode?: string;
  mpesaPaybill?: string;
  mpesaTillNumber?: string;
  isHeadOffice?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}
