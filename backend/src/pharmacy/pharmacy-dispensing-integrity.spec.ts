import { PharmacyService } from './pharmacy.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';

describe('PharmacyService partial dispensing integrity', () => {
  const user: RequestUser = {
    userId: 7,
    username: 'pharmacist',
    roleId: 5,
    roleCode: 'PHARMACIST',
    homeFacilityId: 1,
    homeBranchId: 2,
  };

  it('deducts only the requested quantity and preserves a partial status', async () => {
    const branchStock = {
      id: 30,
      facilityId: 1,
      branchId: 2,
      medicineId: 5,
      stockQuantity: 20,
      reorderLevel: 2,
      unitPrice: 10,
      medicine: { name: 'Amoxicillin' },
      branch: { name: 'Main' },
    };
    const prescription = {
      id: 10,
      prescriptionNumber: 'RX-10',
      patientId: 20,
      facilityId: 1,
      branchId: 2,
      consultationId: 3,
      prescribedByStaffId: 8,
      statusCode: 'PENDING',
      dispenses: [],
      items: [
        {
          id: 11,
          medicineId: 5,
          quantity: 10,
          statusCode: 'PENDING',
          instructions: 'After food',
          medicine: { name: 'Amoxicillin', unitPrice: 10 },
        },
      ],
    };
    const tx = {
      dispense: {
        create: jest.fn().mockResolvedValue({ id: 50 }),
        update: jest.fn().mockResolvedValue({ id: 50 }),
      },
      prescriptionItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      branchMedicineStock: {
        findFirst: jest.fn().mockResolvedValue(branchStock),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ ...branchStock, stockQuantity: 16 }),
      },
      pharmacyStockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
      dispenseItem: { create: jest.fn().mockResolvedValue({}) },
      prescription: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          ...prescription,
          statusCode: 'PARTIALLY_DISPENSED',
        }),
      },
    };
    const prisma = {
      staff: { findFirst: jest.fn().mockResolvedValue({ id: 9 }) },
      branchMedicineStock: {
        findFirst: jest.fn().mockResolvedValue(branchStock),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const scopeService = { assertBranchAccess: jest.fn() };
    const billingService = {
      addAutoInvoiceItem: jest.fn().mockResolvedValue({}),
    };
    const notificationService = { create: jest.fn().mockResolvedValue({}) };
    const inventoryService = {
      allocateForIssue: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PharmacyService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      notificationService as never,
      scopeService as never,
      billingService as never,
      {} as never,
      {} as never,
      inventoryService as never,
    );
    jest
      .spyOn(service, 'getPrescriptionById')
      .mockResolvedValue(prescription as never);
    jest
      .spyOn(service as never, 'notifyLowOrOutOfStock')
      .mockResolvedValue(undefined);

    await service.dispensePrescription(10, user, {
      items: [{ prescriptionItemId: 11, quantityDispensed: 4 }],
    });

    expect(scopeService.assertBranchAccess).toHaveBeenCalledWith(user, 1, 2);
    expect(tx.branchMedicineStock.updateMany).toHaveBeenCalledWith({
      where: { id: 30, stockQuantity: { gte: 4 } },
      data: { stockQuantity: { decrement: 4 } },
    });
    expect(tx.prescriptionItem.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { statusCode: 'PARTIALLY_DISPENSED' },
    });
    expect(inventoryService.allocateForIssue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        sourceType: 'PRESCRIPTION_DISPENSE',
        quantity: 4,
        aggregateStockBefore: 20,
        aggregateStockAfter: 16,
      }),
    );
    expect(tx.prescription.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { statusCode: 'PARTIALLY_DISPENSED', dispensedAt: null },
    });
    expect(billingService.addAutoInvoiceItem).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 4 }),
    );
  });
});
