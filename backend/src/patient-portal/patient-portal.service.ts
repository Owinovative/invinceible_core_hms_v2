import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { FeatureFlagService } from '../enterprise/feature-flag.service';

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async getProfile(user: RequestUser) {
    const patient = await this.getLinkedPatient(user);
    return {
      id: patient.id,
      patientNumber: patient.patientNumber,
      firstName: patient.firstName,
      middleName: patient.middleName,
      lastName: patient.lastName,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      phonePrimary: patient.phonePrimary,
      email: patient.email,
      facility: patient.facility,
    };
  }

  async getAppointments(user: RequestUser) {
    const patient = await this.getLinkedPatient(user);
    return this.prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        facilityId: patient.facilityId,
      },
      orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        appointmentNumber: true,
        appointmentDate: true,
        startTime: true,
        endTime: true,
        visitReason: true,
        statusCode: true,
        triagePriority: true,
        clinic: { select: { id: true, name: true, clinicType: true } },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
      },
    });
  }

  async getInvoices(user: RequestUser) {
    const patient = await this.getLinkedPatient(user);
    return this.prisma.invoice.findMany({
      where: {
        patientId: patient.id,
        facilityId: patient.facilityId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        invoiceNumber: true,
        issuedAt: true,
        statusCode: true,
        subtotal: true,
        taxAmount: true,
        discountAmount: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            sourceModule: true,
            sourceEntityType: true,
            createdAt: true,
          },
        },
        payments: {
          select: {
            id: true,
            receiptNumber: true,
            paymentMethod: true,
            amount: true,
            statusCode: true,
            paidAt: true,
            confirmedAt: true,
          },
        },
      },
    });
  }

  async getLabResults(user: RequestUser) {
    const patient = await this.getLinkedPatient(user);
    return this.prisma.labOrder.findMany({
      where: {
        patientId: patient.id,
        facilityId: patient.facilityId,
        items: { some: { results: { some: {} } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        urgency: true,
        status: true,
        createdAt: true,
        items: {
          where: { results: { some: {} } },
          select: {
            id: true,
            status: true,
            test: { select: { id: true, testName: true, category: true } },
            results: {
              select: {
                id: true,
                resultValue: true,
                remarks: true,
                attachmentFileName: true,
                attachmentMimeType: true,
                recordedAt: true,
              },
            },
          },
        },
      },
    });
  }

  async getPrescriptions(user: RequestUser) {
    const patient = await this.getLinkedPatient(user);
    return this.prisma.prescription.findMany({
      where: {
        patientId: patient.id,
        facilityId: patient.facilityId,
      },
      orderBy: { prescribedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        prescriptionNumber: true,
        statusCode: true,
        prescribedAt: true,
        dispensedAt: true,
        notes: true,
        items: {
          select: {
            id: true,
            dosage: true,
            frequency: true,
            duration: true,
            quantity: true,
            medicine: {
              select: {
                id: true,
                name: true,
                dosageForm: true,
                strength: true,
              },
            },
          },
        },
      },
    });
  }

  private async getLinkedPatient(user: RequestUser) {
    if (!this.featureFlags.isEnabled('PATIENT_PORTAL_ENABLED')) {
      throw new ServiceUnavailableException(
        'Patient portal is disabled by feature flag.',
      );
    }

    if (user.roleCode !== 'PATIENT') {
      throw new ForbiddenException('Patient portal is only for patient users');
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        portalUserId: user.userId,
        isActive: true,
      },
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        phonePrimary: true,
        email: true,
        facilityId: true,
        facility: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            town: true,
            county: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('No patient profile is linked to this login');
    }

    return patient;
  }
}
