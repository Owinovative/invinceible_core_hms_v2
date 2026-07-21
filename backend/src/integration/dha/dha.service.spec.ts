import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DhaService } from './dha.service';
import { FhirMapperService } from './fhir-mapper';
import { FhirSystemsService } from './fhir-systems';
import { FhirValidationService } from './fhir-validation.service';
import { DhaMockClient } from './adapters/dha-mock.client';
import { DhaApiError, type DhaClientPort } from './dha.types';
import { IntegrationQueueService } from '../queue/integration-queue.service';
import { IntegrationQueueWorker } from '../queue/integration-queue.worker';
import { InMemoryPrisma } from '../testing/in-memory-prisma';
import { makeAudit, makeConfig, makeLogger } from '../testing/test-support';

describe('DhaService', () => {
  let prisma: InMemoryPrisma;
  let queue: IntegrationQueueService;
  let worker: IntegrationQueueWorker;
  let service: DhaService;
  let facilityId: number;
  let patientId: number;
  let shaClaimId: number;
  let consultationId: number;

  function buildService(
    overrides: Record<string, string> = {},
    clientOverride?: DhaClientPort,
  ) {
    const config = makeConfig(overrides);
    const logger = makeLogger();
    queue = new IntegrationQueueService(prisma as never, config, logger);
    worker = new IntegrationQueueWorker(queue, config, logger);
    const mockConfigService = { get: () => 'https://fhir.sha.go.ke' };
    const systems = new FhirSystemsService(mockConfigService as any);
    const mapper = new FhirMapperService(systems);
    const fhirValidator = new FhirValidationService();
    service = new DhaService(
      prisma as never,
      config,
      queue,
      worker,
      mapper,
      makeAudit(prisma),
      logger,
      systems,
      fhirValidator,
      { decrypt: (value: string) => value } as never,
      clientOverride ?? new DhaMockClient(),
    );
    service.onModuleInit();
    return service;
  }

  beforeEach(async () => {
    prisma = new InMemoryPrisma();
    const facility = await prisma.facility.create({
      data: {
        code: 'FAC001',
        name: 'Mock Hospital',
        dhaFacilityId: 'FID-01-000001-1',
        facilityType: 'HOSPITAL',
        county: 'Nairobi',
      },
    });
    facilityId = facility.id;
    const patient = await prisma.patient.create({
      data: {
        patientNumber: 'PT-000001',
        firstName: 'John',
        lastName: 'Otieno',
        gender: 'MALE',
        dateOfBirth: new Date('1985-01-15'),
        phonePrimary: '+254711000000',
        dhaClientRegistryId: 'CR7000000000001-1',
        facilityId,
      },
    });
    patientId = patient.id;
    const claim = await prisma.shaClaim.create({
      data: {
        claimNumber: 'SHA-000001',
        statusCode: 'SUBMITTED',
        claimedAmount: 12_000,
        diagnosisCode: 'J18.9',
        diagnosisText: 'Pneumonia',
        patientId,
        facilityId,
        invoiceId: null,
        branchId: null,
      },
    });
    shaClaimId = claim.id;
    const doctor = await prisma.staff.create({
      data: {
        staffCode: 'ST-001',
        firstName: 'Achieng',
        lastName: 'Odhiambo',
        designation: 'Medical Officer',
        clinicianRegistrationNumber: 'KMPDC-12345',
        dhaPractitionerId: 'PUID-2026-000001-1',
        facilityId,
      },
    });
    const consultation = await prisma.consultation.create({
      data: {
        consultationNumber: 'CON-000001',
        diagnosis: 'Pneumonia',
        statusCode: 'COMPLETED',
        startedAt: new Date('2026-07-01T08:00:00Z'),
        completedAt: new Date('2026-07-01T08:30:00Z'),
        facilityId,
        branchId: null,
        patientId,
        doctorId: doctor.id,
      },
    });
    consultationId = consultation.id;
    const billingService = await prisma.billingService.create({
      data: {
        code: 'SHA-12-004',
        name: 'Prescription, drug administration and dispensing',
      },
    });
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-SHA-000001',
        statusCode: 'PENDING',
        subtotal: 12_000,
        totalAmount: 12_000,
        facilityId,
        patientId,
        consultationId,
      },
    });
    await prisma.invoiceItem.create({
      data: {
        description: billingService.name,
        quantity: 1,
        unitPrice: 12_000,
        lineTotal: 12_000,
        statusCode: 'BILLED',
        isRemoved: false,
        invoiceId: invoice.id,
        billingServiceId: billingService.id,
      },
    });
    prisma.shaClaim.rows[0] = {
      ...prisma.shaClaim.rows[0],
      invoiceId: invoice.id,
      createdByStaffId: doctor.id,
      servicePeriodStart: new Date('2026-07-01T08:00:00Z'),
      servicePeriodEnd: new Date('2026-07-01T09:00:00Z'),
      diagnosisConcept: {
        system:
          'https://qa-mis.apeiro-digital.com/fhir/terminology/CodeSystem/icd-11',
        code: 'CA40.0',
        display: 'Bacterial pneumonia',
      },
    };
    buildService();
  });

  afterEach(() => {
    worker.stop();
  });

  describe('feature flag', () => {
    it('rejects direct operations when DHA is disabled', async () => {
      buildService({ DHA_ENABLED: 'false' });
      await expect(
        service.verifyPatient({ nationalId: '12345678' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('silently skips claim submission when disabled (billing keeps working)', async () => {
      buildService({ DHA_ENABLED: 'false' });
      const outcome = await service.onShaClaimSubmitted(shaClaimId);
      expect(outcome).toEqual({ skipped: true, reason: 'DHA_DISABLED' });
      expect(prisma.dhaTransaction.rows).toHaveLength(0);
    });
  });

  describe('synchronous verifications', () => {
    it('verifies a patient and records a completed transaction', async () => {
      const { result, transaction } = await service.verifyPatient(
        { nationalId: '12345678' },
        { correlationId: 'corr-9', facilityId },
      );

      expect(result.status).toBe('VERIFIED');
      expect(result.externalRef).toMatch(/^PAT-MOCK-/);
      expect(transaction.statusCode).toBe('COMPLETED');
      expect(transaction.transactionType).toBe('PATIENT_VERIFICATION');
      expect(transaction.externalRef).toBe(result.externalRef);
    });

    it('records NOT_FOUND verification results as completed transactions', async () => {
      const { result } = await service.verifyPatient({
        nationalId: 'UNKNOWN-1',
      });
      expect(result.status).toBe('NOT_FOUND');
    });

    it('verifies practitioners and facilities', async () => {
      const practitioner = await service.verifyPractitioner({
        registrationNumber: 'KMPDC-12345',
      });
      expect(practitioner.result.status).toBe('VERIFIED');

      const facility = await service.verifyFacility({
        facilityCode: 'KMHFL-001',
      });
      expect(facility.result.status).toBe('VERIFIED');
    });

    it('checks SHA eligibility through the documented eligibility query', async () => {
      const { result, transaction } = await service.checkEligibility({
        memberNumber: 'SHA-MEM-001',
      });
      expect(result.status).toBe('ELIGIBLE');
      expect(transaction.fhirResourceType).toBe('EligibilityQuery');
    });

    it('records consent for a known patient', async () => {
      const { result, transaction } = await service.recordConsent({
        patientId,
        permit: true,
        purposeCode: 'TREAT',
      });
      expect(result.status).toBe('ACCEPTED');
      expect(transaction.patientId).toBe(patientId);
    });

    it('rejects consent for unknown patients', async () => {
      await expect(
        service.recordConsent({ patientId: 999, permit: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('marks the transaction FAILED when the DHA API errors', async () => {
      const failingClient = new DhaMockClient();
      failingClient.verifyPatient = jest
        .fn()
        .mockRejectedValue(new DhaApiError('DHA unavailable', 503, true));
      buildService({}, failingClient);

      await expect(
        service.verifyPatient({ nationalId: '12345678' }),
      ).rejects.toThrow('DHA unavailable');

      const transaction = prisma.dhaTransaction.rows[0];
      expect(transaction.statusCode).toBe('FAILED');
      expect(transaction.errorMessage).toContain('DHA unavailable');
    });
  });

  describe('queued claim submission', () => {
    it('maps a structured terminology diagnosis into the claim bundle', async () => {
      prisma.shaClaim.rows[0].diagnosisConcept = {
        system: 'http://id.who.int/icd/release/11/mms',
        code: 'CA40.0',
        display: 'Bacterial pneumonia',
        version: '2026-01',
      };

      await service.onShaClaimSubmitted(shaClaimId);

      const bundle = prisma.dhaTransaction.rows[0].requestPayload as {
        entry: Array<{ resource: Record<string, any> }>;
      };
      const claim = bundle.entry.find(
        (entry) => entry.resource.resourceType === 'Claim',
      )?.resource;
      expect(claim?.diagnosis[0].diagnosisCodeableConcept.coding[0]).toEqual({
        system:
          'https://qa-mis.apeiro-digital.com/fhir/terminology/CodeSystem/icd-11',
        code: 'CA40.0',
        display: 'Bacterial pneumonia',
      });
    });

    it('queues a FHIR claim bundle when a SHA claim is submitted', async () => {
      const outcome = await service.onShaClaimSubmitted(shaClaimId, {
        correlationId: 'corr-claim',
      });
      expect(outcome.skipped).toBe(false);

      const transaction = prisma.dhaTransaction.rows[0];
      expect(transaction.statusCode).toBe('QUEUED');
      expect(transaction.transactionType).toBe('CLAIM_SUBMISSION');
      expect(transaction.shaClaimId).toBe(shaClaimId);

      const request = prisma.integrationOutboundRequest.rows[0];
      expect(request.integration).toBe('DHA');
      expect(request.operation).toBe('SUBMIT_CLAIM');
    });

    it('completes the transaction when the worker drains the queue', async () => {
      await service.onShaClaimSubmitted(shaClaimId);
      const result = await worker.runOnce();

      expect(result).toEqual({ processed: 1, failed: 0 });
      const transaction = prisma.dhaTransaction.rows[0];
      expect(transaction.statusCode).toBe('COMPLETED');
      expect(transaction.externalRef).toMatch(/^CLM-MOCK-/);
      expect(transaction.completedAt).toBeInstanceOf(Date);
    });

    it('rejects unknown SHA claims', async () => {
      await expect(service.onShaClaimSubmitted(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('keeps the transaction retryable when DHA is down, then recovers', async () => {
      let calls = 0;
      const flaky = new DhaMockClient();
      const originalSubmitClaim = flaky.submitClaim.bind(flaky);
      flaky.submitClaim = jest.fn(() => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new DhaApiError('gateway timeout', 504, true))
          : originalSubmitClaim();
      });
      buildService({}, flaky);

      await service.onShaClaimSubmitted(shaClaimId);
      await worker.runOnce(); // fails, scheduled for retry
      expect(prisma.dhaTransaction.rows[0].statusCode).toBe('QUEUED');
      expect(prisma.dhaTransaction.rows[0].errorMessage).toContain(
        'gateway timeout',
      );
      expect(prisma.integrationOutboundRequest.rows[0].status).toBe('PENDING');

      await prisma.integrationOutboundRequest.updateMany({
        where: { id: 1 },
        data: { nextAttemptAt: new Date(0) },
      });
      await worker.runOnce(); // succeeds

      expect(prisma.dhaTransaction.rows[0].statusCode).toBe('COMPLETED');
      expect(prisma.integrationOutboundRequest.rows[0].status).toBe(
        'SUCCEEDED',
      );
    });

    it('marks DHA-rejected submissions FAILED without retrying', async () => {
      const rejecting = new DhaMockClient();
      rejecting.submitClaim = jest.fn().mockResolvedValue({
        status: 'REJECTED',
        raw: { issue: 'invalid member' },
      });
      buildService({}, rejecting);

      await service.onShaClaimSubmitted(shaClaimId);
      await worker.runOnce();

      expect(prisma.dhaTransaction.rows[0].statusCode).toBe('FAILED');
      expect(prisma.integrationOutboundRequest.rows[0].status).toBe(
        'DEAD_LETTER',
      );
    });

    it('passes an active patient consent token to the DHA adapter', async () => {
      const client = new DhaMockClient();
      client.submitClaim = jest
        .fn()
        .mockResolvedValue({ status: 'ACCEPTED', raw: { mock: true } });
      buildService({}, client);
      await prisma.consentAuthorization.create({
        data: {
          patientId,
          status: 'AUTHORIZED',
          expiresAt: null,
          consentToken: 'consent-token-1',
        },
      });

      await service.onShaClaimSubmitted(shaClaimId);
      await worker.runOnce();

      expect(client.submitClaim).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ consentToken: 'consent-token-1' }),
      );
    });

    it('dead-letters malformed DHA queue payloads', async () => {
      await queue.enqueue({
        integration: 'DHA',
        operation: 'SUBMIT_CLAIM',
        entityType: 'DHA_TRANSACTION',
        entityId: 'missing',
        payload: {},
        idempotencyKey: 'dha:malformed:1',
      });

      expect(await worker.runOnce()).toEqual({ processed: 0, failed: 1 });
      expect(prisma.integrationOutboundRequest.rows[0].status).toBe(
        'DEAD_LETTER',
      );
    });
  });

  describe('encounters and referrals', () => {
    it('submits an encounter bundle for a completed consultation', async () => {
      await service.submitEncounterForConsultation(consultationId);
      await worker.runOnce();

      const transaction = prisma.dhaTransaction.rows[0];
      expect(transaction.transactionType).toBe('ENCOUNTER_SUBMISSION');
      expect(transaction.statusCode).toBe('COMPLETED');
      expect(transaction.consultationId).toBe(consultationId);

      const bundle = transaction.requestPayload as {
        resourceType: string;
        entry: Array<{ resource: { resourceType: string } }>;
      };
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.entry.map((e) => e.resource.resourceType)).toEqual([
        'Patient',
        'Organization',
        'Practitioner',
        'Encounter',
      ]);
    });

    it('rejects encounters for unknown consultations', async () => {
      await expect(service.submitEncounterForConsultation(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('submits a referral service request', async () => {
      await service.submitReferral({
        patientId,
        reason: 'Requires specialist cardiology review',
        serviceText: 'Cardiology',
        targetFacilityCode: 'KMHFL-999',
      });
      await worker.runOnce();

      const transaction = prisma.dhaTransaction.rows[0];
      expect(transaction.transactionType).toBe('REFERRAL');
      expect(transaction.statusCode).toBe('COMPLETED');
    });

    it('rejects referrals for unknown patients', async () => {
      await expect(
        service.submitReferral({ patientId: 999, reason: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transaction listing', () => {
    it('lists transactions filtered by facility', async () => {
      await service.verifyPatient({ nationalId: '111' }, { facilityId });
      await service.verifyPatient({ nationalId: '222' }, { facilityId });
      const rows = await service.listTransactions({ facilityId, limit: 1 });
      expect(rows).toHaveLength(1);
    });
  });

  describe('claim status synchronization', () => {
    it.each([
      ['ACCEPTED', 'ACCEPTED'],
      ['SETTLED', 'PAID'],
      ['REJECTED', 'REJECTED'],
    ])(
      'maps DHA %s responses to %s',
      async (responseStatus, expectedStatus) => {
        const client = new DhaMockClient();
        client.pollClaimResponse = jest.fn().mockResolvedValue({
          status: responseStatus,
          raw: { mock: true },
        });
        buildService({}, client);

        await service.pollClaimStatus(shaClaimId);

        expect(prisma.shaClaim.rows[0].statusCode).toBe(expectedStatus);
      },
    );

    it('rejects polling for an unknown claim', async () => {
      await expect(service.pollClaimStatus(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('propagates polling errors without changing the claim', async () => {
      const client = new DhaMockClient();
      client.pollClaimResponse = jest
        .fn()
        .mockRejectedValue(new Error('polling unavailable'));
      buildService({}, client);

      await expect(service.pollClaimStatus(shaClaimId)).rejects.toThrow(
        'polling unavailable',
      );
      expect(prisma.shaClaim.rows[0].statusCode).toBe('SUBMITTED');
    });

    it('handles callbacks for accepted and unknown claims', async () => {
      const accepted = await service.handleClaimStatusCallback({
        claimNumber: 'SHA-000001',
        status: 'APPROVED',
      });
      expect(accepted).toMatchObject({
        updated: true,
        claimId: shaClaimId,
        newStatus: 'ACCEPTED',
      });
      expect(prisma.shaClaim.rows[0].approvedAt).toBeInstanceOf(Date);

      await expect(
        service.handleClaimStatusCallback({
          claimNumber: 'UNKNOWN',
          status: 'PAID',
        }),
      ).resolves.toEqual({ skipped: true });
    });

    it('keeps the current status for an unrecognized callback status', async () => {
      const outcome = await service.handleClaimStatusCallback({
        claimNumber: 'SHA-000001',
        status: 'UNRECOGNIZED',
      });
      expect(outcome.newStatus).toBe('SUBMITTED');
      expect(prisma.shaClaim.rows[0].statusCode).toBe('SUBMITTED');
    });
  });
});
