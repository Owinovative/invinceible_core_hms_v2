import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FhirMapperService } from '../../../integration/dha/fhir-mapper';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds FHIR Practitioner resources from HMS Staff data.
 * Reuses the existing FhirMapperService.
 */
@Injectable()
export class PractitionerBuilder implements FhirBuilder {
  readonly resourceType = 'Practitioner';
  private readonly prisma = new PrismaClient();

  constructor(private readonly fhirMapper: FhirMapperService) {}

  async build(context: BuilderContext): Promise<any[]> {
    if (!context.encounterId) return [];

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: context.encounterId },
      include: { doctor: true }
    });

    if (!consultation?.doctor) return [];

    const fhirPractitioner = this.fhirMapper.toFhirPractitioner(consultation.doctor);
    const fullUrl = `urn:uuid:${uuidv4()}`;

    context.resolvedReferences.set(`Practitioner/${consultation.doctor.id}`, fullUrl);

    return [{ ...fhirPractitioner, id: fullUrl.replace('urn:uuid:', '') }];
  }
}
