import { BadRequestException } from '@nestjs/common';
import { EtimsService } from './etims.service';
import { EtimsInvoiceBuilder } from './etims-invoice.builder';
import { EtimsMockClient } from './adapters/etims-mock.client';
import { EtimsApiError, type EtimsClientPort } from './etims.types';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import { IntegrationQueueWorker } from '../queue/integration-queue.worker';
import {
  InMemoryPrisma,
  seedBillingScenario,
} from '../testing/in-memory-prisma';
import { makeAudit, makeConfig, makeLogger } from '../testing/test-support';

describe('EtimsService', () => {
  let prisma: InMemoryPrisma;
  let queue: IntegrationQueueService;
  let worker: IntegrationQueueWorker;
  let client: EtimsClientPort;
  let service: EtimsService;
  let invoiceId: number;

  function buildService(
    overrides: Record<string, string> = {},
    clientOverride?: EtimsClientPort,
  ) {
    const config = makeConfig(overrides);
    const logger = makeLogger();
    queue = new IntegrationQueueService(prisma as never, config, logger);
    worker = new IntegrationQueueWorker(queue, config, logger);
    client = clientOverride ?? new EtimsMockClient();
    service = new EtimsService(
      prisma as never,
      config,
      queue,
      worker,
      new EtimsInvoiceBuilder(),
      makeAudit(prisma),
      logger,
      client,
    );
    service.onModuleInit();
    return service;
  }

  beforeEach(async () => {
    prisma = new InMemoryPrisma();
    const seeded = await seedBillingScenario(prisma);
    invoiceId = seeded.invoice.id;
    buildService();
  });

  afterEach(() => {
    worker.stop();
  });

  async function fiscalizeAndProcess() {
    const outcome = await service.onBillingFinalized(invoiceId, {
      trigger: 'CASH_PAYMENT',
      correlationId: 'corr-test',
    });
    await worker.runOnce();
    return outcome;
  }

  describe('onBillingFinalized', () => {
    it('is a no-op when eTIMS is disabled (backward compatible)', async () => {
      buildService({ ETIMS_ENABLED: 'false' });
      const outcome = await service.onBillingFinalized(invoiceId);
      expect(outcome).toEqual({ skipped: true, reason: 'ETIMS_DISABLED' });
      expect(prisma.etimsInvoice.rows).toHaveLength(0);
    });

    it('creates a SALE document, queues it, and stores CU data on success', async () => {
      const outcome = await fiscalizeAndProcess();
      expect(outcome.skipped).toBe(false);

      const document = prisma.etimsInvoice.rows[0];
      expect(document.statusCode).toBe('ACCEPTED');
      expect(document.documentType).toBe('SALE');
      expect(document.traderInvoiceNumber).toBe('INV-000001');
      expect(document.cuInvoiceNumber).toBe(`SDC-MOCK-0001/${document.id}`);
      expect(document.cuReceiptNumber).toBe('1');
      expect(document.receiptSignature).toHaveLength(16);
      expect(document.internalData).toHaveLength(20);
      expect(document.qrCodeUrl).toContain(
        'indexEtimsReceiptData?Data=P051234567X00',
      );
      expect(document.qrCodeData).toMatch(/^data:image\/png;base64,/);
      expect(document.totalAmount).toBe(3500);
      expect(document.totalTaxAmount).toBe(0); // VAT-exempt medical services
      expect(document.acceptedAt).toBeInstanceOf(Date);

      const queueRow = prisma.integrationOutboundRequest.rows[0];
      expect(queueRow.status).toBe('SUCCEEDED');
    });

    it('does not create a second active SALE for the same invoice (duplicate guard)', async () => {
      await fiscalizeAndProcess();
      const second = await service.onBillingFinalized(invoiceId, {
        trigger: 'CLOSE_INVOICE',
      });

      expect(second.skipped).toBe(true);
      expect(second).toMatchObject({ reason: 'ALREADY_FISCALIZED' });
      expect(
        prisma.etimsInvoice.rows.filter((r) => r.documentType === 'SALE'),
      ).toHaveLength(1);
    });

    it('skips invoices without a positive total', async () => {
      await prisma.invoice.updateMany({
        where: { id: invoiceId },
        data: { totalAmount: 0 },
      });
      const outcome = await service.onBillingFinalized(invoiceId);
      expect(outcome).toEqual({ skipped: true, reason: 'NON_POSITIVE_TOTAL' });
    });

    it('rejects unknown invoices', async () => {
      await expect(service.onBillingFinalized(9999)).rejects.toThrow(
        /Invoice 9999 not found/,
      );
    });
  });

  describe('failure handling', () => {
    it('keeps the document queued and schedules a retry when KRA is unavailable', async () => {
      const downClient: EtimsClientPort = {
        initializeDevice: jest.fn(),
        submitSale: jest
          .fn()
          .mockRejectedValue(new EtimsApiError('eTIMS timeout', '999', true)),
        checkStatus: jest.fn(),
      };
      buildService({}, downClient);

      await service.onBillingFinalized(invoiceId);
      await worker.runOnce();

      const document = prisma.etimsInvoice.rows[0];
      expect(document.statusCode).toBe('QUEUED');
      expect(document.errorMessage).toContain('timeout');
      expect(document.attemptCount).toBe(1);

      const queueRow = prisma.integrationOutboundRequest.rows[0];
      expect(queueRow.status).toBe('PENDING'); // offline queue keeps it
      expect(queueRow.attemptCount).toBe(1);
    });

    it('recovers automatically once KRA comes back (offline sync)', async () => {
      let calls = 0;
      const flakyMock = new EtimsMockClient();
      const flakyClient: EtimsClientPort = {
        initializeDevice: () => flakyMock.initializeDevice(),
        submitSale: (payload) => {
          calls += 1;
          if (calls === 1) {
            return Promise.reject(
              new EtimsApiError('service unavailable', '999', true),
            );
          }
          return flakyMock.submitSale(payload);
        },
        checkStatus: (invcNo) => flakyMock.checkStatus(invcNo),
      };
      buildService({}, flakyClient);

      await service.onBillingFinalized(invoiceId);
      await worker.runOnce(); // fails
      await prisma.integrationOutboundRequest.updateMany({
        where: { id: 1 },
        data: { nextAttemptAt: new Date(0) },
      });
      await worker.runOnce(); // retries and succeeds

      expect(prisma.etimsInvoice.rows[0].statusCode).toBe('ACCEPTED');
      expect(prisma.integrationOutboundRequest.rows[0].status).toBe(
        'SUCCEEDED',
      );
    });

    it('marks KRA-rejected duplicates as REJECTED and dead-letters the request', async () => {
      const duplicateClient: EtimsClientPort = {
        initializeDevice: jest.fn(),
        submitSale: jest
          .fn()
          .mockRejectedValue(
            new EtimsApiError('Duplicate invoice number', '801', false),
          ),
        checkStatus: jest.fn(),
      };
      buildService({}, duplicateClient);

      await service.onBillingFinalized(invoiceId);
      await worker.runOnce();

      expect(prisma.etimsInvoice.rows[0].statusCode).toBe('REJECTED');
      expect(prisma.integrationOutboundRequest.rows[0].status).toBe(
        'DEAD_LETTER',
      );
    });

    it('skips submission if the document was already accepted (idempotent retry)', async () => {
      await fiscalizeAndProcess();
      const submitSpy = jest.spyOn(client, 'submitSale');
      await service.submitDocument(prisma.etimsInvoice.rows[0].id);
      expect(submitSpy).not.toHaveBeenCalled();
    });
  });

  describe('credit and debit notes', () => {
    it('issues a credit note referencing the accepted sale', async () => {
      await fiscalizeAndProcess();
      const note = await service.createCreditNote(invoiceId, {
        reason: 'Lab test billed twice',
      });
      await worker.runOnce();

      const stored = prisma.etimsInvoice.rows.find((r) => r.id === note.id);
      expect(stored?.documentType).toBe('CREDIT_NOTE');
      expect(stored?.receiptTypeCode).toBe('R');
      expect(stored?.statusCode).toBe('ACCEPTED');
      expect(stored?.originalId).toBe(prisma.etimsInvoice.rows[0].id);
      expect(stored?.traderInvoiceNumber).toBe('INV-000001-CN1');
    });

    it('supports partial credit notes for selected items', async () => {
      await fiscalizeAndProcess();
      const items = await prisma.invoiceItem.findMany({
        where: { invoiceId },
      });
      await service.createCreditNote(invoiceId, {
        reason: 'Refund one line',
        itemIds: [items[1].id],
      });
      await worker.runOnce();

      const note = prisma.etimsInvoice.rows.find(
        (r) => r.documentType === 'CREDIT_NOTE',
      );
      expect(note?.statusCode).toBe('ACCEPTED');
      expect(note?.totalAmount).toBe(2000);
    });

    it('issues a debit note for additional charges', async () => {
      await fiscalizeAndProcess();
      const note = await service.createDebitNote(invoiceId, {
        reason: 'Additional dressing charge',
      });
      await worker.runOnce();

      const stored = prisma.etimsInvoice.rows.find((r) => r.id === note.id);
      expect(stored?.documentType).toBe('DEBIT_NOTE');
      expect(stored?.receiptTypeCode).toBe('S');
      expect(stored?.traderInvoiceNumber).toBe('INV-000001-DN1');
    });

    it('refuses amendments when no accepted sale exists', async () => {
      await expect(
        service.createCreditNote(invoiceId, { reason: 'nothing to amend' }),
      ).rejects.toThrow(/no accepted eTIMS sale/);
    });

    it('requires a reason', async () => {
      await fiscalizeAndProcess();
      await expect(
        service.createCreditNote(invoiceId, { reason: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancellation', () => {
    it('cancels a fiscalized invoice via a full credit note', async () => {
      await fiscalizeAndProcess();
      const { cancelled, creditNote } = await service.cancelInvoice(invoiceId, {
        reason: 'Billed to the wrong patient',
      });
      await worker.runOnce();

      expect(cancelled.statusCode).toBe('CANCELLED');
      expect(cancelled.cancelReason).toBe('Billed to the wrong patient');
      const note = prisma.etimsInvoice.rows.find((r) => r.id === creditNote.id);
      expect(note?.documentType).toBe('CREDIT_NOTE');
      expect(note?.statusCode).toBe('ACCEPTED');
    });

    it('refuses to cancel twice', async () => {
      await fiscalizeAndProcess();
      await service.cancelInvoice(invoiceId, { reason: 'first' });
      await expect(
        service.cancelInvoice(invoiceId, { reason: 'second' }),
      ).rejects.toThrow(/already cancelled/);
    });

    it('requires a cancellation reason', async () => {
      await fiscalizeAndProcess();
      await expect(
        service.cancelInvoice(invoiceId, { reason: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('status and sync', () => {
    it('reports fiscal status for an invoice', async () => {
      await fiscalizeAndProcess();
      const status = await service.getInvoiceFiscalStatus(invoiceId);
      expect(status.enabled).toBe(true);
      expect(status.documents).toHaveLength(1);
      expect(status.documents[0]).toMatchObject({
        documentType: 'SALE',
        statusCode: 'ACCEPTED',
      });
    });

    it('refreshes CU-side document status', async () => {
      await fiscalizeAndProcess();
      const documentId = prisma.etimsInvoice.rows[0].id;
      const refreshed = await service.refreshDocumentStatus(documentId);
      expect(refreshed.remoteStatus.statusCode).toBe('ACCEPTED');
    });

    it('rejects status refresh for unknown documents', async () => {
      await expect(service.refreshDocumentStatus(555)).rejects.toThrow(
        /not found/,
      );
    });

    it('drains the queue on manual sync', async () => {
      await service.onBillingFinalized(invoiceId);
      const result = await service.syncNow();
      expect(result.processed).toBe(1);
      expect(prisma.etimsInvoice.rows[0].statusCode).toBe('ACCEPTED');
      expect(result.stats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ integration: 'ETIMS' }),
        ]),
      );
    });

    it('guards operational endpoints when disabled', async () => {
      buildService({ ETIMS_ENABLED: 'false' });
      await expect(service.syncNow()).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelInvoice(invoiceId, { reason: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
