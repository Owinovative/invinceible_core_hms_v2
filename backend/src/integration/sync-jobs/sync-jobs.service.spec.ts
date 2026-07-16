import { SyncJobsService } from './sync-jobs.service';

describe('SyncJobsService', () => {
  function build(params?: {
    dhaEnabled?: boolean;
    terminologyEnabled?: boolean;
    claims?: Array<{ id: number }>;
  }) {
    const prisma = {
      shaClaim: {
        findMany: jest.fn().mockResolvedValue(params?.claims ?? []),
      },
    };
    const dhaService = {
      pollClaimStatus: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      dhaEnabled: params?.dhaEnabled ?? true,
      terminologyEnabled: params?.terminologyEnabled ?? true,
    };
    const terminologySync = {
      synchronizeSystem: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SyncJobsService(
      prisma as never,
      dhaService as never,
      config as never,
      terminologySync as never,
    );
    return { service, prisma, dhaService, terminologySync };
  }

  it('does not poll claims while DHA is disabled', async () => {
    const { service, prisma } = build({ dhaEnabled: false });
    await service.pollShaClaimResponses();
    expect(prisma.shaClaim.findMany).not.toHaveBeenCalled();
  });

  it('polls every pending claim and isolates individual failures', async () => {
    const { service, dhaService } = build({
      claims: [{ id: 1 }, { id: 2 }],
    });
    dhaService.pollClaimStatus.mockRejectedValueOnce(new Error('offline'));

    await service.pollShaClaimResponses();

    expect(dhaService.pollClaimStatus).toHaveBeenNthCalledWith(1, 1);
    expect(dhaService.pollClaimStatus).toHaveBeenNthCalledWith(2, 2);
  });

  it('handles an empty claim queue and database failures safely', async () => {
    const empty = build();
    await expect(
      empty.service.pollShaClaimResponses(),
    ).resolves.toBeUndefined();

    const failing = build();
    failing.prisma.shaClaim.findMany.mockRejectedValue(new Error('db down'));
    await expect(
      failing.service.pollShaClaimResponses(),
    ).resolves.toBeUndefined();
  });

  it('does not synchronize terminology while disabled', async () => {
    const { service, terminologySync } = build({ terminologyEnabled: false });
    await service.synchronizeTerminology();
    expect(terminologySync.synchronizeSystem).not.toHaveBeenCalled();
  });

  it('synchronizes ICD-11 and LOINC incrementally', async () => {
    const { service, terminologySync } = build();
    await service.synchronizeTerminology();
    expect(terminologySync.synchronizeSystem.mock.calls).toEqual([
      ['ICD-11', 'latest', 'INCREMENTAL'],
      ['LOINC', 'latest', 'INCREMENTAL'],
    ]);
  });

  it('contains terminology synchronization failures', async () => {
    const { service, terminologySync } = build();
    terminologySync.synchronizeSystem.mockRejectedValueOnce(
      new Error('gateway unavailable'),
    );
    await expect(service.synchronizeTerminology()).resolves.toBeUndefined();
  });
});
