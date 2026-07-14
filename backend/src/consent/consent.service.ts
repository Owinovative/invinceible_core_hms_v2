import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DHA_CLIENT } from '../integration/integration.constants';
import type { DhaClientPort } from '../integration/dha/dha.types';
import {
  SendOtpDto,
  VerifyOtpDto,
  SendDischargeOtpDto,
} from './dto/consent.dto';
import { RequestUser } from '../auth/interfaces/request-user.interface';

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DHA_CLIENT) private readonly dhaClient: DhaClientPort,
  ) {}

  async getContacts(patientId: string, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: parseInt(patientId, 10) },
    });

    if (!patient || !patient.shaMemberNumber) {
      throw new NotFoundException(
        'Patient not found or missing SHA member number',
      );
    }

    const response = await this.dhaClient.getPatientContacts(
      patient.shaMemberNumber,
      {
        facilityId: user.homeFacilityId || undefined,
      },
    );

    if (response.status !== 'SUCCESS') {
      throw new BadRequestException(
        'Failed to retrieve patient contacts from DHA',
      );
    }

    return response.data;
  }

  async sendVisitOtp(dto: SendOtpDto, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: parseInt(dto.patientId, 10) },
    });

    if (!patient || !patient.shaMemberNumber) {
      throw new NotFoundException(
        'Patient not found or missing SHA member number',
      );
    }

    const response = await this.dhaClient.sendVisitOtp(
      {
        patient_id: patient.shaMemberNumber,
        intervention_codes: dto.interventionCodes,
        contact_id: dto.contactId,
      },
      { facilityId: user.homeFacilityId || undefined },
    );

    if (!response.data) {
      throw new BadRequestException('Failed to initiate OTP request');
    }

    // Save request to DB
    await this.prisma.consentRequest.create({
      data: {
        patientId: patient.id,
        contactId: dto.contactId,
        interventionCodes: dto.interventionCodes,
        status: response.data.status,
        // DHA's documented OTP response is a SuccessResponse and does not
        // promise a request identifier. Keep a local identifier when absent.
        dhaConsentRequestId:
          response.data.consent_request_id ?? `otp-${patient.id}-${Date.now()}`,
      },
    });

    // Audit log
    await this.prisma.consentAuditLog.create({
      data: {
        patientId: patient.id,
        userId: user.userId,
        facilityId: user.homeFacilityId,
        action: 'REQUESTED',
        outcome: 'SUCCESS',
      },
    });

    return response.data;
  }

  async verifyVisitOtp(dto: VerifyOtpDto, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: parseInt(dto.patientId, 10) },
    });

    if (!patient || !patient.shaMemberNumber) {
      throw new NotFoundException(
        'Patient not found or missing SHA member number',
      );
    }

    // Get the latest pending request
    const pendingRequest = await this.prisma.consentRequest.findFirst({
      where: { patientId: patient.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendingRequest) {
      throw new BadRequestException(
        'No pending consent request found for this patient',
      );
    }

    try {
      const response = await this.dhaClient.createAuthorization(
        {
          patient_id: patient.shaMemberNumber,
          otp: dto.otpCode,
          interventions: dto.interventionCodes,
          service_type: dto.serviceType,
        },
        { facilityId: user.homeFacilityId || undefined },
      );

      if (!response.data || !response.data.consent_token) {
        throw new BadRequestException('Failed to authorize consent');
      }

      // Update Request status
      await this.prisma.consentRequest.update({
        where: { id: pendingRequest.id },
        data: { status: 'COMPLETED' },
      });

      // Save Authorization Token
      const authorization = await this.prisma.consentAuthorization.create({
        data: {
          patientId: patient.id,
          consultationId: dto.consultationId,
          consentToken: response.data.consent_token,
          authGuid: response.data.auth_guid,
          status: response.data.status,
          expiresAt: response.data.expires_at
            ? new Date(response.data.expires_at)
            : null,
        },
      });

      // Audit log
      await this.prisma.consentAuditLog.create({
        data: {
          patientId: patient.id,
          userId: user.userId,
          facilityId: user.homeFacilityId,
          action: 'VERIFIED',
          outcome: 'SUCCESS',
        },
      });

      return authorization;
    } catch (error) {
      // Audit log failure
      await this.prisma.consentAuditLog.create({
        data: {
          patientId: patient.id,
          userId: user.userId,
          facilityId: user.homeFacilityId,
          action: 'VERIFIED',
          outcome: 'FAILED',
        },
      });
      throw error;
    }
  }

  async sendDischargeOtp(dto: SendDischargeOtpDto, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: parseInt(dto.patientId, 10) },
    });

    if (!patient || !patient.shaMemberNumber) {
      throw new NotFoundException(
        'Patient not found or missing SHA member number',
      );
    }

    const response = await this.dhaClient.sendDischargeOtp(
      {
        patient_id: patient.shaMemberNumber,
        contact_id: dto.contactId,
        otp_type: 'discharge',
        encounter_id: dto.encounterId,
        service_type: dto.serviceType,
      },
      { facilityId: user.homeFacilityId || undefined },
    );

    return response.data;
  }

  async getActiveConsent(patientId: number, consultationId?: number) {
    const whereClause: any = {
      patientId,
      status: 'AUTHORIZED',
    };

    if (consultationId) {
      whereClause.consultationId = consultationId;
    }

    return this.prisma.consentAuthorization.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }
}
