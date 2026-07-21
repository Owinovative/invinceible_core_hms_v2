import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import { ScopeService } from '../../auth/scope.service';
import { SensitiveDataCipherService } from '../../common/security/sensitive-data-cipher.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AddDhaClaimLineDto,
  AddDhaDiagnosisDto,
  CreateDhaEmergencyClaimDto,
  CreateDhaPreauthorizationDto,
  DhaAttachmentMetadataDto,
  StartDhaVisitDto,
  SubmitLocalShaClaimDto,
} from './dto/eclaims-requests.dto';
import { DhaService } from './dha.service';
import { IntegrationConfigService } from '../integration-config.service';

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

@Injectable()
export class DhaEclaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dha: DhaService,
    private readonly cipher: SensitiveDataCipherService,
    private readonly scope: ScopeService,
    private readonly config: IntegrationConfigService,
  ) {}

  private facilityId(user: RequestUser): number {
    if (!user.homeFacilityId) {
      throw new BadRequestException(
        'A facility-scoped account is required for DHA eClaims',
      );
    }
    return user.homeFacilityId;
  }

  private options(
    user: RequestUser,
    patientId: number,
    consentAuthorizationId?: number,
  ) {
    return {
      facilityId: this.facilityId(user),
      patientId,
      consentAuthorizationId,
      actorUserId: user.userId,
      actorStaffId: user.staffId ?? undefined,
    };
  }

  private async patientExternalId(patientId: number, user: RequestUser) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: this.facilityId(user) },
      select: { dhaClientRegistryId: true, shaMemberNumber: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    const externalId = patient.dhaClientRegistryId ?? patient.shaMemberNumber;
    if (!externalId) {
      throw new BadRequestException(
        'The patient must be verified in the DHA Client Registry first',
      );
    }
    return externalId;
  }

  private async authorizationGuid(id: number, patientId: number) {
    const authorization = await this.prisma.consentAuthorization.findFirst({
      where: {
        id,
        patientId,
        status: 'AUTHORIZED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { authGuidCiphertext: true, authGuid: true },
    });
    if (!authorization) {
      throw new BadRequestException(
        'Consent authorization is invalid or expired',
      );
    }
    return authorization.authGuidCiphertext
      ? this.cipher.decrypt(authorization.authGuidCiphertext)
      : authorization.authGuid;
  }

  async startVisit(dto: StartDhaVisitDto, user: RequestUser) {
    const patientId = await this.patientExternalId(dto.patientId, user);
    const authGuid = dto.consentAuthorizationId
      ? await this.authorizationGuid(dto.consentAuthorizationId, dto.patientId)
      : undefined;
    if (!dto.otp && !authGuid) {
      throw new BadRequestException(
        'Start visit requires either an OTP or an authorized biometric GUID',
      );
    }
    return this.dha.executeApiOperation(
      'START_VISIT',
      {
        patient_id: patientId,
        intervention_codes: dto.interventionCodes,
        service_type: dto.serviceType,
        ...(dto.otp ? { otp: dto.otp } : { auth_guid: authGuid }),
      },
      this.options(user, dto.patientId),
    );
  }

  addClaimLine(dto: AddDhaClaimLineDto, user: RequestUser) {
    return this.dha.executeApiOperation(
      'ADD_CLAIM_LINE',
      {
        intervention_code: dto.interventionCode,
        unit_price: dto.unitPrice,
        quantity: dto.quantity,
        service_name: dto.serviceName,
        service_identifier: dto.serviceIdentifier,
      },
      this.options(user, dto.patientId, dto.consentAuthorizationId),
    );
  }

  addDiagnosis(dto: AddDhaDiagnosisDto, user: RequestUser) {
    return this.dha.executeApiOperation(
      'ADD_DIAGNOSIS',
      {
        intervention_code: dto.interventionCode,
        icd_code: dto.icdCode,
      },
      this.options(user, dto.patientId, dto.consentAuthorizationId),
    );
  }

  createPreauthorization(dto: CreateDhaPreauthorizationDto, user: RequestUser) {
    const operation =
      dto.preauthType === 'NORMAL'
        ? 'CREATE_PREAUTH'
        : 'CREATE_SPECIALIZED_PREAUTH';
    return this.dha.executeApiOperation(
      operation,
      {
        intervention_code: dto.interventionCode,
        preauth_type: dto.preauthType,
        expected_service_start_date: dto.expectedServiceStartDate,
        chief_complaint: dto.chiefComplaint,
        clinical_indications: dto.clinicalIndications,
        history_of_present_illness: dto.historyOfPresentIllness,
        clinical_data: dto.clinicalData,
        diagnoses: dto.diagnoses.map(({ icdCode }) => ({ icd_code: icdCode })),
        items: dto.items.map(({ itemCode, ...item }) => ({
          item_code: itemCode,
          unit_price: item.unitPrice,
          quantity: item.quantity,
        })),
        doctors: dto.doctors.map((doctor) => ({
          identification_number: doctor.identificationNumber,
          identification_type: doctor.identificationType,
          regulation_body: doctor.regulationBody,
        })),
      },
      this.options(user, dto.patientId, dto.consentAuthorizationId),
    );
  }

  async addAttachment(
    dto: DhaAttachmentMetadataDto,
    file: UploadedFile | undefined,
    user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('Attachment file is required');
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, JPEG, and PNG files are allowed',
      );
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'Attachment must be between 1 byte and 10 MB',
      );
    }
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    return this.dha.executeApiOperation(
      'ADD_CLAIM_ATTACHMENT',
      {
        file_blob: blob,
        document_type: dto.documentType,
        intervention_code: dto.interventionCode,
      },
      this.options(user, dto.patientId, dto.consentAuthorizationId),
    );
  }

  async createEmergency(dto: CreateDhaEmergencyClaimDto, user: RequestUser) {
    const beneficiaryId = dto.otp
      ? await this.patientExternalId(dto.patientId, user)
      : undefined;
    return this.dha.executeApiOperation(
      'CREATE_EMERGENCY_CLAIM',
      {
        interventions: dto.interventions,
        mode_of_arrival: dto.modeOfArrival,
        brought_by: dto.broughtBy,
        reference_number: dto.referenceNumber,
        identification_number: dto.practitionerIdentificationNumber,
        identification_type: dto.practitionerIdentificationType,
        regulation_body: dto.practitionerRegulationBody,
        beneficiary_cr_id: beneficiaryId,
        otp: dto.otp,
        notes: dto.notes,
      },
      this.options(user, dto.patientId),
    );
  }

  /**
   * Resumable local-claim orchestration for the current DHA eClaims lifecycle.
   * A checkpoint is persisted after every accepted remote operation, avoiding
   * re-sending completed lines when an operator resumes a failed submission.
   */
  async submitLocalClaim(
    claimId: number,
    dto: SubmitLocalShaClaimDto,
    user: RequestUser,
  ) {
    const claim = await this.prisma.shaClaim.findUnique({
      where: { id: claimId },
      include: { invoice: { include: { items: true } }, patient: true },
    });
    if (!claim) throw new NotFoundException(`SHA claim ${claimId} not found`);
    this.scope.assertBranchAccess(user, claim.facilityId, claim.branchId);
    const activeItems = claim.invoice?.items.filter(
      (entry) => !entry.isRemoved,
    );
    if (!claim.invoice || !activeItems?.length) {
      throw new BadRequestException(
        'A claim invoice with billable items is required',
      );
    }
    if (!claim.diagnosisCode) {
      throw new BadRequestException(
        'A standardized diagnosis code is required',
      );
    }

    const metadata = (claim.metadata as Record<string, unknown> | null) ?? {};
    metadata.dhaSubmissionStartedAt = new Date().toISOString();
    const staleBefore = new Date(Date.now() - 15 * 60_000);
    const reservation = await this.prisma.shaClaim.updateMany({
      where: {
        id: claim.id,
        OR: [
          {
            statusCode: {
              in: [
                'DRAFT',
                'VALIDATED',
                'PENDING',
                'REJECTED',
                'DHA_SUBMISSION_FAILED',
              ],
            },
          },
          { statusCode: 'SUBMITTING', updatedAt: { lt: staleBefore } },
        ],
      },
      data: {
        statusCode: 'SUBMITTING',
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    if (reservation.count !== 1) {
      throw new ConflictException(
        claim.statusCode === 'SUBMITTED'
          ? 'This claim has already been submitted to DHA'
          : 'This claim is already being submitted or cannot be submitted from its current status',
      );
    }

    const completed = new Set(
      Array.isArray(metadata.dhaCompletedOperations)
        ? metadata.dhaCompletedOperations.map(String)
        : [],
    );
    const saveCheckpoint = async (key: string) => {
      completed.add(key);
      metadata.dhaCompletedOperations = [...completed];
      metadata.dhaServiceType = dto.serviceType;
      metadata.dhaInterventionCode = dto.interventionCode;
      await this.prisma.shaClaim.update({
        where: { id: claim.id },
        data: { metadata: metadata as Prisma.InputJsonValue },
      });
    };
    const run = async (key: string, operation: () => Promise<unknown>) => {
      if (completed.has(key)) return;
      await operation();
      await saveCheckpoint(key);
    };

    try {
      await run('VISIT', async () => {
        await this.startVisit(
          {
            patientId: claim.patientId,
            interventionCodes: [dto.interventionCode],
            serviceType: dto.serviceType as
              | 'CAPITATION'
              | 'OUTPATIENT'
              | 'INPATIENT',
            otp: dto.visitOtp,
            consentAuthorizationId: dto.consentAuthorizationId,
          },
          user,
        );
      });

      for (const item of activeItems) {
        await run(`LINE:${item.id}`, async () => {
          await this.addClaimLine(
            {
              patientId: claim.patientId,
              consentAuthorizationId: dto.consentAuthorizationId,
              interventionCode: dto.interventionCode,
              unitPrice: String(item.unitPrice),
              quantity: String(item.quantity),
              serviceName: item.description,
              serviceIdentifier: `${claim.claimNumber}/${item.id}`,
            },
            user,
          );
        });
      }

      await run('DIAGNOSIS', async () => {
        await this.addDiagnosis(
          {
            patientId: claim.patientId,
            consentAuthorizationId: dto.consentAuthorizationId,
            interventionCode: dto.interventionCode,
            icdCode: claim.diagnosisCode!,
          },
          user,
        );
      });

      await run('PREVIEW', async () => {
        await this.dha.executeApiOperation(
          'PREVIEW_PROVIDER_CLAIM',
          {},
          this.options(user, claim.patientId, dto.consentAuthorizationId),
        );
      });

      await run('DISPATCH', async () => {
        await this.dha.executeApiOperation(
          dto.serviceType === 'INPATIENT'
            ? 'DISCHARGE_INPATIENT'
            : 'SUBMIT_OUTPATIENT_CLAIM',
          dto.serviceType === 'INPATIENT' ? { otp: dto.dischargeOtp } : {},
          this.options(user, claim.patientId, dto.consentAuthorizationId),
        );
      });

      metadata.dhaSubmissionCompletedAt = new Date().toISOString();
      return await this.prisma.shaClaim.update({
        where: { id: claim.id },
        data: {
          statusCode: 'SUBMITTED',
          submittedAt: claim.submittedAt ?? new Date(),
          dhaSpecVersion: claim.dhaSpecVersion ?? this.config.dhaSpecVersion,
          metadata: metadata as Prisma.InputJsonValue,
        },
        include: { facility: true, patient: true, invoice: true },
      });
    } catch (error) {
      metadata.dhaSubmissionFailedAt = new Date().toISOString();
      metadata.dhaSubmissionFailureType =
        error instanceof Error ? error.name : 'UnknownError';
      await this.prisma.shaClaim.updateMany({
        where: { id: claim.id, statusCode: 'SUBMITTING' },
        data: {
          statusCode: 'DHA_SUBMISSION_FAILED',
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      throw error;
    }
  }
}
