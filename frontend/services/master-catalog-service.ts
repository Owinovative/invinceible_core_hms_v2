import { apiFetch } from "@/lib/api";
import type { BillingServiceItem } from "@/services/billing-service";
import type { LabTestCatalogItem } from "@/services/lab-service";
import type { PharmacyMedicine } from "@/services/pharmacy-service";

export type MasterCatalogKind = "medicines" | "billing-services" | "lab-tests";

export interface MasterCatalogOverview {
  medicines: {
    total: number;
    active: number;
  };
  billingServices: {
    total: number;
    active: number;
  };
  labTests: {
    total: number;
    active: number;
  };
  branchMedicinePrices: number;
  facilityServiceTariffs: number;
}

export interface MasterCatalogTemplate {
  fileName: string;
  columns: string[];
  rowCount: number;
  csvText: string;
}

export interface MasterCatalogImportResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    key?: string;
    message: string;
  }>;
}

export interface MasterCatalogListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedMasterCatalogResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

const listEndpointByKind: Record<MasterCatalogKind, string> = {
  medicines: "/master-catalog/medicines",
  "billing-services": "/master-catalog/billing-services",
  "lab-tests": "/master-catalog/lab-tests",
};

export async function getMasterCatalogOverview() {
  return apiFetch<MasterCatalogOverview>("/master-catalog/overview", {
    method: "GET",
  });
}

export async function getMasterCatalogRows(
  kind: "medicines",
  params?: MasterCatalogListParams,
): Promise<PaginatedMasterCatalogResponse<PharmacyMedicine>>;
export async function getMasterCatalogRows(
  kind: "billing-services",
  params?: MasterCatalogListParams,
): Promise<PaginatedMasterCatalogResponse<BillingServiceItem>>;
export async function getMasterCatalogRows(
  kind: "lab-tests",
  params?: MasterCatalogListParams,
): Promise<PaginatedMasterCatalogResponse<LabTestCatalogItem>>;
export async function getMasterCatalogRows(
  kind: MasterCatalogKind,
  params?: MasterCatalogListParams,
): Promise<
  PaginatedMasterCatalogResponse<
    PharmacyMedicine | BillingServiceItem | LabTestCatalogItem
  >
>;
export async function getMasterCatalogRows(
  kind: MasterCatalogKind,
  params: MasterCatalogListParams = {},
) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("pageSize", String(params.pageSize ?? 50));
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  return apiFetch<
    PaginatedMasterCatalogResponse<
      PharmacyMedicine | BillingServiceItem | LabTestCatalogItem
    >
  >(`${listEndpointByKind[kind]}?${searchParams.toString()}`, {
    method: "GET",
  });
}

export async function getLegacyMasterCatalogRows(
  kind: "medicines",
): Promise<PharmacyMedicine[]>;
export async function getLegacyMasterCatalogRows(
  kind: "billing-services",
): Promise<BillingServiceItem[]>;
export async function getLegacyMasterCatalogRows(
  kind: "lab-tests",
): Promise<LabTestCatalogItem[]>;
export async function getLegacyMasterCatalogRows(
  kind: MasterCatalogKind,
): Promise<Array<PharmacyMedicine | BillingServiceItem | LabTestCatalogItem>>;
export async function getLegacyMasterCatalogRows(kind: MasterCatalogKind) {
  const response = await getMasterCatalogRows(kind, { page: 1, pageSize: 100 });
  return response.data;
}

export async function getMasterCatalogTemplate(kind: MasterCatalogKind) {
  return apiFetch<MasterCatalogTemplate>(
    `${listEndpointByKind[kind]}/template`,
    {
      method: "GET",
    },
  );
}

export async function importMasterCatalogCsv(
  kind: MasterCatalogKind,
  csvText: string,
) {
  return apiFetch<MasterCatalogImportResult>(
    `${listEndpointByKind[kind]}/import`,
    {
      method: "POST",
      body: JSON.stringify({ csvText }),
    },
  );
}
