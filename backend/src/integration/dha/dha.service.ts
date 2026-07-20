import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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
  type IntegrationCallContext,
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
  PatientContact,
  SendOtpRequest,
  SendOtpResponse,
  AuthorizeConsentRequest,
  AuthorizeConsentResponse,
  SendDischargeOtpRequest,
} from './dha.types';
import { FhirMapperService } from './fhir-mapper';
import type { TerminologyConceptRef } from './fhir-mapper';
import type { FhirBundle, FhirResource } from './fhir.types';
import { FhirSystemsService } from './fhir-systems';
import { FhirValidationService } from './fhir-validation.service';
import { SensitiveDataCipherService } from '../../common/security/sensitive-data-cipher.service';
import {
  type DhaApiOperation,
  type DhaApiPayload,
  dhaOperationRequires,
  redactDhaPayload,
} from './dha-api-contract';

export interface DhaOperationOptions {
  correlationId?: string;
  actorUserId?: number;
  actorStaffId?: number;
  facilityId?: number;
  branchId?: number;
  patientId?: number;
  consentAuthorizationId?: number;
  facilityRegistryId?: string;
  facilityRegistryIdType?: 'fr-code';
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
    private readonly sensitiveData: SensitiveDataCipherService,
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
    const context = await this.withFacilityIdentity(options);
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.PATIENT_VERIFICATION,
      'Patient',
      query,
      () => this.client.verifyPatient(query, context),
      options,
    );
  }

  async verifyPractitioner(
    query: PractitionerVerificationQuery,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    const context = await this.withFacilityIdentity(options);
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.PRACTITIONER_VERIFICATION,
      'Practitioner',
      query,
      () => this.client.verifyPractitioner(query, context),
      options,
    );
  }

  async verifyFacility(
    query: FacilityVerificationQuery,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    const context = await this.withFacilityIdentity(options, false);
    const outcome = await this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.FACILITY_VERIFICATION,
      'Organization',
      query,
      () => this.client.verifyFacility(query, context),
      options,
    );
    if (options.facilityId && outcome.result.status === 'VERIFIED') {
      await this.prisma.facility.update({
        where: { id: options.facilityId },
        data: {
          dhaFacilityId: query.facilityCode,
          dhaFacilityIdType: 'fr-code',
          dhaRegistryStatus: 'VERIFIED',
          dhaRegistryVerifiedAt: new Date(),
        },
      });
    }
    return outcome;
  }

  async checkEligibility(
    query: EligibilityQuery,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    const context = await this.withFacilityIdentity(options);
    const normalizedQuery: EligibilityQuery = {
      ...query,
      identificationNumber:
        query.identificationNumber ?? query.nationalId ?? query.memberNumber,
      identificationType:
        query.identificationType ??
        (query.nationalId
          ? 'National ID'
          : query.memberNumber
            ? 'SHA Number'
            : undefined),
    };
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.ELIGIBILITY_CHECK,
      'EligibilityQuery',
      normalizedQuery,
      () => this.client.checkEligibility(normalizedQuery, context),
      options,
    );
  }

  /**
   * Executes one operation from the closed July 2026 DHA API catalog. Secrets
   * such as OTPs, consent tokens, biometric GUIDs, and file bodies are never
   * written to the transaction evidence table.
   */
  async executeApiOperation(
    operation: DhaApiOperation,
    payload: DhaApiPayload,
    options: DhaOperationOptions = {},
  ) {
    this.assertEnabled();
    if (!options.facilityId) {
      throw new BadRequestException(
        'A facility-scoped user is required for DHA operations',
      );
    }
    if (!options.patientId) {
      throw new BadRequestException(
        'A local patient reference is required for DHA operations',
      );
    }
    const patient = await this.prisma.patient.findFirst({
      where: { id: options.patientId, facilityId: options.facilityId },
      select: {
        id: true,
        shaMemberNumber: true,
        dhaClientRegistryId: true,
      },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found in the active facility');
    }
    const facilityContext = await this.withFacilityIdentity(options);
    const operationOptions: DhaOperationOptions = {
      ...options,
      facilityRegistryId: facilityContext.facilityRegistryId,
      facilityRegistryIdType: facilityContext.facilityRegistryIdType,
    };

    const outboundPayload = { ...payload };
    const allowedExternalIds = [
      patient.dhaClientRegistryId,
      patient.shaMemberNumber,
    ].filter((value): value is string => Boolean(value));
    if ('patient_id' in outboundPayload) {
      if (
        typeof outboundPayload.patient_id !== 'string' ||
        !allowedExternalIds.includes(outboundPayload.patient_id)
      ) {
        throw new BadRequestException(
          'payload.patient_id does not belong to the selected local patient',
        );
      }
    }

    if ('consent_token' in outboundPayload) {
      throw new BadRequestException(
        'Do not send consent_token from the client; use consentAuthorizationId',
      );
    }
    const requiresConsentToken = dhaOperationRequires(
      operation,
      'consent_token',
    );
    if (options.consentAuthorizationId && !requiresConsentToken) {
      throw new BadRequestException(
        `${operation} does not accept a consent authorization`,
      );
    }
    if (requiresConsentToken && !options.consentAuthorizationId) {
      throw new BadRequestException(
        `${operation} requires consentAuthorizationId`,
      );
    }
    if (options.consentAuthorizationId) {
      const authorization = await this.prisma.consentAuthorization.findFirst({
        where: {
          id: options.consentAuthorizationId,
          patientId: patient.id,
          status: 'AUTHORIZED',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          consentTokenCiphertext: true,
          consentToken: true,
        },
      });
      if (!authorization) {
        throw new BadRequestException(
          'The selected DHA consent authorization is invalid or expired',
        );
      }
      const consentToken = authorization.consentTokenCiphertext
        ? this.sensitiveData.decrypt(authorization.consentTokenCiphertext)
        : authorization.consentToken;
      if (!consentToken) {
        throw new BadRequestException(
          'The selected DHA consent authorization has no usable token',
        );
      }
      outboundPayload.consent_token = consentToken;
    }
    return this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.API_OPERATION,
      operation,
      redactDhaPayload(outboundPayload),
      () =>
        this.client.executeApiOperation(
          operation,
          outboundPayload,
          this.ctx(operationOptions),
        ),
      options,
      true,
    );
  }

  async getPatientContacts(
    patientRegistryId: string,
    options: DhaOperationOptions,
  ): Promise<DhaResult<PatientContact[]>> {
    this.assertLiveFacilityScope(options);
    const context = await this.withFacilityIdentity(options);
    const outcome = await this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.API_OPERATION,
      'GET_PATIENT_CONTACTS',
      { patient_id: patientRegistryId },
      () => this.client.getPatientContacts(patientRegistryId, context),
      options,
      true,
    );
    return outcome.result as DhaResult<PatientContact[]>;
  }

  async sendVisitOtp(
    request: SendOtpRequest,
    options: DhaOperationOptions,
  ): Promise<DhaResult<SendOtpResponse>> {
    this.assertLiveFacilityScope(options);
    const context = await this.withFacilityIdentity(options);
    const outcome = await this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.API_OPERATION,
      'SEND_VISIT_OTP',
      request,
      () => this.client.sendVisitOtp(request, context),
      options,
      true,
    );
    return outcome.result as DhaResult<SendOtpResponse>;
  }

  async authorizeVisit(
    request: AuthorizeConsentRequest,
    options: DhaOperationOptions,
  ): Promise<DhaResult<AuthorizeConsentResponse>> {
    this.assertLiveFacilityScope(options);
    const context = await this.withFacilityIdentity(options);
    const outcome = await this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.API_OPERATION,
      'AUTHORIZE_VISIT',
      redactDhaPayload(request),
      () => this.client.createAuthorization(request, context),
      options,
      true,
    );
    return outcome.result as DhaResult<AuthorizeConsentResponse>;
  }

  async sendDischargeOtp(
    request: SendDischargeOtpRequest,
    options: DhaOperationOptions,
  ): Promise<DhaResult<SendOtpResponse>> {
    this.assertLiveFacilityScope(options);
    const context = await this.withFacilityIdentity(options);
    const outcome = await this.runSyncTransaction(
      DHA_TRANSACTION_TYPE.API_OPERATION,
      'SEND_DISCHARGE_OTP',
      request,
      () => this.client.sendDischargeOtp(request, context),
      options,
      true,
    );
    return outcome.result as DhaResult<SendOtpResponse>;
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
        diagnosisConcept: true,
        createdBy: true,
        invoice: {
          include: {
            items: { include: { billingService: true } },
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

    const facilityRegistryId =
      claim.facility.dhaFacilityId ?? claim.facility.shaFidCode;
    const patientRegistryId =
      claim.patient.dhaClientRegistryId ??
      claim.memberNumber ??
      claim.patient.shaMemberNumber;
    const practitioner = claim.invoice?.consultation?.doctor ?? claim.createdBy;
    const practitionerRegistryId = practitioner?.dhaPractitionerId;
    if (!facilityRegistryId) {
      throw new BadRequestException(
        'A verified DHA Facility Registry ID is required before claim submission',
      );
    }
    if (!patientRegistryId) {
      throw new BadRequestException(
        'A verified DHA Client Registry ID is required before claim submission',
      );
    }
    if (!practitioner || !practitionerRegistryId) {
      throw new BadRequestException(
        'A verified DHA Practitioner Registry ID is required before claim submission',
      );
    }
    if (!claim.servicePeriodStart || !claim.servicePeriodEnd) {
      throw new BadRequestException(
        'SHA claim servicePeriodStart and servicePeriodEnd are required',
      );
    }
    if (!claim.diagnosisConcept?.code || !claim.diagnosisConcept.display) {
      throw new BadRequestException(
        'A validated ICD-11 diagnosis concept is required before claim submission',
      );
    }

    const invoiceItems = (claim.invoice?.items ?? []).filter(
      (item) => !item.isRemoved && item.statusCode !== 'CANCELLED',
    );
    if (invoiceItems.length === 0) {
      throw new BadRequestException(
        'At least one invoice service item is required for a SHA claim',
      );
    }
    const unsupportedItem = invoiceItems.find(
      (item) =>
        !item.billingService?.code ||
        !/^(SHA|PFMS|POMF)-/i.test(item.billingService.code),
    );
    if (unsupportedItem) {
      throw new BadRequestException(
        `Invoice item ${unsupportedItem.id} is not mapped to an official SHA/PFMS intervention code`,
      );
    }

    const externalClaimId = claim.dhaExternalClaimId ?? randomUUID();
    if (!claim.dhaExternalClaimId) {
      await this.prisma.shaClaim.update({
        where: { id: claim.id },
        data: {
          dhaExternalClaimId: externalClaimId,
          dhaSpecVersion: this.config.dhaSpecVersion,
        },
      });
    }

    const fhirBase = this.config.dhaFhirBaseUrl.replace(/\/+$/, '');
    const organizationUrl = `${fhirBase}/Organization/${facilityRegistryId}`;
    const patientUrl = `${fhirBase}/Patient/${patientRegistryId}`;
    const practitionerUrl = `${fhirBase}/Practitioner/${practitionerRegistryId}`;
    const coverageId = `${patientRegistryId}-sha-coverage`;
    const coverageUrl = `${fhirBase}/Coverage/${coverageId}`;
    const claimUrl = `${fhirBase}/Claim/${externalClaimId}`;
    const claimItems = invoiceItems.map((item, index) => ({
      sequence: index + 1,
      productOrService: {
        coding: [
          {
            system: `${fhirBase}/CodeSystem/intervention-codes`,
            code: item.billingService!.code,
            display: item.billingService!.name,
          },
        ],
      },
      servicedPeriod: {
        start: claim.servicePeriodStart!.toISOString(),
        end: claim.servicePeriodEnd!.toISOString(),
      },
      quantity: { value: item.quantity },
      unitPrice: { value: Number(item.unitPrice), currency: 'KES' },
      factor: 1,
      net: { value: Number(item.lineTotal), currency: 'KES' },
      category: {
        coding: [
          {
            system: `${fhirBase}/CodeSystem/category-codes`,
            code: 'procedure',
            display: 'Procedure',
          },
        ],
      },
    }));
    const calculatedTotal = claimItems.reduce(
      (sum, item) => sum + item.net.value,
      0,
    );
    if (Math.abs(calculatedTotal - Number(claim.claimedAmount)) > 0.01) {
      throw new BadRequestException(
        'Claim total must equal the sum of all intervention net amounts',
      );
    }

    const resources: FhirResource[] = [
      {
        resourceType: 'Organization',
        id: facilityRegistryId,
        meta: {
          profile: [
            `${fhirBase}/StructureDefinition/provider-organization|1.0.0`,
          ],
        },
        name: claim.facility.name,
        active: true,
        identifier: [
          {
            use: 'official',
            type: {
              coding: [
                {
                  system: `${fhirBase}/terminology/CodeSystem/facility-identifier-types`,
                  code: 'fr-code',
                  display: 'Code',
                },
              ],
            },
            value: facilityRegistryId,
          },
        ],
        type: [
          {
            coding: [
              {
                system: `${fhirBase}/terminology/CodeSystem/organization-type`,
                code: 'prov',
              },
            ],
          },
        ],
      },
      {
        resourceType: 'Coverage',
        id: coverageId,
        identifier: [{ use: 'official', value: coverageId }],
        status: 'active',
        beneficiary: { reference: patientUrl, type: 'Patient' },
        extension: [
          {
            url: `${fhirBase}/StructureDefinition/schemeCategoryCode`,
            valueString: 'CAT-SHA-001',
          },
          {
            url: `${fhirBase}/StructureDefinition/schemeCategoryName`,
            valueString: 'SOCIAL HEALTH AUTHORITY',
          },
        ],
      },
      {
        ...this.mapper.toFhirPatient(claim.patient),
        id: patientRegistryId,
        meta: { profile: [`${fhirBase}/StructureDefinition/patient|1.0.0`] },
        identifier: [
          {
            use: 'official',
            system: `${fhirBase}/identifier/shanumber`,
            value: patientRegistryId,
          },
        ],
      },
      {
        ...this.mapper.toFhirPractitioner({
          id: practitioner.id,
          firstName: practitioner.firstName,
          lastName: practitioner.lastName,
          registrationNumber: practitioner.clinicianRegistrationNumber,
          cadre: practitioner.designation,
        }),
        id: practitionerRegistryId,
        meta: {
          profile: [`${fhirBase}/StructureDefinition/practitioner|1.0.0`],
        },
      },
      {
        resourceType: 'Claim',
        id: externalClaimId,
        identifier: [{ system: `${fhirBase}/claim`, value: externalClaimId }],
        status: 'active',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/claim-type',
              code: 'institutional',
            },
          ],
        },
        subType: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/ex-claimsubtype',
              code: claim.invoice?.admissionId ? 'ip' : 'op',
            },
          ],
        },
        use: 'claim',
        patient: { reference: patientUrl, type: 'Patient' },
        billablePeriod: {
          start: claim.servicePeriodStart.toISOString(),
          end: claim.servicePeriodEnd.toISOString(),
        },
        created: new Date().toISOString(),
        provider: { reference: organizationUrl, type: 'Organization' },
        priority: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/processpriority',
              code: 'normal',
            },
          ],
        },
        careTeam: [
          {
            sequence: 1,
            provider: {
              reference: practitionerUrl,
              type: 'Practitioner',
              display: [practitioner.firstName, practitioner.lastName]
                .filter(Boolean)
                .join(' '),
            },
          },
        ],
        diagnosis: [
          {
            sequence: 1,
            diagnosisCodeableConcept: {
              coding: [
                {
                  system: `${fhirBase}/terminology/CodeSystem/icd-11`,
                  code: claim.diagnosisConcept.code,
                  display: claim.diagnosisConcept.display,
                },
              ],
            },
          },
        ],
        insurance: [
          {
            sequence: 1,
            focal: true,
            coverage: { reference: coverageUrl },
          },
        ],
        item: claimItems,
        total: { value: calculatedTotal, currency: 'KES' },
      },
    ];

    const fullUrls = [
      organizationUrl,
      coverageUrl,
      patientUrl,
      practitionerUrl,
      claimUrl,
    ];
    const bundle: FhirBundle = {
      resourceType: 'Bundle',
      id: externalClaimId,
      meta: {
        profile: [`${fhirBase}/StructureDefinition/bundle|1.0.0`],
      },
      timestamp: new Date().toISOString(),
      type: 'message',
      entry: resources.map((resource, index) => ({
        fullUrl: fullUrls[index],
        resource,
      })),
    };
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
          primaryDiagnosis:
            (
              consultation as unknown as {
                primaryDiagnosis: TerminologyConceptRef;
              }
            ).primaryDiagnosis ?? null,
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

    const ctx: IntegrationCallContext = {
      correlationId: item.correlationId ?? undefined,
      facilityId: transaction.facilityId,
    };

    if (transaction.patientId) {
      // Find active consent for this patient (and specifically this consultation if linked)
      const consentWhere: Prisma.ConsentAuthorizationWhereInput = {
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
        const storedToken =
          activeConsent.consentTokenCiphertext ?? activeConsent.consentToken;
        if (storedToken) {
          ctx.consentToken = this.sensitiveData.decrypt(storedToken);
        }
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
      facilityRegistryId: options.facilityRegistryId,
      facilityRegistryIdType: options.facilityRegistryIdType,
    };
  }

  private async withFacilityIdentity(
    options: DhaOperationOptions,
    requireVerified = true,
  ): Promise<IntegrationCallContext> {
    if (!options.facilityId) return this.ctx(options);
    const facility = await this.prisma.facility.findUnique({
      where: { id: options.facilityId },
      select: {
        dhaFacilityId: true,
        dhaFacilityIdType: true,
        dhaRegistryStatus: true,
      },
    });
    if (!facility) throw new NotFoundException('Facility not found');
    if (
      requireVerified &&
      this.config.dhaMode !== 'mock' &&
      (!facility.dhaFacilityId ||
        facility.dhaFacilityIdType !== 'fr-code' ||
        facility.dhaRegistryStatus !== 'VERIFIED')
    ) {
      throw new BadRequestException(
        'The active facility must have a verified DHA Facility Registry fr-code',
      );
    }
    return this.ctx({
      ...options,
      facilityRegistryId: facility.dhaFacilityId ?? undefined,
      facilityRegistryIdType: 'fr-code',
    });
  }

  private assertLiveFacilityScope(options: DhaOperationOptions) {
    this.assertEnabled();
    if (!options.facilityId || !options.patientId) {
      throw new BadRequestException(
        'A facility-scoped local patient is required for DHA operations',
      );
    }
  }

  private async runSyncTransaction(
    transactionType: DhaTransactionType,
    fhirResourceType: string,
    requestPayload: unknown,
    call: () => Promise<DhaResult>,
    options: DhaOperationOptions,
    redactResponse = false,
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
          responsePayload: (redactResponse
            ? redactDhaPayload(result.raw ?? {})
            : (result.raw ?? {})) as Prisma.InputJsonValue,
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

  async pollClaimStatus(claimId: number, facilityId?: number) {
    this.assertEnabled();
    if (!facilityId) {
      throw new BadRequestException('A facility-scoped account is required');
    }
    const claim = await this.prisma.shaClaim.findFirst({
      where: { id: claimId, facilityId },
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
      QUEUED: 'PENDING',
      ACCEPTED: 'ACCEPTED',
      APPROVED: 'ACCEPTED',
      'IN-REVIEW': 'PENDING',
      'CLINICAL-REVIEW': 'PENDING',
      'SENT-FOR-PAYMENT-PROCESSING': 'ACCEPTED',
      'SENT-TO-SURVEILLANCE': 'PENDING',
      'PAYMENT-COMPLETED': 'PAID',
      'PAYMENT-DECLINED': 'REJECTED',
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
