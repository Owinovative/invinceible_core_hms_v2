import { ConsultationService } from './consultation.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

describe('ConsultationService consultation start', () => {
  const user: RequestUser = {
    userId: 20,
    username: 'demo.doctor',
    roleId: 4,
    roleCode: 'DOCTOR',
    homeFacilityId: 1,
    homeBranchId: 2,
    allowedBranchIds: [2],
    staffId: 30,
  };

  function buildService(mode: 'mock' | 'sandbox' = 'mock') {
    const createdConsultation = {
      id: 90,
      consultationNumber: 'CON-2026-1',
      appointmentId: 40,
      patientId: 50,
      doctorId: 30,
      facilityId: 1,
      branchId: 2,
      statusCode: 'IN_PROGRESS',
    };
    const tx = {
      consultation: {
        create: jest.fn().mockResolvedValue(createdConsultation),
      },
      appointment: { update: jest.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      consultation: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      facility: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          code: 'HMS-DEMO-FACILITY',
        }),
      },
      appointment: { update: jest.fn().mockResolvedValue(undefined) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const appointmentService = {
      findOne: jest.fn().mockResolvedValue({
        id: 40,
        facilityId: 1,
        branchId: 2,
        patientId: 50,
        doctorId: 30,
        statusCode: 'READY_FOR_DOCTOR',
        startedAt: null,
      }),
    };
    const patientService = {
      findOne: jest.fn().mockResolvedValue({ id: 50, facilityId: 1 }),
    };
    const staffService = {
      findOne: jest.fn().mockResolvedValue({
        id: 30,
        facilityId: 1,
        branchId: 2,
        clinicianRegistrationNumber: 'DEMO-KMPDC-001',
      }),
    };
    const facilityService = {
      assertOperational: jest.fn().mockResolvedValue(undefined),
    };
    const scopeService = { assertBranchAccess: jest.fn() };
    const practitionerRegistry = {
      validateLicense: jest
        .fn()
        .mockResolvedValue({ valid: true, status: 'ACTIVE' }),
    };
    const facilityRegistry = {
      validateFacilityCode: jest.fn().mockResolvedValue(true),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'DHA_ENABLED') return 'true';
        if (key === 'DHA_MODE') return mode;
        return undefined;
      }),
    };

    const service = new ConsultationService(
      prisma as never,
      appointmentService as never,
      patientService as never,
      staffService as never,
      facilityService as never,
      scopeService as never,
      {} as never,
      practitionerRegistry as never,
      facilityRegistry as never,
      configService as never,
    );

    return {
      service,
      prisma,
      tx,
      practitionerRegistry,
      facilityRegistry,
      scopeService,
      createdConsultation,
    };
  }

  const dto = {
    consultationNumber: 'CON-2026-1',
    appointmentId: 40,
    patientId: 50,
    doctorId: 30,
    statusCode: 'IN_PROGRESS',
  };

  it('starts a local mock consultation without calling live DHA registries', async () => {
    const context = buildService('mock');

    await expect(context.service.create(dto, user)).resolves.toEqual(
      context.createdConsultation,
    );

    expect(
      context.facilityRegistry.validateFacilityCode,
    ).not.toHaveBeenCalled();
    expect(context.practitionerRegistry.validateLicense).not.toHaveBeenCalled();
    expect(context.scopeService.assertBranchAccess).toHaveBeenCalledWith(
      user,
      1,
      2,
    );
    expect(context.tx.consultation.create).toHaveBeenCalledTimes(1);
    expect(context.tx.appointment.update).toHaveBeenCalledWith({
      where: { id: 40 },
      data: {
        statusCode: 'IN_CONSULTATION',
        startedAt: expect.any(Date),
      },
    });
  });

  it('retains mandatory registry validation in DHA sandbox mode', async () => {
    const context = buildService('sandbox');

    await context.service.create(dto, user);

    expect(context.facilityRegistry.validateFacilityCode).toHaveBeenCalledWith(
      'HMS-DEMO-FACILITY',
    );
    expect(context.practitionerRegistry.validateLicense).toHaveBeenCalledWith(
      'DEMO-KMPDC-001',
    );
  });
});
