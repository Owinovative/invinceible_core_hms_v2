import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationAuditService } from '../integration-audit.service';
import { IntegrationConfigService } from '../integration-config.service';
import { IntegrationLoggerService } from '../integration-logger.service';
import {
  DHA_CLIENT,
  DHA_OPERATIONS,
  DHA_TRANSACTION_STATUS,
  DHA_TRANSACTION_TYPE,
  INTEGRATION_NAMES,
  type DhaTransactionType,
} from '../integration.constants';
import {
  NonRetryableIntegrationError,
  type OutboundQueueItem,
} from '../integration.types';
import { toErrorMessage } from '../http/retry-policy';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import { IntegrationQueueWorker } from '../queue/integration-queue.worker';
import type {
  DhaClientPort,
  DhaResult,
  EligibilityQuery,
  FacilityVerificationQuery,
  PatientVerificationQuery,
  PractitionerVerificationQuery,
} from './dha.types';
import { FhirMapperService } from './fhir-mapper';
import type { FhirBundle, FhirResource } from './fhir.types';
import { FhirSystemsService } from './fhir-systems';
import { FhirValidationService } from './fhir-validation.service';

interface DhaOperationOptions {
  correlationId?: string;
  actorUserId?: number;
  actorStaffId?: number;
  facilityId?: number;
  branchId?: number;
  patientId?: number;
}

/**
 * Business-facing DHA service. Clinical and claims modules call these
 * methods only — never a DHA API client directly. Synchronous operations
 * (verifications, eligibility) call the adapter inline and record a
 * DhaTransaction; document submissions (encounters, claims, referrals) ride
 * the durable outbound queue with automatic retry and recovery.
 */
