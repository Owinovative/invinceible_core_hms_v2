import { PharmacyInventoryService } from './pharmacy-inventory.service';

describe('PharmacyInventoryService FEFO allocation', () => {
  it('uses earliest-expiring batches and records every issued unit', async () => {
    const batches = [
      {
        id: 1,
        pharmacyLocationId: 10,
        batchNumber: 'EARLY',
        quantityAvailable: 3,
      },
      {
        id: 2,
        pharmacyLocationId: 11,
        batchNumber: 'LATER',
        quantityAvailable: 4,
      },
    ];
    const tx = {
      medicineBatch: {
        findMany: jest.fn().mockResolvedValue(batches),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pharmacyLocationStock: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pharmacyStockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new PharmacyInventoryService({} as never, {} as never);

    await service.allocateForIssue(tx as never, {
      facilityId: 1,
      branchId: 2,
      medicineId: 3,
      branchStockId: 4,
      quantity: 7,
      sourceType: 'PRESCRIPTION_DISPENSE',
      sourceEntityId: '50',
      aggregateStockBefore: 20,
      aggregateStockAfter: 13,
    });

    expect(tx.medicineBatch.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 1, quantityAvailable: { gte: 3 } },
      data: {
        quantityAvailable: { decrement: 3 },
        statusCode: 'DEPLETED',
      },
    });
    expect(tx.medicineBatch.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 2, quantityAvailable: { gte: 4 } },
      data: {
        quantityAvailable: { decrement: 4 },
        statusCode: 'DEPLETED',
      },
    });
    expect(tx.pharmacyStockMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.pharmacyStockMovement.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        quantity: 4,
        medicineBatchId: 2,
        pharmacyLocationId: 11,
      }),
    });
  });

  it('rejects aggregate-only stock that has no active batch allocation', async () => {
    const tx = {
      medicineBatch: { findMany: jest.fn().mockResolvedValue([]) },
      pharmacyLocationStock: { updateMany: jest.fn() },
      pharmacyStockMovement: { create: jest.fn() },
    };
    const service = new PharmacyInventoryService({} as never, {} as never);

    await expect(
      service.allocateForIssue(tx as never, {
        facilityId: 1,
        branchId: 2,
        medicineId: 3,
        branchStockId: 4,
        quantity: 2,
        sourceType: 'IPD_MEDICINE_ADMINISTRATION',
        sourceEntityId: '10',
        aggregateStockBefore: 5,
        aggregateStockAfter: 3,
      }),
    ).rejects.toThrow('active, unexpired pharmacy batches');
    expect(tx.pharmacyStockMovement.create).not.toHaveBeenCalled();
  });

  it('rolls back when location stock disagrees with its batch', async () => {
    const tx = {
      medicineBatch: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            pharmacyLocationId: 10,
            batchNumber: 'B-1',
            quantityAvailable: 2,
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pharmacyLocationStock: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      pharmacyStockMovement: { create: jest.fn() },
    };
    const service = new PharmacyInventoryService({} as never, {} as never);

    await expect(
      service.allocateForIssue(tx as never, {
        facilityId: 1,
        branchId: 2,
        medicineId: 3,
        branchStockId: 4,
        quantity: 1,
        sourceType: 'OTC_SALE',
        sourceEntityId: '5',
        aggregateStockBefore: 5,
        aggregateStockAfter: 4,
      }),
    ).rejects.toThrow('Location stock is inconsistent');
    expect(tx.pharmacyStockMovement.create).not.toHaveBeenCalled();
  });
});
