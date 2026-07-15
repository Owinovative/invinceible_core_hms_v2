import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { RequestUser } from './interfaces/request-user.interface';
import { IpdService } from '../ipd/ipd.service';
import { IpdClinicalService } from '../ipd-clinical/ipd-clinical.service';
import { WorkflowController } from '../workflows/integration/workflow.controller';
import { IntegrationQueueService } from '../integration/queue/integration-queue.service';

jest.mock('uuid', () => ({ v4: () => 'test-event-id' }));

const facilityUser: RequestUser = {
  userId: 41,
  username: 'facility-one-user',
  roleId: 3,
  roleCode: 'ADMIN',
  homeFacilityId: 1,
  homeBranchId: 10,
  allowedBranchIds: [10],
  canAccessAllBranchesInFacility: false,
};

const readScope = { facilityId: 1, branchId: { in: [10] } };

describe('cross-facility scope enforcement', () => {
  it('puts facility and branch scope in the IPD admission database query', async () => {
    const admissionFindFirst = jest.fn().mockResolvedValue(null);
    const prisma = { admission: { findFirst: admissionFindFirst } };
    const scope = { buildReadScope: jest.fn().mockReturnValue(readScope) };
    const unused = {};
    const service = new IpdService(
      prisma as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      scope as never,
      unused as never,
    );

    await expect(
      service.getAdmissionByIdScoped(9002, facilityUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(admissionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9002, ...readScope },
      }),
    );
  });

  it('blocks IPD clinical writes before creating data for an inaccessible admission', async () => {
    const denied = new NotFoundException('Admission not found');
    const ipd = { getAdmissionByIdScoped: jest.fn().mockRejectedValue(denied) };
    const create = jest.fn();
    const service = new IpdClinicalService(
      { ipdProgressNote: { create } } as never,
      ipd as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createProgressNote(
        { admissionId: 9002, noteType: 'CLINICAL', noteText: 'private' },
        facilityUser,
      ),
    ).rejects.toBe(denied);
    expect(ipd.getAdmissionByIdScoped).toHaveBeenCalledWith(9002, facilityUser);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a workflow facilityId outside the authenticated facility', async () => {
    const findMany = jest.fn();
    const prisma = { workflowInstance: { findMany } };
    const scope = {
      buildFacilityScopeWhere: jest.fn().mockReturnValue({ facilityId: 1 }),
    };
    const unused = {};
    const controller = new WorkflowController(
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      prisma as never,
      scope as never,
    );

    await expect(
      controller.getInstances(facilityUser, '2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('adds facility and branch scope to dead-letter reads and requeues', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      integrationOutboundRequest: { findMany, updateMany },
    };
    const scope = { buildReadScope: jest.fn().mockReturnValue(readScope) };
    const service = new IntegrationQueueService(
      prisma as never,
      {} as never,
      {} as never,
      scope as never,
    );

    await service.listDeadLettersScoped(facilityUser);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining(readScope),
      }),
    );

    await service.requeueDeadLetterScoped(77, facilityUser);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 77, ...readScope }),
      }),
    );
  });
});
