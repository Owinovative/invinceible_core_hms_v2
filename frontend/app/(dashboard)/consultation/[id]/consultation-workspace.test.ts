import { describe, expect, it } from "vitest";
import {
  consultationBedOptions,
  consultationStockStatus,
  consultationWardOptions,
  excludeCurrentPrescriptions,
} from "./consultation-workspace";

describe("consultation workspace selectors", () => {
  it("excludes prescriptions already attached to this consultation", () => {
    expect(
      excludeCurrentPrescriptions([{ id: 1 }, { id: 2 }], [{ id: 2 }]),
    ).toEqual([{ id: 1 }]);
  });

  it("classifies selected medicine stock", () => {
    expect(
      consultationStockStatus(4, {
        medicineId: 4,
        stockQuantity: 2,
        reorderLevel: 3,
      }),
    ).toBe("LOW_STOCK");
    expect(consultationStockStatus(4, null)).toBe("OUT_OF_STOCK");
  });

  it("counts and returns only active available ward beds", () => {
    const beds = [
      { id: 1, wardId: 2, statusCode: "AVAILABLE", isActive: true },
      { id: 2, wardId: 2, statusCode: "OCCUPIED", isActive: true },
    ];
    expect(consultationWardOptions([{ id: 2 }], beds)[0].freeBeds).toBe(1);
    expect(consultationBedOptions(beds, "2")).toEqual([beds[0]]);
  });
});
