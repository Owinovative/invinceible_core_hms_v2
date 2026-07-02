/**
 * End-to-end integration tests for the government-integration billing flow:
 *
 *   Bill finalized -> validation -> durable queue -> mock eTIMS -> CU data +
 *   QR stored -> (SHA workflow) -> DHA claim queued -> mock DHA -> response
 *   stored -> transaction complete.
 *
 * Uses the real EtimsService, DhaService, queue, worker, builder, and mock
 * adapters over an in-memory Prisma — the same object graph production uses,
 * with only the datastore and the external APIs replaced.
 */
import { DhaService } from './dha/dha.service';
import { DhaMockClient } from './dha/adapters/dha-mock.client';
import { FhirMapperService } from './dha/fhir-mapper';
import { EtimsMockClient } from './etims/adapters/etims-mock.client';
import { EtimsInvoiceBuilder } from './etims/etims-invoice.builder';
import { EtimsService } from './etims/etims.service';
import { IntegrationQueueService } from './queue/integration-queue.service';
import { IntegrationQueueWorker } from './queue/integration-queue.worker';
import {
  InMemoryPrisma,
  seedBillingScenario,
} from './testing/in-memory-prisma';
import { makeAudit, makeConfig, makeLogger } from './testing/test-support';

describe('Billing -> eTIMS -> DHA end-to-end flow', () => {
  let prisma: InMemoryPrisma;
  let worker: IntegrationQueueWorker;
  let etims: EtimsService;
  let dha: DhaService;
  let invoiceId: number;
  let facilityId: number;
  let patientId: number;

  beforeEach(async () => {
    prisma = new InMemoryPrisma();
    const seeded = await seedBillingScenario(prisma);
    invoiceId = seeded.invoice.id;
    facilityId = seeded.facility.id;
    patientId = seeded.patient.id;

    const config = makeConfig();
    const logger = makeLogger();
    const queue = new IntegrationQueueService(prisma as never, config, logger);
    worker = new IntegrationQueueWorker(queue, config, logger);
    etims = new EtimsService(
      prisma as never,
      config,
      queue,
      worker,
      new EtimsInvoiceBuilder(),
      makeAudit(prisma),
      logger,
      new EtimsMockClient(),
    );
    dha = new DhaService(
      prisma as never,
      config,
      queue,
      worker,
      new FhirMapperService(),
      makeAudit(prisma),
      logger,
      new DhaMockClient(),
    );
    etims.onModuleInit();
    dha.onModuleInit();
  });

  afterEach(() => worker.stop());

  it('runs the complete billing workflow through both integrations', async () => {
    // 1. Billing finalizes: patient pays -> fiscalization requested.
    const fiscal = await etims.onBillingFinalized(invoiceId, {
      trigger: 'CASH_PAYMENT',
      correlationId: 'flow-1',
    });
    expect(fiscal.skipped).toBe(false);

    // 2. SHA workflow applies: claim submitted -> DHA integration triggered.
    const claim = await prisma.shaClaim.create({
      data: {
        claimNumber: 'SHA-000009',
        statusCode: 'SUBMITTED',
        claimedAmount: 3500,
        patientId,
        facilityId,
        invoiceId,
        branchId: null,
      },
    });
    const claimOutcome = await dha.onShaClaimSubmitted(claim.id, {
      correlationId: 'flow-1',
    });
    expect(claimOutcome.skipped).toBe(false);

    // 3. One background worker pass drains both queues.
    const result = await worker.runOnce();
    expect(result).toEqual({ processed: 2, failed: 0 });

    // 4. Fiscal document completed with receipt data stored.
    const document = prisma.etimsInvoice.rows[0];
    expect(document.statusCode).toBe('ACCEPTED');
    expect(document.cuInvoiceNumber).toBeTruthy();
    expect(document.qrCodeData).toMatch(/^data:image\/png/);

    // 5. DHA transaction completed with the response stored.
    const transaction = prisma.dhaTransaction.rows[0];
    expect(transaction.statusCode).toBe('COMPLETED');
    expect(transaction.externalRef).toMatch(/^CLM-MOCK-/);
    expect(transaction.responsePayload).toEqual({ mock: true });

    // 6. Both outbound requests audited as succeeded.
    expect(
      prisma.integrationOutboundRequest.rows.map((row) => row.status),
    ).toEqual(['SUCCEEDED', 'SUCCEEDED']);
  });

  it('finalizing the same bill twice never double-fiscalizes (duplicate invoice)', async () => {
    await etims.onBillingFinalized(invoiceId, { trigger: 'CASH_PAYMENT' });
    await etims.onBillingFinalized(invoiceId, { trigger: 'CLOSE_INVOICE' });
    await worker.runOnce();

    expect(
      prisma.etimsInvoice.rows.filter((row) => row.documentType === 'SALE'),
    ).toHaveLength(1);
    expect(prisma.integrationOutboundRequest.rows).toHaveLength(1);
  });

  it('keeps billing unblocked while offline and syncs automatically later', async () => {
    // Replace the eTIMS client with one that is initially down.
    const mock = new EtimsMockClient();
    let down = true;
    const flaky = {
      initializeDevice: () => mock.initializeDevice(),
      submitSale: (payload: never) =>
        down
          ? Promise.reject(new Error('ETIMDOWN: connect ETIMEDOUT'))
          : mock.submitSale(payload),
      checkStatus: (invcNo: number) => mock.checkStatus(invcNo),
    };
    const config = makeConfig();
    const logger = makeLogger();
    const queue = new IntegrationQueueService(prisma as never, config, logger);
    worker.stop();
    worker = new IntegrationQueueWorker(queue, config, logger);
    etims = new EtimsService(
      prisma as never,
      config,
      queue,
      worker,
      new EtimsInvoiceBuilder(),
      makeAudit(prisma),
      logger,
      flaky as never,
    );
    etims.onModuleInit();

    // Billing completes instantly even though KRA is unreachable.
    const outcome = await etims.onBillingFinalized(invoiceId, {
      trigger: 'MPESA_PAYMENT',
    });
    expect(outcome.skipped).toBe(false);

    // Worker attempt fails; the request stays in the offline queue.
    await worker.runOnce();
    expect(prisma.integrationOutboundRequest.rows[0].status).toBe('PENDING');
    expect(prisma.etimsInvoice.rows[0].statusCode).toBe('QUEUED');

    // Connectivity returns; the scheduled retry fires and recovers.
    down = false;
    await prisma.integrationOutboundRequest.updateMany({
      where: { id: 1 },
      data: { nextAttemptAt: new Date(0) },
    });
    await worker.runOnce();

    expect(prisma.etimsInvoice.rows[0].statusCode).toBe('ACCEPTED');
    expect(prisma.integrationOutboundRequest.rows[0].status).toBe('SUCCEEDED');
  });

  it('records every external API interaction in the audit tables', async () => {
    await etims.onBillingFinalized(invoiceId, { trigger: 'CASH_PAYMENT' });
    await worker.runOnce();

    // The mock adapters bypass HTTP, but the queue + document trail must be
    // complete: outbound request row and fiscal document with attempts.
    const request = prisma.integrationOutboundRequest.rows[0];
    expect(request.completedAt).toBeInstanceOf(Date);
    expect(prisma.etimsInvoice.rows[0].attemptCount).toBe(1);
    expect(prisma.etimsInvoice.rows[0].lastAttemptAt).toBeInstanceOf(Date);
  });
});