@Injectable()
export class DhaService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: IntegrationConfigService,
    private readonly queue: IntegrationQueueService,
    private readonly worker: IntegrationQueueWorker,
    private readonly mapper: FhirMapperService,
    private readonly audit: IntegrationAuditService,
    private readonly logger: IntegrationLoggerService,
    private readonly systems: FhirSystemsService,
    private readonly fhirValidator: FhirValidationService,
    @Inject(DHA_CLIENT) private readonly client: DhaClientPort,
  ) {}

  onModuleInit() {
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.SUBMIT_CLAIM,
      (item) => this.handleQueuedTransaction(item),
    );
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.SUBMIT_ENCOUNTER,
      (item) => this.handleQueuedTransaction(item),
    );
    this.worker.registerHandler(
      INTEGRATION_NAMES.DHA,
      DHA_OPERATIONS.SUBMIT_REFERRAL,
      (item) => this.handleQueuedTransaction(item),
    );
  }

  get enabled(): boolean {
    return this.config.dhaEnabled;
  }

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new BadRequestException(
        'DHA integration is disabled (set DHA_ENABLED=true)',
      );
    }
  }

  // --- Synchronous verification operations --------------------------------

  async verifyPatient(
    query: PatientVerificationQuery,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.PATIENT_VERIFICATION,
      'Patient',
      query,
      () => this.client.verifyPatient(query, this.ctx(options)),
      options,
    );
  }

  async verifyPractitioner(
    query: PractitionerVerificationQuery,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.PRACTITIONER_VERIFICATION,
      'Practitioner',
      query,
      () => this.client.verifyPractitioner(query, this.ctx(options)),
      options,
    );
  }

  async verifyFacility(
    query: FacilityVerificationQuery,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.FACILITY_VERIFICATION,
      'Organization',
      query,
      () => this.client.verifyFacility(query, this.ctx(options)),
      options,
    );
  }

  async checkEligibility(
    query: EligibilityQuery,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    const request = this.mapper.toEligibilityRequest({
      memberNumber: query.memberNumber,
      nationalId: query.nationalId,
      serviceDate: query.serviceDate,
    });
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.ELIGIBILITY_CHECK,
      'CoverageEligibilityRequest',
      request,
      () => this.client.checkEligibility(request, this.ctx(options)),
      options,
    );
  }

  async recordConsent(
    params: { patientId: number; permit: boolean; purposeCode?: string },
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    const patient = await this.prisma.patient.findUnique({
      where: { id: params.patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${params.patientId} not found`);
    }
    const consent = this.mapper.toFhirConsent({
      patientRef: `Patient/${patient.patientNumber}`,
      permit: params.permit,
      purposeCode: params.purposeCode,
    });
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.CONSENT,
      'Consent',
      consent,
      () => this.client.recordConsent(consent, this.ctx(options)),
      {
        ...options,
        patientId: params.patientId,
        facilityId: patient.facilityId,
      },
    );
  }

  // --- Queued document submissions -----------------------------------------

  /**
   * Called by the SHA claims module when a claim moves to SUBMITTED.
   * Queues a FHIR claim bundle for the DHA/SHA platform. Never throws into
   * the caller's flow when DHA is disabled.
   */
  async onShaClaimSubmitted(
    shaClaimId: number,
    options: DhaOperationOptions = {},
  ) {
    if (!this.enabled) {
      return { skipped: true as const, reason: 'DHA_DISABLED' };
    }

    const claim = await this.prisma.shaClaim.findUnique({
      where: { id: shaClaimId },
      include: {
        patient: true,
        facility: true,
        invoice: {
          include: {
            consultation: {
              include: { doctor: true },
            },
          },
        },
      },
    });
    if (!claim) {
      throw new NotFoundException(`SHA claim ${shaClaimId} not found`);
    }

    const resources: FhirResource[] = [
      this.mapper.toFhirPatient(claim.patient),
      this.mapper.toFhirOrganization(claim.facility),
    ];

    let encounterRef: string | undefined = undefined;
    if (claim.invoice?.consultation) {
      const consultation = claim.invoice.consultation;
      if (consultation.doctor) {
        resources.push(
          this.mapper.toFhirPractitioner({
            id: consultation.doctor.id,
            firstName: consultation.doctor.firstName,
            lastName: consultation.doctor.lastName,
            registrationNumber: consultation.doctor.clinicianRegistrationNumber,
            cadre: consultation.doctor.designation,
          }),
        );
      }

      const encounter = this.mapper.toFhirEncounter(
        {
          id: consultation.id,
          patientId: consultation.patientId,
          encounterClass: 'AMB',
          endedAt: consultation.completedAt ?? consultation.startedAt,
          startedAt: consultation.startedAt,
          practitionerRef: consultation.doctor
            ? `Practitioner/${consultation.doctor.staffCode ?? consultation.doctor.id}`
            : undefined,
          // Prefer structured TerminologyConcept; fall back to legacy free-text strings
          primaryDiagnosis: (claim as any).diagnosisConcept ?? null,
          diagnosisCode: claim.diagnosisCode ?? undefined,
          diagnosisText: claim.diagnosisText ?? undefined,
        },
        `Patient/${claim.patient.patientNumber}`,
        `Organization/${claim.facility.code}`,
      );
      encounter.id = `enc-${consultation.id}`;
      resources.push(encounter);
      encounterRef = `Encounter/enc-${consultation.id}`;
    }

    resources.push({
      resourceType: 'Claim',
      status: 'active',
      use: 'claim',
      patient: { reference: `Patient/${claim.patient.patientNumber}` },
      provider: { reference: `Organization/${claim.facility.code}` },
      identifier: [{ system: 'urn:hms:sha-claim', value: claim.claimNumber }],
      total: { value: claim.claimedAmount, currency: 'KES' },
      ...(encounterRef ? { encounter: [{ reference: encounterRef }] } : {}),
      ...(() => {
        const concept = (claim as any).diagnosisConcept;
        if (concept) {
          // Preferred path: structured TerminologyConcept → full FHIR CodeableConcept
          return {
            diagnosis: [
              {
                sequence: 1,
                diagnosisCodeableConcept: {
                  coding: [
                    {
                      system: concept.system,
                      code: concept.code,
                      display: concept.display,
                      ...(concept.version ? { version: concept.version } : {}),
                    },
                  ],
                  text: concept.display,
                },
              },
            ],
          };
        }
        // Legacy fallback path
        if (claim.diagnosisCode || claim.diagnosisText) {
          return {
            diagnosis: [
              {
                sequence: 1,
                diagnosisCodeableConcept: {
                  coding: claim.diagnosisCode
                    ? [
                        {
                          system: this.systems.icd11,
                          code: claim.diagnosisCode,
                        },
                      ]
                    : undefined,
                  text: claim.diagnosisText ?? undefined,
                },
              },
            ],
          };
        }
        return {};
      })(),
    } as FhirResource);

    const bundle = this.mapper.toTransactionBundle(resources);
    this.fhirValidator.validateBundle(bundle);

    const transaction = await this.createTransaction({
      transactionType: DHA_TRANSACTION_TYPE.CLAIM_SUBMISSION,
      fhirResourceType: 'Bundle',
      requestPayload: bundle,
      statusCode: DHA_TRANSACTION_STATUS.QUEUED,
      patientId: claim.patientId,
      invoiceId: claim.invoiceId ?? undefined,
      shaClaimId: claim.id,
      facilityId: claim.facilityId,
      branchId: claim.branchId ?? undefined,
      correlationId: options.correlationId,
    });

    await this.queue.enqueue({
      integration: INTEGRATION_NAMES.DHA,
      operation: DHA_OPERATIONS.SUBMIT_CLAIM,
      entityType: 'DHA_TRANSACTION',
      entityId: String(transaction.id),
      payload: { dhaTransactionId: transaction.id },
      idempotencyKey: `dha:claim:${claim.id}:tx:${transaction.id}`,
      correlationId: options.correlationId,
      facilityId: claim.facilityId,
      branchId: claim.branchId ?? undefined,
    });

    await this.audit.recordEvent({
      moduleName: 'DHA',
      actionName: 'CLAIM_SUBMISSION_QUEUED',
      entityType: 'SHA_CLAIM',
      entityId: String(claim.id),
      description: `DHA claim submission queued for SHA claim ${claim.claimNumber}`,
      facilityId: claim.facilityId,
      branchId: claim.branchId ?? undefined,
      actorUserId: options.actorUserId,
      actorStaffId: options.actorStaffId,
    });

    return { skipped: false as const, transaction };
  }

  /** Queues an encounter submission for a completed consultation. */
  async submitEncounterForConsultation(
    consultationId: number,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { patient: true, facility: true, doctor: true },
    });
    if (!consultation) {
      throw new NotFoundException(`Consultation ${consultationId} not found`);
    }

    const patientRef = `Patient/${consultation.patient.patientNumber}`;
    const facilityRef = `Organization/${consultation.facility.code}`;
    const bundle = this.mapper.toTransactionBundle([
      this.mapper.toFhirPatient(consultation.patient),
      this.mapper.toFhirOrganization(consultation.facility),
      this.mapper.toFhirPractitioner({
        id: consultation.doctor.id,
        firstName: consultation.doctor.firstName,
        lastName: consultation.doctor.lastName,
        registrationNumber: consultation.doctor.clinicianRegistrationNumber,
        cadre: consultation.doctor.designation,
      }),
      this.mapper.toFhirEncounter(
        {
          id: consultation.id,
          patientId: consultation.patientId,
          startedAt: consultation.startedAt,
          endedAt: consultation.completedAt,
          encounterClass: 'AMB',
          // Prefer structured TerminologyConcept; fall back to legacy free-text
          primaryDiagnosis: (consultation as any).primaryDiagnosis ?? null,
          diagnosisText: consultation.diagnosis ?? undefined,
          practitionerRef: `Practitioner/${consultation.doctor.staffCode}`,
        },
        patientRef,
        facilityRef,
      ),
    ]);
    this.fhirValidator.validateBundle(bundle);

    const transaction = await this.createTransaction({
      transactionType: DHA_TRANSACTION_TYPE.ENCOUNTER_SUBMISSION,
      fhirResourceType: 'Bundle',
      requestPayload: bundle,
      statusCode: DHA_TRANSACTION_STATUS.QUEUED,
      patientId: consultation.patientId,
      consultationId: consultation.id,
      facilityId: consultation.facilityId,
      branchId: consultation.branchId ?? undefined,
      correlationId: options.correlationId,
    });

    await this.queue.enqueue({
      integration: INTEGRATION_NAMES.DHA,
      operation: DHA_OPERATIONS.SUBMIT_ENCOUNTER,
      entityType: 'DHA_TRANSACTION',
      entityId: String(transaction.id),
      payload: { dhaTransactionId: transaction.id },
      idempotencyKey: `dha:encounter:${consultation.id}:tx:${transaction.id}`,
      correlationId: options.correlationId,
      facilityId: consultation.facilityId,
      branchId: consultation.branchId ?? undefined,
    });

    return { transaction };
  }

  /** Queues a referral (FHIR ServiceRequest) to another facility. */
  async submitReferral(
    params: {
      patientId: number;
      reason: string;
      serviceText?: string;
      targetFacilityCode?: string;
    },
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    const patient = await this.prisma.patient.findUnique({
      where: { id: params.patientId },
      include: { facility: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${params.patientId} not found`);
    }

    const referral = this.mapper.toFhirReferral({
      patientRef: `Patient/${patient.patientNumber}`,
      requesterRef: `Organization/${patient.facility.code}`,
      performerFacilityRef: params.targetFacilityCode
        ? `Organization/${params.targetFacilityCode}`
        : undefined,
      reason: params.reason,
      serviceText: params.serviceText,
    });

    const transaction = await this.createTransaction({
      transactionType: DHA_TRANSACTION_TYPE.REFERRAL,
      fhirResourceType: 'ServiceRequest',
      requestPayload: referral,
      statusCode: DHA_TRANSACTION_STATUS.QUEUED,
      patientId: patient.id,
      facilityId: patient.facilityId,
      correlationId: options.correlationId,
    });

    await this.queue.enqueue({
      integration: INTEGRATION_NAMES.DHA,
      operation: DHA_OPERATIONS.SUBMIT_REFERRAL,
      entityType: 'DHA_TRANSACTION',
      entityId: String(transaction.id),
      payload: { dhaTransactionId: transaction.id },
      idempotencyKey: `dha:referral:tx:${transaction.id}`,
      correlationId: options.correlationId,
      facilityId: patient.facilityId,
    });

    return { transaction };
  }

  // --- Queue handler -------------------------------------------------------

  private async handleQueuedTransaction(
    item: OutboundQueueItem,
  ): Promise<void> {
    const payload = (item.payload ?? {}) as { dhaTransactionId?: number };
    if (!payload.dhaTransactionId) {
      throw new NonRetryableIntegrationError(
        'Queue payload is missing dhaTransactionId',
      );
    }

    const transaction = await this.prisma.dhaTransaction.findUnique({
      where: { id: payload.dhaTransactionId },
    });
    if (!transaction) {
      throw new NonRetryableIntegrationError(
        `DHA transaction ${payload.dhaTransactionId} not found`,
      );
    }
    if (transaction.statusCode === DHA_TRANSACTION_STATUS.COMPLETED) {
      return;
    }

    const ctx: any = {
      correlationId: item.correlationId ?? undefined,
      facilityId: transaction.facilityId,
    };

    if (transaction.patientId) {
      // Find active consent for this patient (and specifically this consultation if linked)
      const consentWhere: any = {
        patientId: transaction.patientId,
        status: 'AUTHORIZED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      };

      if (transaction.consultationId) {
        consentWhere.consultationId = transaction.consultationId;
      }

      const activeConsent = await this.prisma.consentAuthorization.findFirst({
        where: consentWhere,
        orderBy: { createdAt: 'desc' },
      });

      if (activeConsent) {
        ctx.consentToken = activeConsent.consentToken;
      }
    }

    const requestPayload = transaction.requestPayload as unknown as FhirBundle;

    try {
      let result: DhaResult;
      switch (transaction.transactionType) {
        case DHA_TRANSACTION_TYPE.CLAIM_SUBMISSION:
          result = await this.client.submitClaim(requestPayload, ctx);
          break;
        case DHA_TRANSACTION_TYPE.ENCOUNTER_SUBMISSION:
          result = await this.client.submitEncounter(requestPayload, ctx);
          break;
        case DHA_TRANSACTION_TYPE.REFERRAL:
          result = await this.client.submitReferral(
            requestPayload as never,
            ctx,
          );
          break;
        default:
          throw new NonRetryableIntegrationError(
            `Unsupported queued DHA transaction type ${transaction.transactionType}`,
          );
      }

      await this.prisma.dhaTransaction.update({
        where: { id: transaction.id },
        data: {
          statusCode:
            result.status === 'REJECTED'
              ? DHA_TRANSACTION_STATUS.FAILED
              : DHA_TRANSACTION_STATUS.COMPLETED,
          externalRef: result.externalRef ?? null,
          responsePayload: (result.raw ?? {}) as Prisma.InputJsonValue,
          errorMessage: null,
          submittedAt: transaction.submittedAt ?? new Date(),
          completedAt: new Date(),
          apiVersion: this.config.dhaApiVersion,
        },
      });

      await this.audit.recordEvent({
        moduleName: 'DHA',
        actionName: `${transaction.transactionType}_${result.status}`,
        entityType: 'DHA_TRANSACTION',
        entityId: String(transaction.id),
        description: `DHA ${transaction.transactionType} ${result.status}${result.externalRef ? ` (ref ${result.externalRef})` : ''}`,
        facilityId: transaction.facilityId,
        branchId: transaction.branchId ?? undefined,
      });

      if (result.status === 'REJECTED') {
        throw new NonRetryableIntegrationError(
          `DHA rejected ${transaction.transactionType} for transaction ${transaction.id}`,
        );
      }
    } catch (error) {
      if (!(error instanceof NonRetryableIntegrationError)) {
        await this.prisma.dhaTransaction.update({
          where: { id: transaction.id },
          data: {
            errorMessage: toErrorMessage(error).slice(0, 4_000),
            submittedAt: transaction.submittedAt ?? new Date(),
          },
        });
      }
      throw error;
    }
  }

  // --- Queries -------------------------------------------------------------

  async listTransactions(params: {
    facilityId?: number;
    patientId?: number;
    transactionType?: string;
    limit?: number;
  }) {
    return this.prisma.dhaTransaction.findMany({
      where: {
        facilityId: params.facilityId,
        patientId: params.patientId,
        transactionType: params.transactionType,
      },
      orderBy: { id: 'desc' },
      take: Math.min(Math.max(params.limit ?? 50, 1), 200),
    });
  }

  // --- Helpers -------------------------------------------------------------

  private ctx(options: DhaOperationOptions) {
    return {
      correlationId: options.correlationId,
      facilityId: options.facilityId,
    };
  }

  private async runSyncTransaction(
    transactionType: DhaTransactionType,
    fhirResourceType: string,
    requestPayload: unknown,
    call: () => Promise<DhaResult>,
    options: DhaOperationOptions,
  ) {
    const transaction = await this.createTransaction({
      transactionType,
      fhirResourceType,
      requestPayload,
      statusCode: DHA_TRANSACTION_STATUS.PENDING,
      patientId: options.patientId,
      facilityId: options.facilityId ?? 0,
      branchId: options.branchId,
      correlationId: options.correlationId,
    });

    try {
      const result = await call();
      const updated = await this.prisma.dhaTransaction.update({
        where: { id: transaction.id },
        data: {
          statusCode: DHA_TRANSACTION_STATUS.COMPLETED,
          externalRef: result.externalRef ?? null,
          responsePayload: (result.raw ?? {}) as Prisma.InputJsonValue,
          submittedAt: new Date(),
          completedAt: new Date(),
          apiVersion: this.config.dhaApiVersion,
        },
      });
      return { result, transaction: updated };
    } catch (error) {
      await this.prisma.dhaTransaction.update({
        where: { id: transaction.id },
        data: {
          statusCode: DHA_TRANSACTION_STATUS.FAILED,
          errorMessage: toErrorMessage(error).slice(0, 4_000),
          submittedAt: new Date(),
        },
      });
      this.logger.warn('DHA synchronous operation failed', {
        transactionType,
        transactionId: transaction.id,
        error: toErrorMessage(error),
        correlationId: options.correlationId,
      });
      throw error;
    }
  }

  async pollClaimStatus(claimId: number) {
    this.assertEnabled();
    const claim = await this.prisma.shaClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new NotFoundException(`SHA claim ${claimId} not found`);
    }

    try {
      const response = await this.client.pollClaimResponse(
        claim.claimNumber,
        this.ctx({}),
      );

      let newStatus = claim.statusCode;
      if (response.status === 'ACCEPTED') {
        newStatus = 'ACCEPTED';
      } else if (response.status === 'SETTLED') {
        newStatus = 'PAID';
      } else if (response.status === 'REJECTED') {
        newStatus = 'REJECTED';
      }

      if (newStatus !== claim.statusCode) {
        await this.prisma.shaClaim.update({
          where: { id: claimId },
          data: { statusCode: newStatus },
        });
      }

      return response;
    } catch (error) {
      this.logger.error(`Failed to poll claim ${claim.claimNumber}`, {
        error,
        claimId,
      });
      throw error;
    }
  }

  /**
   * Handles a DHA push webhook — updates the ShaClaim record immediately
   * without requiring the scheduled poller to run first.
   */
  async handleClaimStatusCallback(params: {
    claimNumber: string;
    status: string;
  }) {
    const claim = await this.prisma.shaClaim.findUnique({
      where: { claimNumber: params.claimNumber },
    });
    if (!claim) {
      this.logger.warn(
        `Claim status callback for unknown claim: ${params.claimNumber}`,
      );
      return { skipped: true };
    }

    const statusMap: Record<string, string> = {
      ACCEPTED: 'ACCEPTED',
      APPROVED: 'ACCEPTED',
      SETTLED: 'PAID',
      PAID: 'PAID',
      REJECTED: 'REJECTED',
      DENIED: 'REJECTED',
      PENDING: 'PENDING',
    };
    const newStatus =
      statusMap[params.status.toUpperCase()] ?? claim.statusCode;

    if (newStatus !== claim.statusCode) {
      await this.prisma.shaClaim.update({
        where: { id: claim.id },
        data: {
          statusCode: newStatus,
          approvedAt: ['ACCEPTED', 'APPROVED'].includes(newStatus)
            ? new Date()
            : undefined,
          paidAt: newStatus === 'PAID' ? new Date() : undefined,
        },
      });

      await this.audit.recordEvent({
        moduleName: 'DHA',
        actionName: 'CLAIM_STATUS_CALLBACK',
        entityType: 'SHA_CLAIM',
        entityId: String(claim.id),
        description: `DHA webhook updated claim ${claim.claimNumber} → ${newStatus}`,
        facilityId: claim.facilityId,
      });
    }

    return { updated: true, claimId: claim.id, newStatus };
  }

  private async createTransaction(params: {
    transactionType: DhaTransactionType;
    fhirResourceType: string;
    requestPayload: unknown;
    statusCode: string;
    patientId?: number;
    invoiceId?: number;
    shaClaimId?: number;
    consultationId?: number;
    facilityId: number;
    branchId?: number;
    correlationId?: string;
  }) {
    return this.prisma.dhaTransaction.create({
      data: {
        transactionType: params.transactionType,
        statusCode: params.statusCode,
        fhirResourceType: params.fhirResourceType,
        apiVersion: this.config.dhaApiVersion,
        requestPayload: (params.requestPayload ?? {}) as Prisma.InputJsonValue,
        correlationId: params.correlationId ?? null,
        patientId: params.patientId ?? null,
        invoiceId: params.invoiceId ?? null,
        shaClaimId: params.shaClaimId ?? null,
        consultationId: params.consultationId ?? null,
        facilityId: params.facilityId,
        branchId: params.branchId ?? null,
      },
    });
  }
}
