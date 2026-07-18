import { IntegrationStatusController } from './integration-status.controller';

describe('IntegrationStatusController', () => {
  const queueService = {
    getStats: jest.fn(),
  };
  const config = {
    dhaEnabled: true,
    dhaMode: 'sandbox',
    etimsEnabled: true,
    etimsMode: 'production',
  };
  const scope = {
    buildBranchScopeWhere: jest.fn().mockReturnValue({ facilityId: 9 }),
  };
  const user = {
    userId: 1,
    username: 'operator',
    roleId: 2,
    homeFacilityId: 9,
  };
  const controller = new IntegrationStatusController(
    queueService as never,
    config as never,
    scope as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the combined status expected by the frontend', async () => {
    queueService.getStats.mockResolvedValue([
      { integration: 'DHA', operation: 'CLAIM', status: 'PENDING', count: 2 },
      {
        integration: 'ETIMS',
        operation: 'INVOICE',
        status: 'SUCCEEDED',
        count: 4,
      },
    ]);

    const result = await controller.getStatus(user);

    expect(result).toEqual(
      expect.objectContaining({
        overall: 'syncing',
        queueDepth: 2,
        dha: expect.objectContaining({
          status: 'healthy',
          pendingJobs: 2,
          failedJobs: 0,
        }),
        sha: expect.objectContaining({ status: 'healthy' }),
        etims: expect.objectContaining({ status: 'healthy' }),
        lastUpdated: expect.any(String),
      }),
    );
    expect(queueService.getStats).toHaveBeenCalledWith(undefined, {
      facilityId: 9,
    });
  });

  it('reports dead-letter jobs as degraded', async () => {
    queueService.getStats.mockResolvedValue([
      {
        integration: 'ETIMS',
        operation: 'INVOICE',
        status: 'DEAD_LETTER',
        count: 1,
      },
    ]);

    const result = await controller.getStatus(user);

    expect(result.overall).toBe('warning');
    expect(result.etims).toEqual(
      expect.objectContaining({ status: 'degraded', failedJobs: 1 }),
    );
  });
});
