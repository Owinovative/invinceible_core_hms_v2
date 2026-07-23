import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ScopeService } from '../auth/scope.service';
import { SensitiveDataCipherService } from '../common/security/sensitive-data-cipher.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInsurancePayerDto,
  CreatePatientInsurancePolicyDto,
  CreatePrivateInsuranceClaimDto,
} from './dto/private-insurance.dto';

function removeTrailingSlashes(value: string): string {
  let end = value.length;

  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return value.slice(0, end);
}

function providerScalarText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  return undefined;
}

@Injectable()
export class PrivateInsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly cipher: SensitiveDataCipherService,
    private readonly config: ConfigService,
  ) {}

  listPayers(user: RequestUser) {
    return this.prisma.insurancePayer.findMany({
      where: {
        ...this.scope.buildFacilityScopeWhere(user),
        isActive: true,
      },
      select: {
        id: true,
        facilityId: true,
        code: true,
        name: true,
        payerType: true,
        integrationBaseUrl: true,
        eligibilityPath: true,
        claimSubmissionPath: true,
        isActive: true,
        createdAt: true,
        _count: { select: { policies: true, claims: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createPayer(dto: CreateInsurancePayerDto, user: RequestUser) {
    this.scope.assertFacilityAccess(user, dto.facilityId);
    const integrationBaseUrl = dto.integrationBaseUrl?.trim();

    if (
      this.config.get<string>('NODE_ENV') === 'production' &&
      integrationBaseUrl &&
      !integrationBaseUrl.startsWith('https://')
    ) {
      throw new BadRequestException(
        'Private insurer integrations must use HTTPS in production',
      );
    }
    return this.prisma.insurancePayer.create({
      data: {
        facilityId: dto.facilityId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        payerType: dto.payerType?.trim().toUpperCase() || 'PRIVATE',
        integrationBaseUrl: integrationBaseUrl
          ? removeTrailingSlashes(integrationBaseUrl)
          : undefined,
        eligibilityPath: dto.eligibilityPath?.trim(),
        claimSubmissionPath: dto.claimSubmissionPath?.trim(),
        authorizationCiphertext: dto.apiToken
          ? this.cipher.encrypt(dto.apiToken)
          : undefined,
      },
      select: {
        id: true,
        facilityId: true,
        code: true,
        name: true,
        payerType: true,
        integrationBaseUrl: true,
        eligibilityPath: true,
        claimSubmissionPath: true,
        isActive: true,
      },
    });
  }

  listPolicies(user: RequestUser) {
    return this.prisma.patientInsurancePolicy.findMany({
      where: this.scope.buildBranchScopeWhere(user),
      include: { payer: true, patient: true, branch: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async createPolicy(dto: CreatePatientInsurancePolicyDto, user: RequestUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    const payer = await this.prisma.insurancePayer.findUnique({
      where: { id: dto.insurancePayerId },
    });
    if (!patient || !payer || patient.facilityId !== payer.facilityId) {
      throw new BadRequestException(
        'Patient and insurance payer must belong to the same facility',
      );
    }
    const branchId = dto.branchId ?? user.homeBranchId ?? null;
    this.scope.assertBranchAccess(user, patient.facilityId, branchId);
    if (branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { facilityId: true },
      });
      if (!branch || branch.facilityId !== patient.facilityId) {
        throw new BadRequestException(
          'Selected branch does not belong to the patient facility',
        );
      }
    }
    return this.prisma.patientInsurancePolicy.create({
      data: {
        facilityId: patient.facilityId,
        branchId,
        patientId: patient.id,
        insurancePayerId: payer.id,
        policyNumber: dto.policyNumber.trim(),
        memberNumber: dto.memberNumber?.trim(),
        principalMemberName: dto.principalMemberName?.trim(),
        relationshipToPrincipal: dto.relationshipToPrincipal?.trim(),
        coverStartAt: dto.coverStartAt ? new Date(dto.coverStartAt) : undefined,
        coverEndAt: dto.coverEndAt ? new Date(dto.coverEndAt) : undefined,
        benefitLimit: dto.benefitLimit,
      },
      include: { payer: true, patient: true },
    });
  }

  private async getPolicy(id: number, user: RequestUser) {
    const policy = await this.prisma.patientInsurancePolicy.findUnique({
      where: { id },
      include: { payer: true, patient: true },
    });
    if (!policy) throw new NotFoundException('Insurance policy not found');
    this.scope.assertBranchAccess(user, policy.facilityId, policy.branchId);
    return policy;
  }

  private providerUrl(baseUrl: string, path: string) {
    const base = new URL(`${baseUrl.replace(/\/+$/, '')}/`);
    const target = new URL(path.replace(/^\/+/, ''), base);
    if (target.origin !== base.origin) {
      throw new BadRequestException('Invalid insurer integration path');
    }
    return target.toString();
  }

  async verifyPolicy(id: number, user: RequestUser) {
    const policy = await this.getPolicy(id, user);
    if (!policy.payer.integrationBaseUrl || !policy.payer.eligibilityPath) {
      return this.prisma.patientInsurancePolicy.update({
        where: { id },
        data: {
          statusCode: 'MANUAL_VERIFICATION_REQUIRED',
          lastVerifiedAt: new Date(),
        },
        include: { payer: true, patient: true },
      });
    }
    const token = policy.payer.authorizationCiphertext
      ? this.cipher.decrypt(policy.payer.authorizationCiphertext)
      : null;
    const response = await fetch(
      this.providerUrl(
        policy.payer.integrationBaseUrl,
        policy.payer.eligibilityPath,
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          policyNumber: policy.policyNumber,
          memberNumber: policy.memberNumber,
          patient: {
            name: `${policy.patient.firstName} ${policy.patient.lastName}`,
            nationalIdNumber: policy.patient.nationalIdNumber,
          },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return this.prisma.patientInsurancePolicy.update({
      where: { id },
      data: {
        statusCode: response.ok ? 'ACTIVE' : 'VERIFICATION_FAILED',
        lastVerifiedAt: new Date(),
        verificationReference:
          providerScalarText(body.reference) ??
          providerScalarText(body.verificationReference),
        verificationResponse: JSON.stringify(body).slice(0, 65000),
      },
      include: { payer: true, patient: true },
    });
  }

  listClaims(user: RequestUser) {
    return this.prisma.privateInsuranceClaim.findMany({
      where: this.scope.buildBranchScopeWhere(user),
      include: {
        payer: true,
        policy: { include: { patient: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async createClaim(dto: CreatePrivateInsuranceClaimDto, user: RequestUser) {
    const policy = await this.getPolicy(dto.patientInsurancePolicyId, user);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
    });
    if (
      !invoice ||
      invoice.patientId !== policy.patientId ||
      invoice.facilityId !== policy.facilityId
    ) {
      throw new BadRequestException(
        'Invoice does not belong to the insured patient',
      );
    }
    this.scope.assertBranchAccess(user, invoice.facilityId, invoice.branchId);
    if (
      !['ACTIVE', 'MANUAL_VERIFICATION_REQUIRED'].includes(policy.statusCode)
    ) {
      throw new BadRequestException(
        'Insurance cover must be verified before claim creation',
      );
    }
    if (policy.coverEndAt && policy.coverEndAt < new Date()) {
      throw new BadRequestException('Insurance cover has expired');
    }
    if (Number(invoice.balanceAmount) <= 0) {
      throw new BadRequestException('Invoice has no outstanding balance');
    }
    try {
      return await this.prisma.privateInsuranceClaim.create({
        data: {
          claimNumber: `PIC-${randomUUID().slice(0, 12).toUpperCase()}`,
          facilityId: invoice.facilityId,
          branchId: invoice.branchId,
          insurancePayerId: policy.insurancePayerId,
          patientInsurancePolicyId: policy.id,
          invoiceId: invoice.id,
          claimedAmount: invoice.balanceAmount,
          createdByUserId: user.userId,
        },
        include: { payer: true, policy: true, invoice: true },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new BadRequestException(
          'A claim already exists for this policy and invoice',
        );
      }
      throw error;
    }
  }

  async submitClaim(id: number, user: RequestUser) {
    const claim = await this.prisma.privateInsuranceClaim.findUnique({
      where: { id },
      include: {
        payer: true,
        policy: { include: { patient: true } },
        invoice: { include: { items: true } },
      },
    });
    if (!claim) throw new NotFoundException('Insurance claim not found');
    this.scope.assertBranchAccess(user, claim.facilityId, claim.branchId);
    if (!['DRAFT', 'SUBMISSION_FAILED'].includes(claim.statusCode)) {
      throw new BadRequestException(
        'Only draft or failed claims can be submitted',
      );
    }
    const reserved = await this.prisma.privateInsuranceClaim.updateMany({
      where: {
        id,
        statusCode: { in: ['DRAFT', 'SUBMISSION_FAILED'] },
      },
      data: { statusCode: 'SUBMITTING', rejectionReason: null },
    });
    if (reserved.count !== 1) {
      throw new BadRequestException(
        'This claim is already being submitted by another session',
      );
    }
    if (!claim.payer.integrationBaseUrl || !claim.payer.claimSubmissionPath) {
      return this.prisma.privateInsuranceClaim.update({
        where: { id },
        data: { statusCode: 'READY_FOR_MANUAL_SUBMISSION' },
      });
    }
    const token = claim.payer.authorizationCiphertext
      ? this.cipher.decrypt(claim.payer.authorizationCiphertext)
      : null;
    let response: Response;
    try {
      response = await fetch(
        this.providerUrl(
          claim.payer.integrationBaseUrl,
          claim.payer.claimSubmissionPath,
        ),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            claimNumber: claim.claimNumber,
            policyNumber: claim.policy.policyNumber,
            patient: {
              name: `${claim.policy.patient.firstName} ${claim.policy.patient.lastName}`,
            },
            amount: Number(claim.claimedAmount),
            invoiceNumber: claim.invoice.invoiceNumber,
            items: claim.invoice.items.filter((item) => !item.isRemoved),
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
    } catch (error) {
      await this.prisma.privateInsuranceClaim.update({
        where: { id },
        data: {
          statusCode: 'SUBMISSION_FAILED',
          rejectionReason:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : 'Insurer could not be reached',
        },
      });
      throw new BadRequestException(
        'The insurer could not be reached. The claim can be retried safely.',
      );
    }
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return this.prisma.privateInsuranceClaim.update({
      where: { id },
      data: {
        statusCode: response.ok ? 'SUBMITTED' : 'SUBMISSION_FAILED',
        submittedAt: new Date(),
        externalClaimId:
          providerScalarText(body.claimId) ??
          providerScalarText(body.externalClaimId),
        submissionReference:
          providerScalarText(body.reference) ??
          providerScalarText(body.submissionReference),
        responsePayload: JSON.stringify(body).slice(0, 65000),
        rejectionReason: response.ok
          ? null
          : (providerScalarText(body.message) ??
            providerScalarText(body.error) ??
            `HTTP ${response.status}`),
      },
      include: { payer: true, policy: true, invoice: true },
    });
  }
}
