import { apiFetch } from "@/lib/api";

export interface PharmacyLocation {
  id: number;
  facilityId: number;
  branchId: number;
  code: string;
  name: string;
  locationType: string;
}

export interface InventoryDashboard {
  filters: { nearExpiryDays: number; deadStockDays: number };
  summary: {
    locations: number;
    activeBatches: number;
    expiredBatches: number;
    nearExpiryBatches: number;
    deadStockItems: number;
  };
  expired: InventoryBatch[];
  nearExpiry: InventoryBatch[];
  deadStock: Array<{
    id: number;
    stockQuantity: number;
    medicine: { id: number; name: string; code: string };
    pharmacyLocation: PharmacyLocation;
  }>;
}

export interface InventoryBatch {
  id: number;
  batchNumber: string;
  expiresAt: string;
  quantityAvailable: number;
  statusCode: string;
  medicine: { id: number; name: string; code: string };
  pharmacyLocation: PharmacyLocation;
}

export interface PharmacyStockMovement {
  id: number;
  createdAt: string;
  movementType: string;
  sourceType: string;
  sourceEntityId?: string | null;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  notes?: string | null;
  medicine: { id: number; name: string; code: string };
  pharmacyLocation?: PharmacyLocation | null;
  medicineBatch?: InventoryBatch | null;
}

export function getInventoryDashboard() {
  return apiFetch<InventoryDashboard>("/pharmacy-inventory/dashboard");
}

export function getPharmacyLocations() {
  return apiFetch<PharmacyLocation[]>("/pharmacy-inventory/locations");
}

export function getInventoryBatches() {
  return apiFetch<InventoryBatch[]>("/pharmacy-inventory/batches");
}

export function getStockMovements() {
  return apiFetch<PharmacyStockMovement[]>("/pharmacy-inventory/movements");
}

export async function exportStockMovements() {
  return apiFetch<{
    fileName: string;
    rowCount: number;
    truncated: boolean;
    csvText: string;
  }>("/pharmacy-inventory/movements/export");
}

export function createPharmacyLocation(payload: {
  facilityId: number;
  branchId: number;
  code: string;
  name: string;
  locationType: string;
}) {
  return apiFetch<PharmacyLocation>("/pharmacy-inventory/locations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function receiveMedicineBatch(payload: {
  pharmacyLocationId: number;
  medicineId: number;
  batchNumber: string;
  expiresAt: string;
  quantity: number;
  unitCost?: number;
  supplierName?: string;
}) {
  return apiFetch("/pharmacy-inventory/batches/receive", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface MedicineReturn {
  id: number;
  returnNumber: string;
  statusCode: string;
  returnReason: string;
  receivedAt: string;
  patient: { id: number; patientNumber: string; firstName: string; lastName: string };
  pharmacyLocation: PharmacyLocation;
  items: Array<{
    id: number;
    quantityReturned: number;
    conditionCode: string;
    dispositionCode?: string | null;
    medicine: { id: number; name: string };
    medicineBatch?: InventoryBatch | null;
  }>;
}

export function reviewMedicineReturn(
  returnId: number,
  payload: {
    inspectionNotes: string;
    items: Array<{
      itemId: number;
      dispositionCode: "RESTOCK" | "WASTE" | "QUARANTINE";
      medicineBatchId?: number;
      dispositionReason?: string;
    }>;
  },
) {
  return apiFetch<MedicineReturn>(
    `/pharmacy-inventory/returns/${returnId}/review`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function getMedicineReturns() {
  return apiFetch<MedicineReturn[]>("/pharmacy-inventory/returns");
}

export function createMedicineReturn(payload: {
  pharmacyLocationId: number;
  patientId: number;
  dispenseId?: number;
  returnReason: string;
  items: Array<{
    medicineId: number;
    quantityReturned: number;
    conditionCode: string;
    dispenseItemId?: number;
    medicineBatchId?: number;
  }>;
}) {
  return apiFetch<MedicineReturn>("/pharmacy-inventory/returns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
