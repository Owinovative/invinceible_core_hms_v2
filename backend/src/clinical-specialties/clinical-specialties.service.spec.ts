import { ClinicalSpecialtiesService } from './clinical-specialties.service';

describe('ClinicalSpecialtiesService billing integrity', () => {
  const user = {
    userId: 1,
    username: 'clinician',
    roleId: 1,
    staffId: 7,
  };

  function setup() {
    const tx = {
      dentalProcedure: {
        create: jest.fn().mockResolvedValue({
          id: 20,
          procedureName: 'Restoration',
          procedureNotes: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 20, invoiceItemId: 30 }),
      },
      orthopedicImplant: {
        create: jest.fn().mockResolvedValue({
          id: 21,
          implantName: 'Titanium plate',
          notes: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 21, invoiceItemId: 31 }),
      },
    };
    const prisma = {
      dentalEncounter: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          patientId: 5,
          facilityId: 2,
          branchId: 3,
        }),
      },
      orthopedicCase: {
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          patientId: 5,
          facilityId: 2,
          branchId: 3,
        }),
      },
      $transaction: jest.fn((work) => work(tx)),
    };
    const scope = { assertBranchAccess: jest.fn() };
    const billing = {
      resolveChargePrice: jest.fn().mockResolvedValue(2500),
      addAutoInvoiceItemInTransaction: jest
        .fn()
        .mockResolvedValue({ item: { id: 30 } }),
    };
    return {
      tx,
      prisma,
      billing,
      service: new ClinicalSpecialtiesService(
        prisma as never,
        scope as never,
        billing as never,
      ),
    };
  }

  it('creates a dental procedure and invoice line in the same transaction', async () => {
    const { service, prisma, billing, tx } = setup();

    await service.addDentalProcedure(
      1,
      {
        procedureCode: 'DENT_RESTORE',
        procedureName: 'Restoration',
      },
      user,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(billing.addAutoInvoiceItemInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        sourceModule: 'DENTAL',
        sourceEntityId: '20',
        unitPrice: 2500,
      }),
    );
    expect(tx.dentalProcedure.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { invoiceItemId: 30 },
    });
  });

  it('creates an orthopedic implant and invoice line in the same transaction', async () => {
    const { service, prisma, billing, tx } = setup();
    billing.addAutoInvoiceItemInTransaction.mockResolvedValue({
      item: { id: 31 },
    });

    await service.addImplant(
      2,
      { implantName: 'Titanium plate', lotNumber: 'LOT-1' },
      user,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(billing.resolveChargePrice).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'ORTHOPEDICS',
        code: 'IMPLANT_TITANIUM_PLATE',
      }),
    );
    expect(billing.addAutoInvoiceItemInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        sourceModule: 'ORTHOPEDICS',
        sourceEntityId: '21',
        unitPrice: 2500,
      }),
    );
    expect(tx.orthopedicImplant.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: { invoiceItemId: 31 },
    });
  });
});
