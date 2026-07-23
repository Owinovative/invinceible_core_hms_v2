import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';

describe('BillingService payment adjustment integrity', () => {
  it('serializes simultaneous refunds so they cannot exceed the payment', async () => {
    const completedAdjustments: Array<{ amount: number; statusCode: string }> =
      [];
    const payment = {
      id: 1,
      invoiceId: 2,
      facilityId: 3,
      branchId: 4,
      amount: 100,
      receiptNumber: 'CSH-1',
      statusCode: 'COMPLETED',
      adjustments: completedAdjustments,
      invoice: { id: 2 },
    };
    const invoice = {
      id: 2,
      discountAmount: 0,
      taxAmount: 0,
      settledAt: new Date(),
      items: [{ lineTotal: 100 }],
      payments: [
        {
          amount: 100,
          statusCode: 'COMPLETED',
          adjustments: completedAdjustments,
        },
      ],
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
      payment: {
        findUnique: jest.fn().mockImplementation(() =>
          Promise.resolve({
            ...payment,
            adjustments: [...completedAdjustments],
          }),
        ),
        update: jest.fn().mockResolvedValue(payment),
      },
      paymentAdjustment: {
        create: jest.fn().mockImplementation(({ data }) => {
          completedAdjustments.push({
            amount: Number(data.amount),
            statusCode: 'COMPLETED',
          });
          return Promise.resolve({ id: completedAdjustments.length, ...data });
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(invoice),
        update: jest.fn().mockResolvedValue(invoice),
      },
    };
    let transactionTail = Promise.resolve<unknown>(undefined);
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          facilityId: 3,
          branchId: 4,
        }),
      },
      $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => {
        const run = transactionTail.then(() => work(tx));
        transactionTail = run.catch(() => undefined);
        return run;
      }),
    };
    const scope = { assertBranchAccess: jest.fn() };
    const service = new BillingService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      scope as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const results = await Promise.allSettled([
      service.createPaymentAdjustment(
        1,
        { adjustmentType: 'REFUND', amount: 80, reason: 'First refund' },
        {
          userId: 10,
          username: 'cashier',
          roleId: 1,
          staffId: 11,
        },
      ),
      service.createPaymentAdjustment(
        1,
        { adjustmentType: 'REFUND', amount: 80, reason: 'Second refund' },
        {
          userId: 10,
          username: 'cashier',
          roleId: 1,
          staffId: 11,
        },
      ),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason).toBeInstanceOf(BadRequestException);
    expect(completedAdjustments).toHaveLength(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
