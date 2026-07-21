import { NotFoundException } from '@nestjs/common';
import { ConsentService } from './consent.service';

describe('ConsentService production safety', () => {
  const user = {
    userId: 7,
    username: 'clinician',
    roleId: 3,
    homeFacilityId: 10,
  };
  const patient = {
    id: 21,
    facilityId: 10,
    shaMemberNumber: 'CR-10001',
  };
  const prisma = {
    patient: { findFirst: jest.fn() },
    consentRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    consentAuthorization: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    consentAuditLog: { create: jest.fn() },
  };
  const dhaClient = {
    getPatientContacts: jest.fn(),
    sendVisitOtp: jest.fn(),
    createAuthorization: jest.fn(),
    sendDischargeOtp: jest.fn(),
  };
  const scope = {
    buildFacilityScopeWhere: jest.fn().mockReturnValue({ facilityId: 10 }),
  };
  const cipher = {
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
  };
  const service = new ConsentService(
    prisma as never,
    dhaClient as never,
    scope as never,
    cipher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    scope.buildFacilityScopeWhere.mockReturnValue({ facilityId: 10 });
    prisma.patient.findFirst.mockResolvedValue(patient);
  });

  it('scopes patient lookup and accepts the adapter SUCCESS response', async () => {
    dhaClient.getPatientContacts.mockResolvedValue({
      status: 'SUCCESS',
      data: [{ contact_id: 1, contact_value: '+254700000000' }],
    });

    await expect(service.getContacts('21', user)).resolves.toHaveLength(1);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 21, facilityId: 10 },
    });
  });

  it('does not reveal whether an out-of-scope patient exists', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(service.getContacts('99', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dhaClient.getPatientContacts).not.toHaveBeenCalled();
  });

  it('stores authorization credentials only in encrypted columns', async () => {
    prisma.consentRequest.findFirst.mockResolvedValue({
      id: 31,
      patientId: 21,
      status: 'PENDING',
      dhaConsentRequestId: 'REQ-1',
    });
    dhaClient.createAuthorization.mockResolvedValue({
      status: 'SUCCESS',
      data: {
        consent_token: 'token-secret',
        auth_guid: 'guid-secret',
        status: 'AUTHORIZED',
        expires_at: '2026-07-19T00:00:00.000Z',
      },
    });
    prisma.consentRequest.update.mockResolvedValue({});
    prisma.consentAuthorization.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 41, createdAt: new Date(), ...data }),
    );
    prisma.consentAuditLog.create.mockResolvedValue({});

    const result = await service.verifyVisitOtp(
      {
        patientId: '21',
        otpCode: '123456',
        interventionCodes: ['INT-1'],
        serviceType: 'OUTPATIENT' as never,
      },
      user,
    );

    expect(prisma.consentAuthorization.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        consentTokenCiphertext: 'encrypted:token-secret',
        authGuidCiphertext: 'encrypted:guid-secret',
      }),
    });
    const storedData = prisma.consentAuthorization.create.mock.calls[0][0].data;
    expect(storedData).not.toHaveProperty('consentToken');
    expect(storedData).not.toHaveProperty('authGuid');
    expect(result).not.toHaveProperty('consentToken');
    expect(result).not.toHaveProperty('authGuid');
  });

  it('returns only non-sensitive consent status fields', async () => {
    prisma.consentAuthorization.findFirst.mockResolvedValue({
      id: 41,
      patientId: 21,
      status: 'AUTHORIZED',
    });

    await service.getActiveConsent(21, user);

    expect(prisma.consentAuthorization.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({
          consentToken: true,
          consentTokenCiphertext: true,
          authGuid: true,
          authGuidCiphertext: true,
        }),
      }),
    );
  });
});
