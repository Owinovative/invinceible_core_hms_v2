import { EtimsController } from './etims.controller';
import type { EtimsService } from './etims.service';
import type { IntegrationQueueService } from '../queue/integration-queue.service';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import type { RequestWithContext } from '../../resilience/request-context.middleware';
import { makeConfig } from '../testing/test-support';

describe('EtimsController', () => {
  const etimsService = {
    onBillingFinalized: jest.fn().mockResolvedValue({ skipped: false }),
    getInvoiceFiscalStatus: jest.fn().mockResolvedValue({ documents: [] }),
    createCreditNote: jest.fn().mockResolvedValue({ id: 1 }),
    createDebitNote: jest.fn().mockResolvedValue({ id: 2 }),
    cancelInvoice: jest.fn().mockResolvedValue({}),
    syncNow: jest.fn().mockResolvedValue({ processed: 0, failed: 0 }),
  };
  const queueService = {
    getStats: jest.fn().mockResolvedValue([]),
    listDeadLetters: jest.fn().mockResolvedValue([]),
    requeueDeadLetter: jest.fn().mockResolvedValue(true),
  };
  const controller = new EtimsController(
    etimsService as unknown as EtimsService,
    queueService as unknown as IntegrationQueueService,
    makeConfig(),
  );
  const user = { userId: 7, staffId: 3 } as RequestUser;
  const req = { requestId: 'req-123' } as RequestWithContext;

  beforeEach(() => jest.clearAllMocks());

  it('reports integration status with queue stats', async () => {
    const status = await controller.getStatus();
    expect(status).toEqual({ enabled: true, mode: 'mock', queue: [] });
  });

  it('returns fiscal status per invoice', async () => {
    await controller.getInvoiceFiscalStatus(12);
    expect(etimsService.getInvoiceFiscalStatus).toHaveBeenCalledWith(12);
  });

  it('submits an invoice manually with actor context', async () => {
    await controller.submitInvoice(12, user, req);
    expect(etimsService.onBillingFinalized).toHaveBeenCalledWith(12, {
      correlationId: 'req-123',
      trigger: 'MANUAL_SUBMIT',
      actorUserId: 7,
      actorStaffId: 3,
    });
  });

  it('creates credit and debit notes', async () => {
    await controller.createCreditNote(
      12,
      { reason: 'refund', itemIds: [1] },
      user,
      req,
    );
    expect(etimsService.createCreditNote).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ reason: 'refund', itemIds: [1] }),
    );

    await controller.createDebitNote(12, { reason: 'extra' }, user, req);
    expect(etimsService.createDebitNote).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ reason: 'extra' }),
    );
  });

  it('cancels invoices and triggers sync', async () => {
    await controller.cancelInvoice(12, { reason: 'wrong patient' }, user, req);
    expect(etimsService.cancelInvoice).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ reason: 'wrong patient' }),
    );

    await controller.syncNow();
    expect(etimsService.syncNow).toHaveBeenCalled();
  });

  it('exposes dead-letter listing and requeue', async () => {
    await controller.listDeadLetters('5');
    expect(queueService.listDeadLetters).toHaveBeenCalledWith(5);
    await controller.listDeadLetters(undefined);
    expect(queueService.listDeadLetters).toHaveBeenCalledWith(undefined);

    expect(await controller.requeue(9)).toEqual({ requeued: true });
    expect(queueService.requeueDeadLetter).toHaveBeenCalledWith(9);
  });
});
