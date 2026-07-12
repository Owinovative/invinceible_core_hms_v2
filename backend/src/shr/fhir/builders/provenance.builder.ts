import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds FHIR Provenance resources to trace clinical data authorship.
 */
@Injectable()
export class ProvenanceBuilder implements FhirBuilder {
  readonly resourceType = 'Provenance';
  private readonly prisma = new PrismaClient();

  async build(context: BuilderContext): Promise<any[]> {
    if (!context.encounterId) return [];

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: context.encounterId },
      include: { doctor: true }
    });

    if (!consultation) return [];

    const fullUrl = `urn:uuid:${uuidv4()}`;
    const patientRef = context.resolvedReferences.get(`Patient/${context.patientId}`) || `Patient/${context.patientId}`;
    const practitionerRef = consultation.doctorId
      ? context.resolvedReferences.get(`Practitioner/${consultation.doctorId}`)
      : undefined;
    const orgRef = context.resolvedReferences.get(`Organization/${context.facilityId}`) || `Organization/${context.facilityId}`;

    // Gather all resources already built for this encounter as targets
    const targets: any[] = [];
    for (const [key, ref] of context.resolvedReferences.entries()) {
      if (key.startsWith('Encounter/') || key.startsWith('Condition/') || key.startsWith('Observation/')) {
        targets.push({ reference: ref });
      }
    }

    return [{
      resourceType: 'Provenance',
      id: fullUrl.replace('urn:uuid:', ''),
      target: targets.length > 0 ? targets : [{ reference: patientRef }],
      recorded: new Date().toISOString(),
      agent: [
        {
          type: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type', code: 'author' }]
          },
          who: practitionerRef ? { reference: practitionerRef } : { display: 'System' },
          onBehalfOf: { reference: orgRef },
        }
      ],
    }];
  }
}
