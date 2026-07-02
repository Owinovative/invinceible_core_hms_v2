import { IntegrationAuditService } from './integration-audit.service';
import { InMemoryPrisma } from './testing/in-memory-prisma';
import { makeConfig, makeLogger } from './testing/test-support';

describe('IntegrationConfigService', () => {
  it('defaults both integrations to disabled mock mode', () => {
    const config = makeConfig({
      ETIMS_ENABLED: '',
      DHA_ENABLED: '',
      ETIMS_MODE: '',
      DHA_MODE: '',
    });
    expect(config.etimsEnabled).toBe(false);
    expect(config.dhaEnabled).toBe(false);
    expect(config.etimsMode).toBe('mock');
    expect(config.dhaMode).toBe('mock');
    expect(config.anyIntegrationEnabled).toBe(false);
  });

  it('parses modes case-insensitively and rejects unknown modes', () => {
    expect(makeConfig({ ETIMS_MODE: 'SANDBOX' }).etimsMode).toBe('sandbox');
    expect(makeConfig({ ETIMS_MODE: 'production' }).etimsMode).toBe(
      'production',
    );
    expect(makeConfig({ ETIMS_MODE: 'weird' }).etimsMode).toBe('mock');
  });

  it('applies numeric fallbacks for invalid values', () => {
    const config = makeConfig({
      ETIMS_TIMEOUT_MS: 'not-a-number',
      INTEGRATION_WORKER_POLL_MS: '-5',
    });
    expect(config.etimsTimeoutMs).toBe(15_000);
    expect(config.workerPollMs).toBe(5_000);
  });

  it('exposes typed integration settings', () => {
    const config = makeConfig();
    expect(config.etimsTin).toBe('P051234567X');
    expect(config.etimsBranchId).toBe('00');
    expect(config.etimsDefaultTaxCode).toBe('A');
    expect(config.etimsVatRatePercent).toBe(16);
    expect(config.etimsReceiptBaseUrl).toContain('etims-sbx.kra.go.ke');
    expect(config.dhaApiVersion).toBe('v1');
    expect(config.dhaFacilityCode).toBe('KMHFL-001');
    expect(config.retryBaseDelayMs).toBe(1000);
    expect(config.stuckRequestMs).toBe(600_000);
    expect(config.workerBatchSize).toBe(10);
    expect(config.workerEnabled).toBe(false);
    expect(config.anyIntegrationEnabled).toBe(true);
  });

  it('switches the receipt verification URL in production mode', () => {
    const config = makeConfig({ ETIMS_MODE: 'production' });
    expect(config.etimsReceiptBaseUrl).toContain('https://etims.kra.go.ke');
    const custom = makeConfig({
      ETIMS_RECEIPT_VERIFY_URL: 'https://custom.example/verify',
    });
    expect(custom.etimsReceiptBaseUrl).toBe('https://custom.example/verify');
  });
});

describe('IntegrationAuditService', () => {
  it('persists API call logs with truncated endpoints', async () => {
    const prisma = new InMemoryPrisma();
    const auditLog = { create: jest.fn().mockResolvedValue(undefined) };
    const audit = new IntegrationAuditService(
      prisma as never,
      auditLog as never,
      makeLogger(),
    );

    await audit.recordApiCall({
      integration: 'ETIMS',
      endpoint: `/x${'y'.repeat(400)}`,
      method: 'POST',
      requestId: 'r1',
      outcome: 'SUCCESS',
      latencyMs: 12.6,
      retryCount: 0,
    });

    const row = prisma.integrationApiLog.rows[0];
    expect(row.endpoint.length).toBeLessThanOrEqual(255);
    expect(row.latencyMs).toBe(13);
  });

  it('never throws when API log persistence fails', async () => {
    const prisma = {
      integrationApiLog: {
        create: jest.fn().mockRejectedValue(new Error('db down')),
      },
    };
    const audit = new IntegrationAuditService(
      prisma as never,
      { create: jest.fn() } as never,
      makeLogger(),
    );
    await expect(
      audit.recordApiCall({
        integration: 'DHA',
        endpoint: '/x',
        method: 'GET',
        requestId: 'r2',
        outcome: 'TIMEOUT',
        latencyMs: 1,
        retryCount: 2,
      }),
    ).resolves.toBeUndefined();
  });

  it('records business audit events through AuditLogService', async () => {
    const prisma = new InMemoryPrisma();
    const auditLog = { create: jest.fn().mockResolvedValue(undefined) };
    const audit = new IntegrationAuditService(
      prisma as never,
      auditLog as never,
      makeLogger(),
    );

    await audit.recordEvent({
      moduleName: 'ETIMS',
      actionName: 'INVOICE_ACCEPTED',
      entityType: 'ETIMS_INVOICE',
      entityId: '5',
      description: 'accepted',
      facilityId: 1,
      afterData: { cuInvoiceNumber: 'SDC/5' },
    });

    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: 'ETIMS',
        actionName: 'INVOICE_ACCEPTED',
        afterData: JSON.stringify({ cuInvoiceNumber: 'SDC/5' }),
      }),
    );
  });

  it('never throws when audit event persistence fails', async () => {
    const audit = new IntegrationAuditService(
      new InMemoryPrisma() as never,
      { create: jest.fn().mockRejectedValue(new Error('down')) } as never,
      makeLogger(),
    );
    await expect(
      audit.recordEvent({
        moduleName: 'DHA',
        actionName: 'X',
        entityType: 'Y',
        entityId: '1',
        description: 'd',
      }),
    ).resolves.toBeUndefined();
  });
});
