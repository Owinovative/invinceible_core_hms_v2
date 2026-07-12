import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FhirMapperService } from '../../../integration/dha/fhir-mapper';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds a FHIR Organization resource from HMS Facility data.
 * Reuses the existing FhirMapperService.
 */
@Injectable()
export class OrganizationBuilder implements FhirBuilder {
  readonly resourceType = 'Organization';
  private readonly prisma = new PrismaClient();

  constructor(private readonly fhirMapper: FhirMapperService) {}

  async build(context: BuilderContext): Promise<any[]> {
    const facility = await this.prisma.facility.findUnique({
      where: { id: context.facilityId }
    });

    if (!facility) {
      throw new Error(`Facility ${context.facilityId} not found`);
    }

    const fhirOrg = this.fhirMapper.toFhirOrganization(facility);
    const fullUrl = `urn:uuid:${uuidv4()}`;

    context.resolvedReferences.set(`Organization/${facility.id}`, fullUrl);

    return [{ ...fhirOrg, id: fullUrl.replace('urn:uuid:', '') }];
  }
}
