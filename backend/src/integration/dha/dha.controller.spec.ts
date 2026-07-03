import { DhaController } from './dha.controller';
import type { DhaService } from './dha.service';
import type { IntegrationQueueService } from '../queue/integration-queue.service';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import type { RequestWithContext } from '../../resilience/request-context.middleware';
import { makeConfig } from '../testing/test-support';

describe('DhaController', () => {
  const dhaService = {
    verifyPatient: jest.fn().mockResolvedValue({}),
    verifyPractitioner: jest.fn().mockResolvedValue({}),
    verifyFacility: jest.fn().mockResolvedValue({}),
    checkEligibility: jest.fn().mockResolvedValue({}),
    recordConsent: jest.fn().mockResolvedValue({}),
    submitReferral: jest.fn().mockResolvedValue({}),
    submitEncounterForConsultation: jest.fn().mockResolvedValue({}),
    listTransactions: jest.fn().mockResolvedValue([]),
  };
  const queueService = { getStats: jest.fn().mockResolvedValue([]) };
  const controller = new DhaController(
    dhaService as unknown as DhaService,
    queueService as unknown as IntegrationQueueService,
    makeConfig(),
  );
  const user = {
    userId: 7,
    staffId: 3,
    homeFacilityId: 2,
  } as RequestUser;
  const req = { requestId: 'req-dha' } as RequestWithContext;
  const expectedOptions = {
    correlationId: 'req-dha',
    actorUserId: 7,
    actorStaffId: 3,
    facilityId: 2,
  };

  beforeEach(() => jest.clearAllMocks());

  it('reports status with api version and queue stats', async () => {
    expect(await controller.getStatus()).toEqual({
      enabled: true,
      mode: 'mock',
      apiVersion: 'v1',
      queue: [],
    });
  });

  it('delegates verifications with actor context', async () => {
    await controller.verifyPatient({ nationalId: '1' }, user, req);
    expect(dhaService.verifyPatient).toHaveBeenCalledWith(
      { nationalId: '1' },
      expectedOptions,
    );

    await controller.verifyPractitioner(
      { registrationNumber: 'K-1' },
      user,
      req,
    );
    expect(dhaService.verifyPractitioner).toHaveBeenCalledWith(
      { registrationNumber: 'K-1' },
      expectedOptions,
    );

    await controller.verifyFacility({ facilityCode: 'F-1' }, user, req);
    expect(dhaService.verifyFacility).toHaveBeenCalledWith(
      { facilityCode: 'F-1' },
      expectedOptions,
    );
  });

  it('delegates eligibility, consent, referral and encounters', async () => {
    await controller.checkEligibility({ memberNumber: 'M-1' }, user, req);
    expect(dhaService.checkEligibility).toHaveBeenCalledWith(
      { memberNumber: 'M-1' },
      expectedOptions,
    );

    await controller.recordConsent({ patientId: 4, permit: true }, user, req);
    expect(dhaService.recordConsent).toHaveBeenCalledWith(
      { patientId: 4, permit: true },
      expectedOptions,
    );

    await controller.submitReferral(
      { patientId: 4, reason: 'specialist' },
      user,
      req,
    );
    expect(dhaService.submitReferral).toHaveBeenCalledWith(
      { patientId: 4, reason: 'specialist' },
      expectedOptions,
    );

    await controller.submitEncounter(11, user, req);
    expect(dhaService.submitEncounterForConsultation).toHaveBeenCalledWith(
      11,
      expectedOptions,
    );
  });

  it('lists transactions scoped to the user facility', async () => {
    await controller.listTransactions(user, '4', 'REFERRAL', '10');
    expect(dhaService.listTransactions).toHaveBeenCalledWith({
      facilityId: 2,
      patientId: 4,
      transactionType: 'REFERRAL',
      limit: 10,
    });

    await controller.listTransactions(user, undefined, undefined, undefined);
    expect(dhaService.listTransactions).toHaveBeenCalledWith({
      facilityId: 2,
      patientId: undefined,
      transactionType: undefined,
      limit: undefined,
    });
  });
});
