import { Injectable, Logger } from '@nestjs/common';
import { ShrPublicationPolicy } from '../engine/shr-publication.policy';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationConfigService } from '../../integration/integration-config.service';

@Injectable()
export class DhaComplianceEngine {
  private readonly logger = new Logger(DhaComplianceEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: IntegrationConfigService,
  ) {}

  async validateCompliance(
    bundle: any,
    policy: ShrPublicationPolicy,
    patientId: number,
  ): Promise<void> {
    this.logger.log(
      `Validating DHA Compliance for policy ${policy} (Patient: ${patientId})`,
    );

    const errors: string[] = [];

    // 1. Consent Validation
    const hasConsent = await this.verifyConsent(patientId);
    if (!hasConsent) {
      errors.push(
        `Patient ${patientId} does not have active consent for data sharing.`,
      );
    }

    // 2. Identifier Validation (KMHFL, MPDB)
    const hasFacilityId = await this.verifyFacilityIdentifiers(patientId);
    if (!hasFacilityId) {
      errors.push(`System is missing configured KMHFL Facility Identifier.`);
    }

    // 3. Terminology Validation
    const hasInvalidTerms = this.verifyTerminology(bundle);
    if (hasInvalidTerms) {
      errors.push(`Bundle contains unmapped or invalid terminology codes.`);
    }

    // 4. Policy Minimum Criteria
    if (policy === ShrPublicationPolicy.CLAIM_ENCOUNTER) {
      const hasClaim = bundle.entry.some(
        (e: any) => e.resource.resourceType === 'Claim',
      );
      if (!hasClaim) {
        errors.push(
          `Policy ${policy} requires a Claim resource, but none was found.`,
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `DHA Compliance Validation failed: \n${errors.join('\n')}`,
      );
    }

    this.logger.log('DHA Compliance Validation passed.');
  }

  private async verifyConsent(patientId: number): Promise<boolean> {
    const consent = await this.prisma.consentAuthorization.findFirst({
      where: {
        patientId,
        status: 'AUTHORIZED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    return Boolean(consent);
  }

  private async verifyFacilityIdentifiers(patientId: number): Promise<boolean> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        facility: {
          select: { dhaFacilityId: true, dhaRegistryStatus: true },
        },
      },
    });
    return Boolean(
      patient?.facility.dhaFacilityId &&
      patient.facility.dhaFacilityId === this.config.dhaFacilityId &&
      patient.facility.dhaRegistryStatus === 'VERIFIED' &&
      this.config.dhaFacilityIdType === 'fr-code',
    );
  }

  private verifyTerminology(bundle: any): boolean {
    const codedTypes = new Set([
      'Condition',
      'Observation',
      'Procedure',
      'MedicationRequest',
      'DiagnosticReport',
    ]);
    return (bundle.entry ?? []).some((entry: any) => {
      const resource = entry?.resource;
      if (!resource || !codedTypes.has(resource.resourceType)) return false;
      const concept =
        resource.resourceType === 'MedicationRequest'
          ? resource.medicationCodeableConcept
          : resource.code;
      return (
        !Array.isArray(concept?.coding) ||
        concept.coding.length === 0 ||
        concept.coding.some((coding: any) => !coding?.system || !coding?.code)
      );
    });
  }
}
