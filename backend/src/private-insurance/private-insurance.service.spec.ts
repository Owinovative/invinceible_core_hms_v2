import { BadRequestException } from '@nestjs/common';
import { PrivateInsuranceService } from './private-insurance.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

describe('PrivateInsuranceService claim idempotency', () => {
  const user: RequestUser = {
    userId: 7,
    username: 'cashier',
    roleId: 4,
    homeFacilityId: 1,
    homeBranchId: 2,
  };

  it('does not send a claim reserved by another session', async () => {
    const prisma = {
      privateInsuranceClaim: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          statusCode: 'DRAFT',
          facilityId: 1,
          branchId: 2,
          payer: {
            integrationBaseUrl: 'https://payer.example',
            claimSubmissionPath: '/claims',
          },
          policy: { patient: {} },
          invoice: { items: [] },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const scope = { assertBranchAccess: jest.fn() };
    const service = new PrivateInsuranceService(
      prisma as never,
      scope as never,
      {} as never,
      {} as never,
    );

    await expect(service.submitClaim(9, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.privateInsuranceClaim.updateMany).toHaveBeenCalledWith({
      where: {
        id: 9,
        statusCode: { in: ['DRAFT', 'SUBMISSION_FAILED'] },
      },
      data: { statusCode: 'SUBMITTING', rejectionReason: null },
    });
  });
});

describe('PrivateInsuranceService payer URL normalization', () => {
  const user: RequestUser = {
    userId: 1,
    username: 'facility-admin',
    roleId: 2,
    homeFacilityId: 1,
  };

  it('removes trailing slashes without evaluating a user-controlled regex', async () => {
    const prisma = {
      insurancePayer: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 1,
            ...data,
            isActive: true,
          }),
        ),
      },
    };
    const scope = { assertFacilityAccess: jest.fn() };
    const service = new PrivateInsuranceService(
      prisma as never,
      scope as never,
      { encrypt: jest.fn() } as never,
      { get: jest.fn().mockReturnValue('development') } as never,
    );

    await service.createPayer(
      {
        facilityId: 1,
        code: ' demo ',
        name: ' Demo Insurer ',
        integrationBaseUrl: '  https://payer.example/api////  ',
      },
      user,
    );

    expect(scope.assertFacilityAccess).toHaveBeenCalledWith(user, 1);
    expect(prisma.insurancePayer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          integrationBaseUrl: 'https://payer.example/api',
        }),
      }),
    );
  });
});
