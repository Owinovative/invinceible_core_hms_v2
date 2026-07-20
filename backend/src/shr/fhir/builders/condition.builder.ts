import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds FHIR Condition resources from the Consultation's primary
 * and secondary diagnoses (TerminologyConcept).
 */
@Injectable()
export class ConditionBuilder implements FhirBuilder {
  readonly resourceType = 'Condition';
  constructor(private readonly prisma: PrismaService) {}

  async build(context: BuilderContext): Promise<any[]> {
    if (!context.encounterId) return [];

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: context.encounterId },
      include: {
        primaryDiagnosis: true,
        secondaryDiagnoses: true,
      },
    });

    if (!consultation) return [];

    const conditions: any[] = [];
    const patientRef =
      context.resolvedReferences.get(`Patient/${context.patientId}`) ||
      `Patient/${context.patientId}`;
    const encounterRef =
      context.resolvedReferences.get(`Encounter/${context.encounterId}`) ||
      `Encounter/${context.encounterId}`;

    // Primary Diagnosis
    if (consultation.primaryDiagnosis) {
      const fullUrl = `urn:uuid:${uuidv4()}`;
      conditions.push({
        resourceType: 'Condition',
        id: fullUrl.replace('urn:uuid:', ''),
        clinicalStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
            },
          ],
        },
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-category',
                code: 'encounter-diagnosis',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: consultation.primaryDiagnosis.system,
              code: consultation.primaryDiagnosis.code,
              display: consultation.primaryDiagnosis.display,
            },
          ],
          text: consultation.primaryDiagnosis.display,
        },
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        recordedDate: consultation.startedAt?.toISOString(),
      });
      context.resolvedReferences.set(
        `Condition/primary-${consultation.id}`,
        fullUrl,
      );
    }

    // Secondary Diagnoses
    for (const dx of consultation.secondaryDiagnoses || []) {
      const fullUrl = `urn:uuid:${uuidv4()}`;
      conditions.push({
        resourceType: 'Condition',
        id: fullUrl.replace('urn:uuid:', ''),
        clinicalStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
            },
          ],
        },
        category: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-category',
                code: 'encounter-diagnosis',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: dx.system,
              code: dx.code,
              display: dx.display,
            },
          ],
          text: dx.display,
        },
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        recordedDate: consultation.startedAt?.toISOString(),
      });
      context.resolvedReferences.set(`Condition/secondary-${dx.id}`, fullUrl);
    }

    return conditions;
  }
}
