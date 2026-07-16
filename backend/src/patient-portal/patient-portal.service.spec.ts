import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PatientPortalService } from './patient-portal.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';

describe('PatientPortalService isolation', () => {
  const user = {
    userId: 77,
    username: 'patient',
    roleCode: 'PATIENT',
  } as RequestUser;

  function setup(
    enabled = true,
    patient: Record<string, unknown> | null = null,
  ) {
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue(patient) },
      invoice: { findMany: jest.fn().mockResolvedValue([]) },
      appointment: { findMany: jest.fn().mockResolvedValue([]) },
      labOrder: { findMany: jest.fn().mockResolvedValue([]) },
      prescription: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const flags = { isEnabled: jest.fn().mockReturnValue(enabled) };
    return {
      prisma,
      service: new PatientPortalService(prisma as never, flags as never),
    };
  }

  it('finds only the active patient linked to the authenticated portal user', async () => {
    const patient = {
      id: 5,
      facilityId: 2,
      patientNumber: 'P-5',
      facility: { id: 2, name: 'Hospital' },
    };
    const { service, prisma } = setup(true, patient);
    await service.getInvoices(user);

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { portalUserId: 77, isActive: true },
      }),
    );
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 5, facilityId: 2 } }),
    );
  });

  it('does not accept a patient id supplied by the caller', async () => {
    const { service, prisma } = setup(true, {
      id: 5,
      facilityId: 2,
      facility: {},
    });
    await service.getAppointments({ ...user, patientId: 999 } as never);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 5, facilityId: 2 } }),
    );
  });

  it('rejects non-patient roles, disabled portals, and unlinked users', async () => {
    await expect(setup(false).service.getProfile(user)).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(
      setup().service.getProfile({ ...user, roleCode: 'DOCTOR' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(setup(true, null).service.getProfile(user)).rejects.toThrow(
      NotFoundException,
    );
  });
});
