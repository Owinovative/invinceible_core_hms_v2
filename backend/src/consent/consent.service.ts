import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DhaService } from '../integration/dha/dha.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  SendDischargeOtpDto,
} from './dto/consent.dto';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { ScopeService } from '../auth/scope.service';
import { SensitiveDataCipherService } from '../common/security/sensitive-data-cipher.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dhaService: DhaService,
    private readonly scope: ScopeService,
    private readonly cipher: SensitiveDataCipherService,
  ) {}

  private async getScopedPatient(
    patientIdValue: string | number,
    user: RequestUser,
  ) {
    const patientId = Number(patientIdValue);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      throw new BadRequestException('Invalid patient ID');
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        ...this.scope.buildFacilityScopeWhere(user),
      },
    });
    if (!patient || !patient.shaMemberNumber) {
      throw new NotFoundException(
        'Patient not found or missing a verified DHA registry identifier',
      );
    }
    return { ...patient, shaMemberNumber: patient.shaMemberNumber };
  }

  async getContacts(patientId: string, user: RequestUser) {
    const patient = await this.getScopedPatient(patientId, user);

    const response = await this.dhaService.getPatientContacts(
      patient.shaMemberNumber,
      {
        facilityId: user.homeFacilityId || undefined,
        patientId: patient.id,
        actorUserId: user.userId,
      },
    );

    if (
      response.status !== 'VERIFIED' &&
      response.status !== 'ACCEPTED' &&
      response.status !== 'SUCCESS'
    ) {
      throw new BadRequestException(
        'Failed to retrieve patient contacts from DHA',
      );
    }

    return response.data;
  }

  async sendVisitOtp(dto: SendOtpDto, user: RequestUser) {
    const patient = await this.getScopedPatient(dto.patientId, user);

    const response = await this.dhaService.sendVisitOtp(
      {
        patient_id: patient.shaMemberNumber,
        intervention_codes: dto.interventionCodes,
        contact_id: dto.contactId,
      },
      {
        facilityId: user.homeFacilityId || undefined,
        patientId: patient.id,
        actorUserId: user.userId,
      },
    );

    if (!response.data || !response.data.consent_request_id) {
      throw new BadRequestException('Failed to initiate OTP request');
    }

    // Save request to DB
    await this.prisma.consentRequest.create({
      data: {
        patientId: patient.id,
        contactId: dto.contactId,
        interventionCodes: dto.interventionCodes,
        status: response.data.status,
        dhaConsentRequestId: response.data.consent_request_id,
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
    const patient = await this.getScopedPatient(dto.patientId, user);

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
      const response = await this.dhaService.authorizeVisit(
        {
          patient_id: patient.shaMemberNumber,
          consent_request_id: pendingRequest.dhaConsentRequestId,
          otp_code: dto.otpCode,
          intervention_codes: dto.interventionCodes,
          service_type: dto.serviceType,
        },
        {
          facilityId: user.homeFacilityId || undefined,
          patientId: patient.id,
          actorUserId: user.userId,
        },
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
          consentTokenCiphertext: this.cipher.encrypt(
            response.data.consent_token,
          ),
          authGuidCiphertext: response.data.auth_guid
            ? this.cipher.encrypt(response.data.auth_guid)
            : null,
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

      return {
        id: authorization.id,
        patientId: authorization.patientId,
        consultationId: authorization.consultationId,
        status: authorization.status,
        expiresAt: authorization.expiresAt,
        createdAt: authorization.createdAt,
      };
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
    const patient = await this.getScopedPatient(dto.patientId, user);

    const response = await this.dhaService.sendDischargeOtp(
      {
        patient_id: patient.shaMemberNumber,
        contact_id: dto.contactId,
        otp_type: 'discharge',
        encounter_id: dto.encounterId,
        service_type: dto.serviceType,
      },
      {
        facilityId: user.homeFacilityId || undefined,
        patientId: patient.id,
        actorUserId: user.userId,
      },
    );

    return response.data;
  }

  async getActiveConsent(
    patientId: number,
    user: RequestUser,
    consultationId?: number,
  ) {
    await this.getScopedPatient(patientId, user);
    const whereClause: Prisma.ConsentAuthorizationWhereInput = {
      patientId,
      status: 'AUTHORIZED',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    if (consultationId) {
      whereClause.consultationId = consultationId;
    }

    return this.prisma.consentAuthorization.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        patientId: true,
        consultationId: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }
}
