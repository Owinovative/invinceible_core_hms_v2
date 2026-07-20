import { ConflictException } from '@nestjs/common';
import { DhaEclaimsService } from './dha-eclaims.service';

const user = {
  userId: 9,
  roleCode: 'ADMIN',
  homeFacilityId: 1,
  homeBranchId: 2,
  staffId: 7,
} as never;

function setup(reservationCount = 1) {
  const claim = {
    id: 11,
    claimNumber: 'SHA-000011',
    statusCode: 'DRAFT',
    facilityId: 1,
    branchId: 2,
    patientId: 3,
    diagnosisCode: '8A81.0',
    dhaSpecVersion: null,
    submittedAt: null,
    updatedAt: new Date(),
    metadata: null,
    invoice: {
      items: [
        {
          id: 5,
          isRemoved: false,
          unitPrice: 500,
          quantity: 1,
          description: 'Consultation',
        },
      ],
    },
    patient: { id: 3 },
  };
  const prisma = {
    shaClaim: {
      findUnique: jest.fn().mockResolvedValue(claim),
      updateMany: jest.fn().mockResolvedValue({ count: reservationCount }),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...claim, ...data }),
        ),
    },
    patient: {
      findFirst: jest.fn().mockResolvedValue({
        dhaClientRegistryId: 'CR-3',
        shaMemberNumber: null,
      }),
    },
    consentAuthorization: {
      findFirst: jest.fn().mockResolvedValue({
        authGuidCiphertext: 'encrypted-guid',
        authGuid: null,
      }),
    },
  };
  const dha = { executeApiOperation: jest.fn().mockResolvedValue({}) };
  const service = new DhaEclaimsService(
    prisma as never,
    dha as never,
    { decrypt: jest.fn().mockReturnValue('AUTH-GUID') } as never,
    { assertBranchAccess: jest.fn() } as never,
    { dhaSpecVersion: 'uat-contract' } as never,
  );
  return { service, prisma, dha };
}

const submission = {
  consentAuthorizationId: 4,
  interventionCode: 'PHC-001',
  serviceType: 'OUTPATIENT' as const,
};

describe('DhaEclaimsService claim orchestration', () => {
  it('reserves and checkpoints the current visit-to-dispatch lifecycle', async () => {
    const { service, prisma, dha } = setup();

    const result = await service.submitLocalClaim(11, submission, user);

    expect(prisma.shaClaim.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ statusCode: 'SUBMITTING' }),
      }),
    );
    expect(
      dha.executeApiOperation.mock.calls.map(([operation]) => operation),
    ).toEqual([
      'START_VISIT',
      'ADD_CLAIM_LINE',
      'ADD_DIAGNOSIS',
      'PREVIEW_PROVIDER_CLAIM',
      'SUBMIT_OUTPATIENT_CLAIM',
    ]);
    expect(result).toMatchObject({
      statusCode: 'SUBMITTED',
      dhaSpecVersion: 'uat-contract',
    });
  });

  it('prevents two workers from dispatching the same claim concurrently', async () => {
    const { service, dha } = setup(0);

    await expect(
      service.submitLocalClaim(11, submission, user),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dha.executeApiOperation).not.toHaveBeenCalled();
  });
});
