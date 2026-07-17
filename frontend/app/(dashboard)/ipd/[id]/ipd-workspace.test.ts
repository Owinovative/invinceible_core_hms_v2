import { describe, expect, it } from "vitest";
import {
  activeTreatmentStock,
  availableIpdTransferBeds,
  filterIpdLabTests,
  filterTreatmentStock,
  treatmentStockStatus,
} from "./ipd-workspace";

describe("IPD workspace selectors", () => {
  it("filters lab tests and caps empty searches", () => {
    const tests = [
      { testName: "Full Blood Count", category: "Haematology" },
      { testName: "Creatinine", category: "Chemistry" },
    ];
    expect(filterIpdLabTests(tests, "blood")).toEqual([tests[0]]);
  });

  it("keeps active medicine stock ordered by available quantity", () => {
    const items = [
      {
        medicineId: 1,
        stockQuantity: 3,
        reorderLevel: 3,
        medicine: { name: "Amoxicillin" },
      },
      {
        medicineId: 2,
        stockQuantity: 10,
        reorderLevel: 2,
        medicine: { name: "Paracetamol" },
      },
      {
        medicineId: 3,
        stockQuantity: 20,
        reorderLevel: 2,
        isActive: false,
        medicine: { name: "Inactive" },
      },
    ];
    const active = activeTreatmentStock(items);

    expect(
      filterTreatmentStock(active, "").map((item) => item.medicineId),
    ).toEqual([2, 1]);
    expect(treatmentStockStatus(active[0], true, false)).toBe("LOW_STOCK");
    expect(treatmentStockStatus(undefined, true, false)).toBe("OUT_OF_STOCK");
  });

  it("offers only active, available beds in the selected ward", () => {
    const beds = [
      { id: 1, wardId: 4, statusCode: "AVAILABLE", isActive: true },
      { id: 2, wardId: 4, statusCode: "OCCUPIED", isActive: true },
      { id: 3, wardId: 5, statusCode: "AVAILABLE", isActive: true },
    ];
    expect(availableIpdTransferBeds(beds, "4")).toEqual([beds[0]]);
  });
});
