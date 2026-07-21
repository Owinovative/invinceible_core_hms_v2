import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

  it('requires either an OTP or an authorized biometric GUID', async () => {
    const { service, prisma } = setup();
    prisma.patient.findFirst.mockResolvedValueOnce({
      dhaClientRegistryId: 'CR-3',
      shaMemberNumber: null,
    });

    await expect(
      service.startVisit(
        {
          patientId: 3,
          interventionCodes: ['PHC-001'],
          serviceType: 'OUTPATIENT',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the decrypted biometric GUID when consent is present', async () => {
    const { service, prisma, dha } = setup();
    prisma.patient.findFirst.mockResolvedValueOnce({
      dhaClientRegistryId: 'CR-3',
      shaMemberNumber: null,
    });
    prisma.consentAuthorization.findFirst.mockResolvedValueOnce({
      authGuidCiphertext: 'encrypted-guid',
      authGuid: null,
    });

    await service.startVisit(
      {
        patientId: 3,
        interventionCodes: ['PHC-001'],
        serviceType: 'OUTPATIENT',
        consentAuthorizationId: 4,
      },
      user,
    );

    expect(dha.executeApiOperation).toHaveBeenCalledWith(
      'START_VISIT',
      expect.objectContaining({ auth_guid: 'AUTH-GUID' }),
      expect.any(Object),
    );
  });

  it('rejects missing patients before any DHA operation', async () => {
    const { service, prisma } = setup();
    prisma.patient.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.startVisit(
        {
          patientId: 999,
          interventionCodes: ['PHC-001'],
          serviceType: 'OUTPATIENT',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid consent authorizations while starting a visit', async () => {
    const { service, prisma } = setup();
    prisma.consentAuthorization.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.startVisit(
        {
          patientId: 3,
          interventionCodes: ['PHC-001'],
          serviceType: 'OUTPATIENT',
          consentAuthorizationId: 4,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates attachment metadata before dispatching', async () => {
    const { service } = setup();

    await expect(
      service.addAttachment({} as never, undefined, user),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.addAttachment(
        { documentType: 'INVOICE', interventionCode: 'PHC-001' } as never,
        {
          buffer: Buffer.from('x'),
          mimetype: 'application/xml',
          originalname: 'bad.txt',
          size: 1,
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.addAttachment(
        { documentType: 'INVOICE', interventionCode: 'PHC-001' } as never,
        {
          buffer: Buffer.alloc(11 * 1024 * 1024),
          mimetype: 'application/pdf',
          originalname: 'big.pdf',
          size: 11 * 1024 * 1024,
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates emergency claims with the beneficiary registry id when provided', async () => {
    const { service, prisma, dha } = setup();
    prisma.patient.findFirst.mockResolvedValueOnce({
      dhaClientRegistryId: 'CR-3',
      shaMemberNumber: null,
    });

    await service.createEmergency(
      {
        patientId: 3,
        interventions: ['PHC-001'],
        modeOfArrival: 'WALK_IN',
        broughtBy: 'SELF',
        referenceNumber: 'REF-1',
        practitionerIdentificationNumber: 'DOC-1',
        practitionerIdentificationType: 'NATIONAL_ID',
        practitionerRegulationBody: 'MEDICAL_COUNCIL',
        otp: '123456',
        notes: 'urgent',
      } as never,
      user,
    );

    expect(dha.executeApiOperation).toHaveBeenCalledWith(
      'CREATE_EMERGENCY_CLAIM',
      expect.objectContaining({ beneficiary_cr_id: 'CR-3', otp: '123456' }),
      expect.any(Object),
    );
  });

  it('rejects emergency claims when the patient has no registry identifier', async () => {
    const { service, prisma } = setup();
    prisma.patient.findFirst.mockResolvedValueOnce({
      dhaClientRegistryId: null,
      shaMemberNumber: null,
    });

    await expect(
      service.createEmergency(
        {
          patientId: 3,
          interventions: ['PHC-001'],
          modeOfArrival: 'WALK_IN',
          broughtBy: 'SELF',
          referenceNumber: 'REF-1',
          practitionerIdentificationNumber: 'DOC-1',
          practitionerIdentificationType: 'NATIONAL_ID',
          practitionerRegulationBody: 'MEDICAL_COUNCIL',
          otp: '123456',
          notes: 'urgent',
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('omits beneficiary identifiers for emergency claims created without OTP', async () => {
    const { service, dha } = setup();

    await service.createEmergency(
      {
        patientId: 3,
        interventions: ['PHC-001'],
        modeOfArrival: 'WALK_IN',
        broughtBy: 'SELF',
        referenceNumber: 'REF-1',
        practitionerIdentificationNumber: 'DOC-1',
        practitionerIdentificationType: 'NATIONAL_ID',
        practitionerRegulationBody: 'MEDICAL_COUNCIL',
        notes: 'urgent',
      } as never,
      user,
    );

    expect(dha.executeApiOperation).toHaveBeenCalledWith(
      'CREATE_EMERGENCY_CLAIM',
      expect.objectContaining({ beneficiary_cr_id: undefined, otp: undefined }),
      expect.any(Object),
    );
  });

  it('requires a facility-scoped account for DHA operations', () => {
    const { service } = setup();
    expect(() =>
      service.addClaimLine(
        {
          patientId: 3,
          interventionCode: 'PHC-001',
          unitPrice: '500',
          quantity: '1',
          serviceName: 'Consultation',
          serviceIdentifier: 'SVC-1',
        } as never,
        { ...user, homeFacilityId: undefined } as never,
      ),
    ).toThrow(BadRequestException);
  });

  it('uses the normal preauthorization operation for standard claims', async () => {
    const { service, dha } = setup();

    await service.createPreauthorization(
      {
        patientId: 3,
        consentAuthorizationId: 4,
        interventionCode: 'PHC-001',
        preauthType: 'NORMAL',
        expectedServiceStartDate: '2026-01-01',
        chiefComplaint: 'pain',
        clinicalIndications: ['indication'],
        historyOfPresentIllness: 'history',
        clinicalData: 'data',
        diagnoses: [{ icdCode: 'A00' }],
        items: [{ itemCode: 'ITEM-1', unitPrice: '100', quantity: '1' }],
        doctors: [
          {
            identificationNumber: 'DOC-1',
            identificationType: 'NATIONAL_ID',
            regulationBody: 'MEDICAL_COUNCIL',
          },
        ],
      } as never,
      user,
    );

    expect(dha.executeApiOperation).toHaveBeenCalledWith(
      'CREATE_PREAUTH',
      expect.objectContaining({ preauth_type: 'NORMAL' }),
      expect.any(Object),
    );
  });

  it('uses the specialized preauthorization operation for specialized claims', async () => {
    const { service, dha } = setup();

    await service.createPreauthorization(
      {
        patientId: 3,
        consentAuthorizationId: 4,
        interventionCode: 'PHC-001',
        preauthType: 'SPECIALIZED',
        expectedServiceStartDate: '2026-01-01',
        chiefComplaint: 'pain',
        clinicalIndications: ['indication'],
        historyOfPresentIllness: 'history',
        clinicalData: 'data',
        diagnoses: [{ icdCode: 'A00' }],
        items: [{ itemCode: 'ITEM-1', unitPrice: '100', quantity: '1' }],
        doctors: [
          {
            identificationNumber: 'DOC-1',
            identificationType: 'NATIONAL_ID',
            regulationBody: 'MEDICAL_COUNCIL',
          },
        ],
      } as never,
      user,
    );

    expect(dha.executeApiOperation).toHaveBeenCalledWith(
      'CREATE_SPECIALIZED_PREAUTH',
      expect.objectContaining({ preauth_type: 'SPECIALIZED' }),
      expect.any(Object),
    );
  });

  it('rejects submissions that lack a billable invoice', async () => {
    const { service, prisma } = setup();
    prisma.shaClaim.findUnique.mockResolvedValueOnce({
      id: 11,
      claimNumber: 'SHA-000011',
      statusCode: 'DRAFT',
      facilityId: 1,
      branchId: 2,
      patientId: 3,
      diagnosisCode: '8A81.0',
      metadata: null,
      invoice: null,
      patient: { id: 3 },
    } as never);

    await expect(
      service.submitLocalClaim(11, submission, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects submissions that lack a standardized diagnosis code', async () => {
    const { service, prisma } = setup();
    prisma.shaClaim.findUnique.mockResolvedValueOnce({
      id: 11,
      claimNumber: 'SHA-000011',
      statusCode: 'DRAFT',
      facilityId: 1,
      branchId: 2,
      patientId: 3,
      diagnosisCode: null,
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
    } as never);

    await expect(
      service.submitLocalClaim(11, submission, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks a failed submission so it can be retried later', async () => {
    const { service, prisma, dha } = setup();
    dha.executeApiOperation.mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.submitLocalClaim(11, submission, user),
    ).rejects.toThrow('boom');
    expect(prisma.shaClaim.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ statusCode: 'DHA_SUBMISSION_FAILED' }),
      }),
    );
  });
});
