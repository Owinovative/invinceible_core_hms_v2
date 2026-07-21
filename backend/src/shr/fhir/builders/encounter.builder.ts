import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FhirMapperService } from '../../../integration/dha/fhir-mapper';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds a FHIR Encounter resource from HMS Consultation data.
 * Reuses the existing FhirMapperService.
 */
@Injectable()
export class EncounterBuilder implements FhirBuilder {
  readonly resourceType = 'Encounter';
  constructor(
    private readonly fhirMapper: FhirMapperService,
    private readonly prisma: PrismaService,
  ) {}

  async build(context: BuilderContext): Promise<any[]> {
    if (!context.encounterId) return [];

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: context.encounterId },
      include: {
        doctor: true,
        primaryDiagnosis: true,
      },
    });

    if (!consultation) return [];

    const patientRef =
      context.resolvedReferences.get(`Patient/${context.patientId}`) ||
      `Patient/${context.patientId}`;
    const facilityRef =
      context.resolvedReferences.get(`Organization/${context.facilityId}`) ||
      `Organization/${context.facilityId}`;

    // Build practitioner reference if available
    let practitionerRef: string | undefined;
    if (consultation.doctorId) {
      practitionerRef = context.resolvedReferences.get(
        `Practitioner/${consultation.doctorId}`,
      );
    }

    const hmsEncounter = {
      id: consultation.id,
      patientId: consultation.patientId,
      startedAt: consultation.startedAt,
      endedAt: consultation.completedAt,
      encounterClass: 'AMB' as const,
      practitionerRef,
      primaryDiagnosis: consultation.primaryDiagnosis
        ? {
            system: consultation.primaryDiagnosis.system,
            code: consultation.primaryDiagnosis.code,
            display: consultation.primaryDiagnosis.display,
            version: consultation.primaryDiagnosis.version,
          }
        : null,
    };

    const fhirEncounter = this.fhirMapper.toFhirEncounter(
      hmsEncounter,
      patientRef,
      facilityRef,
    );
    const fullUrl = `urn:uuid:${uuidv4()}`;

    context.resolvedReferences.set(`Encounter/${consultation.id}`, fullUrl);

    return [{ ...fhirEncounter, id: fullUrl.replace('urn:uuid:', '') }];
  }
}
