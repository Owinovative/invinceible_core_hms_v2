import { BadRequestException } from '@nestjs/common';
import { LabService } from './lab.service';

describe('LabService external billing integrity', () => {
  it('serializes simultaneous payments so they cannot exceed the referral balance', async () => {
    let paidAmount = 0;
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
      externalLabReferral: {
        findUniqueOrThrow: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: 1,
            facilityId: 1,
            branchId: 2,
            totalAmount: 100,
            paidAmount,
            balanceAmount: 100 - paidAmount,
          }),
        ),
        update: jest.fn().mockImplementation(({ data }) => {
          paidAmount = Number(data.paidAmount);
          return Promise.resolve({ id: 1, ...data });
        }),
      },
      externalLabPayment: {
        create: jest.fn().mockResolvedValue({ id: 10 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    let transactionTail = Promise.resolve<unknown>(undefined);
    const prisma = {
      externalLabReferral: {
        findUnique: jest.fn().mockResolvedValue({
          facilityId: 1,
          branchId: 2,
        }),
      },
      $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => {
        const run = transactionTail.then(() => work(tx));
        transactionTail = run.catch(() => undefined);
        return run;
      }),
    };
    const scope = { assertBranchAccess: jest.fn() };
    const service = new LabService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      scope as never,
      {} as never,
      {} as never,
    );
    const user = {
      userId: 1,
      username: 'cashier',
      roleId: 1,
      staffId: 2,
    };

    const results = await Promise.allSettled([
      service.createExternalLabPayment(
        1,
        { amount: 80, paymentMethod: 'CASH' },
        user,
      ),
      service.createExternalLabPayment(
        1,
        { amount: 80, paymentMethod: 'CASH' },
        user,
      ),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason).toBeInstanceOf(BadRequestException);
    expect(tx.externalLabPayment.create).toHaveBeenCalledTimes(1);
    expect(paidAmount).toBe(80);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
