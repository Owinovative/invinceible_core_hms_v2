import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FhirMapperService } from '../../../integration/dha/fhir-mapper';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds a FHIR Patient resource from HMS Patient data.
 * Reuses the existing FhirMapperService to avoid duplication.
 */
@Injectable()
export class PatientBuilder implements FhirBuilder {
  readonly resourceType = 'Patient';
  constructor(
    private readonly fhirMapper: FhirMapperService,
    private readonly prisma: PrismaService,
  ) {}

  async build(context: BuilderContext): Promise<any[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: context.patientId },
    });

    if (!patient) {
      throw new Error(`Patient ${context.patientId} not found`);
    }

    const fhirPatient = this.fhirMapper.toFhirPatient(
      patient,
      patient.nationalIdNumber || undefined,
    );
    const fullUrl = `urn:uuid:${uuidv4()}`;

    // Register reference for downstream builders
    context.resolvedReferences.set(`Patient/${patient.id}`, fullUrl);

    return [{ ...fhirPatient, id: fullUrl.replace('urn:uuid:', '') }];
  }
}
