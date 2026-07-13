import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds FHIR Procedure resources from HMS ConsultationProcedure data.
 */
@Injectable()
export class ProcedureBuilder implements FhirBuilder {
  readonly resourceType = 'Procedure';
  private readonly prisma = new PrismaClient();

  async build(context: BuilderContext): Promise<any[]> {
    if (!context.encounterId) return [];

    const procedures = await this.prisma.consultationProcedure.findMany({
      where: { consultationId: context.encounterId },
      include: { terminologyConcept: true }
    });

    if (procedures.length === 0) return [];

    const patientRef = context.resolvedReferences.get(`Patient/${context.patientId}`) || `Patient/${context.patientId}`;
    const encounterRef = context.resolvedReferences.get(`Encounter/${context.encounterId}`) || `Encounter/${context.encounterId}`;

    return procedures.map(proc => {
      const fullUrl = `urn:uuid:${uuidv4()}`;
      context.resolvedReferences.set(`Procedure/${proc.id}`, fullUrl);

      return {
        resourceType: 'Procedure',
        id: fullUrl.replace('urn:uuid:', ''),
        status: 'completed',
        code: proc.terminologyConcept ? {
          coding: [{
            system: proc.terminologyConcept.system,
            code: proc.terminologyConcept.code,
            display: proc.terminologyConcept.display,
          }],
          text: proc.terminologyConcept.display,
        } : { text: 'Unknown Procedure' },
        subject: { reference: patientRef },
        encounter: { reference: encounterRef },
        performedDateTime: proc.performedAt?.toISOString(),
        note: proc.notes ? [{ text: proc.notes }] : undefined,
      };
    });
  }
}
