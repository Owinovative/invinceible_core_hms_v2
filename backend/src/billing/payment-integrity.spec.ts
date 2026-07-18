import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';

const invoice = {
  id: 1,
  invoiceNumber: 'INV-1',
  facilityId: 10,
  branchId: 11,
  patientId: 12,
  balanceAmount: 100,
  totalAmount: 100,
  discountAmount: 0,
  taxAmount: 0,
  settledAt: null,
  items: [{ lineTotal: 100, isRemoved: false }],
  payments: [],
};

function setup(
  options: {
    reserveCount?: number;
    mpesaTransitionCounts?: number[];
  } = {},
) {
  const createdPayment = {
    id: 21,
    receiptNumber: 'CSH-1',
    invoiceId: 1,
    facilityId: 10,
    branchId: 11,
    amount: 60,
    paymentMethod: 'CASH',
    statusCode: 'COMPLETED',
  };
  const tx = {
    invoice: {
      updateMany: jest
        .fn()
        .mockResolvedValue({ count: options.reserveCount ?? 1 }),
      findUnique: jest.fn().mockResolvedValue({
        ...invoice,
        payments: [{ amount: 60, statusCode: 'COMPLETED' }],
      }),
      update: jest.fn().mockResolvedValue(invoice),
    },
    payment: {
      create: jest.fn().mockResolvedValue(createdPayment),
      updateMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(createdPayment),
      findUniqueOrThrow: jest.fn().mockResolvedValue(createdPayment),
    },
    integrationOutboundRequest: {
      upsert: jest.fn().mockResolvedValue({ id: 1 }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    notification: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  };
  for (const count of options.mpesaTransitionCounts ?? []) {
    tx.payment.updateMany.mockResolvedValueOnce({ count });
  }

  const prisma = {
    invoice: {
      findUnique: jest.fn().mockResolvedValue(invoice),
    },
    payment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({
        ...createdPayment,
        paymentMethod: 'MPESA',
      }),
    },
    $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)),
  };
  const scopeService = { assertBranchAccess: jest.fn() };
  const service = new BillingService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    { findOne: jest.fn() } as never,
    {} as never,
    {} as never,
    scopeService as never,
    {} as never,
    { error: jest.fn() } as never,
    {} as never,
    {
      buildVerificationCode: jest.fn().mockReturnValue('VAR-000001-TEST'),
    } as never,
  );

  return { service, prisma, tx, scopeService, createdPayment };
}

describe('BillingService payment integrity', () => {
  it('commits payment, invoice totals, audit, notification, and outbox together', async () => {
    const { service, prisma, tx } = setup();

    await service.createCashPayment({ invoiceId: 1, amount: 60 });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.invoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, balanceAmount: { gte: 60 } },
      }),
    );
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
    expect(tx.invoice.update).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.integrationOutboundRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: 'etims:fiscalize:invoice:1' },
      }),
    );
  });

  it('rejects a concurrent cash payment when the guarded balance reservation loses', async () => {
    const { service, tx } = setup({ reserveCount: 0 });
    tx.invoice.findUnique.mockResolvedValueOnce({ balanceAmount: 40 });

    await expect(
      service.createCashPayment({ invoiceId: 1, amount: 60 }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.integrationOutboundRequest.upsert).not.toHaveBeenCalled();
  });

  it('uses compare-and-set so a duplicate M-Pesa callback has no second effect', async () => {
    const { service, prisma, tx } = setup({
      mpesaTransitionCounts: [1, 0],
    });
    const pending = {
      id: 30,
      receiptNumber: 'MPS-30',
      invoiceId: 1,
      facilityId: 10,
      branchId: 11,
      amount: 60,
      paymentMethod: 'MPESA',
      statusCode: 'PENDING',
      merchantRequestId: 'merchant-1',
      checkoutRequestId: 'checkout-1',
    };
    prisma.payment.findFirst
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(null);

    await service.confirmMpesaPayment(
      { checkoutRequestId: 'checkout-1', mpesaReceiptNumber: 'ABC123' },
      undefined,
      'CALLBACK',
    );
    const duplicate = await service.confirmMpesaPayment(
      { checkoutRequestId: 'checkout-1', mpesaReceiptNumber: 'ABC123' },
      undefined,
      'CALLBACK',
    );

    expect(tx.payment.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.invoice.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.integrationOutboundRequest.upsert).toHaveBeenCalledTimes(1);
    expect(duplicate).toMatchObject({ message: 'Payment already confirmed' });
  });
});
