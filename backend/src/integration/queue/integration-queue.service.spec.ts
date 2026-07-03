import { IntegrationQueueService } from './integration-queue.service';
import { InMemoryPrisma } from '../testing/in-memory-prisma';
import { makeConfig, makeLogger } from '../testing/test-support';

describe('IntegrationQueueService', () => {
  let prisma: InMemoryPrisma;
  let queue: IntegrationQueueService;

  beforeEach(() => {
    prisma = new InMemoryPrisma();
    queue = new IntegrationQueueService(
      prisma as never,
      makeConfig(),
      makeLogger(),
    );
  });

  function enqueueParams(overrides: Record<string, unknown> = {}) {
    return {
      integration: 'ETIMS' as const,
      operation: 'SUBMIT_INVOICE',
      entityType: 'ETIMS_INVOICE',
      entityId: '1',
      payload: { etimsInvoiceId: 1 },
      idempotencyKey: 'etims:submit:1',
      correlationId: 'corr-1',
      facilityId: 3,
      ...overrides,
    };
  }

  it('enqueues a request as PENDING and due immediately', async () => {
    const result = await queue.enqueue(enqueueParams());
    expect(result.queued).toBe(true);

    const rows = prisma.integrationOutboundRequest.rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'PENDING',
      attemptCount: 0,
      integration: 'ETIMS',
      idempotencyKey: 'etims:submit:1',
    });
    expect(rows[0].nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('rejects duplicate idempotency keys without creating a second row', async () => {
    await queue.enqueue(enqueueParams());
    const duplicate = await queue.enqueue(enqueueParams());

    expect(duplicate.queued).toBe(false);
    expect(duplicate).toMatchObject({ reason: 'DUPLICATE', requestId: 1 });
    expect(prisma.integrationOutboundRequest.rows).toHaveLength(1);
  });

  it('applies the integration-specific default retry budget', async () => {
    await queue.enqueue(enqueueParams());
    await queue.enqueue(
      enqueueParams({
        integration: 'DHA',
        idempotencyKey: 'dha:claim:1',
      }),
    );
    // Test config caps both at 3 attempts.
    expect(prisma.integrationOutboundRequest.rows[0].maxAttempts).toBe(3);
    expect(prisma.integrationOutboundRequest.rows[1].maxAttempts).toBe(3);
  });

  it('claims due requests atomically and skips already-claimed rows', async () => {
    await queue.enqueue(enqueueParams());
    await queue.enqueue(enqueueParams({ idempotencyKey: 'etims:submit:2' }));

    const first = await queue.claimBatch(10);
    expect(first).toHaveLength(2);
    expect(
      prisma.integrationOutboundRequest.rows.every(
        (row) => row.status === 'PROCESSING',
      ),
    ).toBe(true);

    // Nothing left to claim.
    expect(await queue.claimBatch(10)).toHaveLength(0);
  });

  it('does not claim requests scheduled in the future', async () => {
    await queue.enqueue(enqueueParams());
    await prisma.integrationOutboundRequest.updateMany({
      where: { id: 1 },
      data: { nextAttemptAt: new Date(Date.now() + 60_000) },
    });
    expect(await queue.claimBatch(10)).toHaveLength(0);
  });

  it('marks success with completion timestamp and clears the error', async () => {
    await queue.enqueue(enqueueParams());
    await queue.claimBatch(1);
    await queue.markSucceeded(1);

    const row = prisma.integrationOutboundRequest.rows[0];
    expect(row.status).toBe('SUCCEEDED');
    expect(row.completedAt).toBeInstanceOf(Date);
    expect(row.lastError).toBeNull();
  });

  it('schedules an exponentially backed-off retry on failure', async () => {
    await queue.enqueue(enqueueParams());
    await queue.claimBatch(1);

    const before = Date.now();
    const outcome = await queue.markFailed(1, {
      error: 'connect ECONNREFUSED',
      httpStatus: undefined,
    });

    expect(outcome).toEqual({ status: 'PENDING', attemptCount: 1 });
    const row = prisma.integrationOutboundRequest.rows[0];
    expect(row.status).toBe('PENDING');
    expect(row.lastError).toContain('ECONNREFUSED');
    // Base delay 1000ms with 20% jitter.
    expect(row.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 700);
  });

  it('dead-letters a request once the retry budget is exhausted', async () => {
    await queue.enqueue(enqueueParams({ maxAttempts: 2 }));

    await queue.claimBatch(1);
    await queue.markFailed(1, { error: 'boom' });
    await queue.claimBatch(0); // nothing due yet; force due for the test
    await prisma.integrationOutboundRequest.updateMany({
      where: { id: 1 },
      data: { nextAttemptAt: new Date(0) },
    });
    await queue.claimBatch(1);
    const outcome = await queue.markFailed(1, {
      error: 'boom',
      httpStatus: 503,
    });

    expect(outcome.status).toBe('DEAD_LETTER');
    expect(prisma.integrationOutboundRequest.rows[0].lastHttpStatus).toBe(503);
  });

  it('dead-letters immediately on permanent failures', async () => {
    await queue.enqueue(enqueueParams());
    await queue.claimBatch(1);
    const outcome = await queue.markFailed(1, {
      error: 'validation failed',
      permanent: true,
    });
    expect(outcome.status).toBe('DEAD_LETTER');
    expect(outcome.attemptCount).toBe(1);
  });

  it('handles markFailed for missing rows gracefully', async () => {
    expect(await queue.markFailed(999, { error: 'gone' })).toEqual({
      status: 'MISSING',
      attemptCount: 0,
    });
  });

  it('recovers stuck PROCESSING rows after a crash', async () => {
    await queue.enqueue(enqueueParams());
    await queue.claimBatch(1);
    // Simulate a crash: the row stays PROCESSING with an old update time.
    prisma.integrationOutboundRequest.rows[0].updatedAt = new Date(
      Date.now() - 3_600_000,
    );

    const recovered = await queue.recoverStuckRequests();
    expect(recovered).toBe(1);
    expect(prisma.integrationOutboundRequest.rows[0].status).toBe('PENDING');

    // Fresh PROCESSING rows are untouched.
    await queue.claimBatch(1);
    expect(await queue.recoverStuckRequests()).toBe(0);
  });

  it('requeues dead letters with a fresh retry budget', async () => {
    await queue.enqueue(enqueueParams());
    await queue.claimBatch(1);
    await queue.markFailed(1, { error: 'fatal', permanent: true });

    expect(await queue.requeueDeadLetter(1)).toBe(true);
    const row = prisma.integrationOutboundRequest.rows[0];
    expect(row.status).toBe('PENDING');
    expect(row.attemptCount).toBe(0);
    expect(row.lastError).toBeNull();

    // Only DEAD_LETTER rows can be requeued.
    expect(await queue.requeueDeadLetter(1)).toBe(false);
  });

  it('reports queue statistics grouped by integration and status', async () => {
    await queue.enqueue(enqueueParams());
    await queue.enqueue(
      enqueueParams({ integration: 'DHA', idempotencyKey: 'dha:1' }),
    );
    const stats = await queue.getStats();
    expect(stats).toEqual(
      expect.arrayContaining([
        { integration: 'ETIMS', status: 'PENDING', count: 1 },
        { integration: 'DHA', status: 'PENDING', count: 1 },
      ]),
    );
  });

  it('lists dead letters most recently updated first', async () => {
    await queue.enqueue(enqueueParams());
    await queue.claimBatch(1);
    await queue.markFailed(1, { error: 'fatal', permanent: true });

    const deadLetters = await queue.listDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0].status).toBe('DEAD_LETTER');
  });
});
