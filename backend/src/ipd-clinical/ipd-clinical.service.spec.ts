import { BadRequestException } from '@nestjs/common';
import { IpdClinicalService } from './ipd-clinical.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';

describe('IpdClinicalService medicine administration integrity', () => {
  const user: RequestUser = {
    userId: 7,
    username: 'nurse',
    roleId: 4,
    roleCode: 'NURSE',
    homeFacilityId: 1,
    homeBranchId: 2,
  };

  const admission = { id: 10, facilityId: 1, branchId: 2 };
  const stock = {
    id: 30,
    facilityId: 1,
    branchId: 2,
    medicineId: 5,
    stockQuantity: 8,
    medicine: { name: 'Amoxicillin' },
    branch: { name: 'Main' },
  };

  function setup(reservationCount = 1) {
    const tx = {
      branchMedicineStock: {
        updateMany: jest.fn().mockResolvedValue({ count: reservationCount }),
      },
      treatmentChartEntry: {
        create: jest.fn().mockResolvedValue({ id: 41, admissionId: 10 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const prisma = {
      staff: { findFirst: jest.fn().mockResolvedValue({ id: 9 }) },
      branchMedicineStock: { findFirst: jest.fn().mockResolvedValue(stock) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const ipdService = {
      getAdmissionByIdScoped: jest.fn().mockResolvedValue(admission),
    };
    const safeLogger = { info: jest.fn() };
    const pharmacyInventory = {
      allocateForIssue: jest.fn().mockResolvedValue(undefined),
    };
    const service = new IpdClinicalService(
      prisma as never,
      ipdService as never,
      {} as never,
      safeLogger as never,
      pharmacyInventory as never,
    );

    return { service, prisma, tx, ipdService, pharmacyInventory };
  }

  it('scopes the admission and atomically decrements branch stock', async () => {
    const { service, tx, ipdService, pharmacyInventory } = setup();

    await service.administerAdmissionMedicine(
      10,
      { medicineId: 5, quantity: 2, dosage: '500 mg' },
      user,
    );

    expect(ipdService.getAdmissionByIdScoped).toHaveBeenCalledWith(10, user);
    expect(tx.branchMedicineStock.updateMany).toHaveBeenCalledWith({
      where: { id: 30, stockQuantity: { gte: 2 } },
      data: { stockQuantity: { decrement: 2 } },
    });
    expect(tx.treatmentChartEntry.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(pharmacyInventory.allocateForIssue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        sourceType: 'IPD_MEDICINE_ADMINISTRATION',
        quantity: 2,
      }),
    );
  });

  it('does not record administration when another request consumed the stock', async () => {
    const { service, tx } = setup(0);

    await expect(
      service.administerAdmissionMedicine(
        10,
        { medicineId: 5, quantity: 2 },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.treatmentChartEntry.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
