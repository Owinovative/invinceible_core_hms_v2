import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { QueueService } from './queue.service';

describe('QueueService active workflow statuses', () => {
  const user: RequestUser = {
    userId: 1,
    username: 'doctor',
    roleId: 1,
    roleCode: 'DOCTOR',
    homeFacilityId: 7,
    homeBranchId: 3,
    canAccessAllBranchesInFacility: false,
    allowedBranchIds: [3],
  };

  it('includes READY_FOR_DOCTOR appointments in the active daily queue', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { appointment: { findMany } };
    const scope = {
      buildReadScope: jest
        .fn()
        .mockReturnValue({ facilityId: 7, branchId: { in: [3] } }),
    };
    const service = new QueueService(prisma as never, scope as never);

    await service.getTodayQueueScoped(user);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId: 7,
          branchId: { in: [3] },
          statusCode: {
            in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR', 'IN_CONSULTATION'],
          },
        }),
      }),
    );
  });

  it('reports ready-for-doctor patients as waiting and exposes inProgress', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(8);
    const prisma = { appointment: { count } };
    const scope = {
      buildReadScope: jest.fn().mockReturnValue({ facilityId: 7 }),
    };
    const service = new QueueService(prisma as never, scope as never);

    await expect(service.getQueueStatsScoped(user)).resolves.toEqual({
      total: 4,
      waiting: 3,
      inProgress: 1,
      inConsultation: 1,
      completed: 8,
    });
    expect(count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          statusCode: {
            in: ['BOOKED', 'CHECKED_IN', 'READY_FOR_DOCTOR'],
          },
        }),
      }),
    );
  });
});
