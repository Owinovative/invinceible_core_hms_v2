import { CommunicationSchedulerService } from './communication-scheduler.service';

describe('CommunicationSchedulerService', () => {
  it('queues payment and receipt notifications after a completed payment', async () => {
    const prisma = {
      labResult: { findMany: jest.fn().mockResolvedValue([]) },
      externalLabResult: { findMany: jest.fn().mockResolvedValue([]) },
      payment: {
        findMany: jest.fn().mockResolvedValue([
          {
            facilityId: 1,
            branchId: 2,
            receiptNumber: 'RCT-1',
            amount: 500,
            invoice: {
              patientId: 3,
              invoiceNumber: 'INV-1',
              patient: {
                firstName: 'Amina',
                lastName: 'Demo',
                phonePrimary: '+254700000001',
              },
            },
          },
        ]),
      },
      dentalEncounter: { findMany: jest.fn().mockResolvedValue([]) },
      orthopedicCase: { findMany: jest.fn().mockResolvedValue([]) },
      prescription: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const communication = {
      queueMessage: jest.fn().mockResolvedValue({ queued: true }),
    };
    const scheduler = new CommunicationSchedulerService(
      prisma as never,
      communication as never,
      { isEnabled: jest.fn().mockReturnValue(true) } as never,
      { warn: jest.fn() } as never,
      { get: jest.fn().mockReturnValue('false') } as never,
    );

    await scheduler.queueClinicalAndFinancialNotifications();

    expect(communication.queueMessage).toHaveBeenCalledTimes(2);
    expect(communication.queueMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'PAYMENT_CONFIRMATION',
        recipient: '+254700000001',
      }),
    );
    expect(communication.queueMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'INVOICE_RECEIPT_READY',
        recipient: '+254700000001',
      }),
    );
  });

  it('does not run schedulers inside the dedicated queue worker', async () => {
    const prisma = {
      payment: { findMany: jest.fn() },
    };
    const scheduler = new CommunicationSchedulerService(
      prisma as never,
      { queueMessage: jest.fn() } as never,
      { isEnabled: jest.fn().mockReturnValue(true) } as never,
      { warn: jest.fn() } as never,
      { get: jest.fn().mockReturnValue('true') } as never,
    );

    await scheduler.queueClinicalAndFinancialNotifications();

    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });
});
