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
): Promise<PharmacyMedicine[]>;
export async function getMasterCatalogRows(
  kind: "billing-services",
): Promise<BillingServiceItem[]>;
export async function getMasterCatalogRows(
  kind: "lab-tests",
): Promise<LabTestCatalogItem[]>;
export async function getMasterCatalogRows(
  kind: MasterCatalogKind,
): Promise<Array<PharmacyMedicine | BillingServiceItem | LabTestCatalogItem>>;
export async function getMasterCatalogRows(kind: MasterCatalogKind) {
  return apiFetch<
    Array<PharmacyMedicine | BillingServiceItem | LabTestCatalogItem>
  >(listEndpointByKind[kind], {
    method: "GET",
  });
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
