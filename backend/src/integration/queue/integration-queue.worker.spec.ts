import { IntegrationQueueService } from './integration-queue.service';
import { IntegrationQueueWorker } from './integration-queue.worker';
import { NonRetryableIntegrationError } from '../integration.types';
import { InMemoryPrisma } from '../testing/in-memory-prisma';
import { makeConfig, makeLogger } from '../testing/test-support';

describe('IntegrationQueueWorker', () => {
  let prisma: InMemoryPrisma;
  let queue: IntegrationQueueService;
  let worker: IntegrationQueueWorker;

  beforeEach(() => {
    prisma = new InMemoryPrisma();
    const config = makeConfig();
    queue = new IntegrationQueueService(prisma as never, config, makeLogger());
    worker = new IntegrationQueueWorker(queue, config, makeLogger());
  });

  afterEach(() => {
    worker.stop();
  });

  async function enqueue(operation = 'SUBMIT_INVOICE', key = 'k1') {
    await queue.enqueue({
      integration: 'ETIMS',
      operation,
      entityType: 'ETIMS_INVOICE',
      entityId: '1',
      payload: { etimsInvoiceId: 1 },
      idempotencyKey: key,
    });
  }

  it('dispatches claimed requests to the registered handler', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    worker.registerHandler('ETIMS', 'SUBMIT_INVOICE', handler);
    await enqueue();

    const result = await worker.runOnce();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        integration: 'ETIMS',
        operation: 'SUBMIT_INVOICE',
        payload: { etimsInvoiceId: 1 },
      }),
    );
    expect(prisma.integrationOutboundRequest.rows[0].status).toBe('SUCCEEDED');
  });

  it('dead-letters requests that have no registered handler', async () => {
    await enqueue('UNKNOWN_OPERATION');

    const result = await worker.runOnce();

    expect(result).toEqual({ processed: 0, failed: 1 });
    const row = prisma.integrationOutboundRequest.rows[0];
    expect(row.status).toBe('DEAD_LETTER');
    expect(row.lastError).toContain('No handler registered');
  });

  it('schedules a retry when the handler fails transiently', async () => {
    worker.registerHandler('ETIMS', 'SUBMIT_INVOICE', () =>
      Promise.reject(new Error('KRA unavailable')),
    );
    await enqueue();

    const result = await worker.runOnce();

    expect(result).toEqual({ processed: 0, failed: 1 });
    const row = prisma.integrationOutboundRequest.rows[0];
    expect(row.status).toBe('PENDING');
    expect(row.attemptCount).toBe(1);
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('dead-letters immediately when the handler raises a non-retryable error', async () => {
    worker.registerHandler('ETIMS', 'SUBMIT_INVOICE', () =>
      Promise.reject(new NonRetryableIntegrationError('duplicate invoice')),
    );
    await enqueue();

    await worker.runOnce();

    expect(prisma.integrationOutboundRequest.rows[0].status).toBe(
      'DEAD_LETTER',
    );
  });

  it('recovers a failed request end-to-end after requeue (queue recovery)', async () => {
    let attempts = 0;
    worker.registerHandler('ETIMS', 'SUBMIT_INVOICE', () => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error('network interruption'))
        : Promise.resolve();
    });
    await enqueue();

    await worker.runOnce();
    expect(prisma.integrationOutboundRequest.rows[0].status).toBe('PENDING');

    // Make the retry due now, as the backoff timer would.
    await prisma.integrationOutboundRequest.updateMany({
      where: { id: 1 },
      data: { nextAttemptAt: new Date(0) },
    });
    const second = await worker.runOnce();

    expect(second).toEqual({ processed: 1, failed: 0 });
    expect(prisma.integrationOutboundRequest.rows[0].status).toBe('SUCCEEDED');
    expect(attempts).toBe(2);
  });

  it('processes requests across integrations independently', async () => {
    const etimsHandler = jest.fn().mockResolvedValue(undefined);
    const dhaHandler = jest.fn().mockResolvedValue(undefined);
    worker.registerHandler('ETIMS', 'SUBMIT_INVOICE', etimsHandler);
    worker.registerHandler('DHA', 'SUBMIT_CLAIM', dhaHandler);

    await enqueue('SUBMIT_INVOICE', 'etims-1');
    await queue.enqueue({
      integration: 'DHA',
      operation: 'SUBMIT_CLAIM',
      entityType: 'DHA_TRANSACTION',
      entityId: '9',
      payload: { dhaTransactionId: 9 },
      idempotencyKey: 'dha-9',
    });

    const result = await worker.runOnce();
    expect(result).toEqual({ processed: 2, failed: 0 });
    expect(etimsHandler).toHaveBeenCalledTimes(1);
    expect(dhaHandler).toHaveBeenCalledTimes(1);
  });

  it('starts polling only when integrations are enabled', () => {
    const disabledConfig = makeConfig({
      ETIMS_ENABLED: 'false',
      DHA_ENABLED: 'false',
      INTEGRATION_WORKER_ENABLED: 'true',
    });
    const idleWorker = new IntegrationQueueWorker(
      queue,
      disabledConfig,
      makeLogger(),
    );
    idleWorker.onModuleInit();
    expect(
      (idleWorker as unknown as { timer?: unknown }).timer,
    ).toBeUndefined();

    const enabledConfig = makeConfig({
      INTEGRATION_WORKER_ENABLED: 'true',
    });
    const activeWorker = new IntegrationQueueWorker(
      queue,
      enabledConfig,
      makeLogger(),
    );
    activeWorker.onModuleInit();
    expect(
      (activeWorker as unknown as { timer?: unknown }).timer,
    ).toBeDefined();
    activeWorker.onModuleDestroy();
    expect(
      (activeWorker as unknown as { timer?: unknown }).timer,
    ).toBeUndefined();
  });

  it('start() is idempotent', () => {
    worker.start();
    const timer = (worker as unknown as { timer?: unknown }).timer;
    worker.start();
    expect((worker as unknown as { timer?: unknown }).timer).toBe(timer);
  });
});
