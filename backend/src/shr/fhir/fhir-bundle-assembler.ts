import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ShrResourceCapabilityRegistry } from './shr-resource-registry';
import type {
  BuilderContext,
  FhirBuilder,
} from './builders/fhir-builder.interface';
import {
  ConditionBuilder,
  DiagnosticReportBuilder,
  EncounterBuilder,
  MedicationRequestBuilder,
  ObservationBuilder,
  OrganizationBuilder,
  PatientBuilder,
  PractitionerBuilder,
  ProcedureBuilder,
  ProvenanceBuilder,
} from './builders';

@Injectable()
export class ShrBundleAssembler {
  private readonly logger = new Logger(ShrBundleAssembler.name);

  constructor(
    private readonly capabilityRegistry: ShrResourceCapabilityRegistry,
    private readonly prisma: PrismaService,
    patient: PatientBuilder,
    organization: OrganizationBuilder,
    practitioner: PractitionerBuilder,
    encounter: EncounterBuilder,
    condition: ConditionBuilder,
    observation: ObservationBuilder,
    procedure: ProcedureBuilder,
    medicationRequest: MedicationRequestBuilder,
    diagnosticReport: DiagnosticReportBuilder,
    provenance: ProvenanceBuilder,
  ) {
    this.builders = new Map(
      [
        patient,
        organization,
        practitioner,
        encounter,
        condition,
        observation,
        procedure,
        medicationRequest,
        diagnosticReport,
        provenance,
      ].map((builder) => [builder.resourceType, builder]),
    );
  }

  private readonly builders: Map<string, FhirBuilder>;

  async assemble(
    patientId: number,
    encounterId: number | undefined,
    requiredResources: string[],
  ): Promise<any> {
    this.logger.log(`Assembling bundle for Patient ${patientId}`);

    // 1. Get the strict deterministic build order
    const buildOrder = this.capabilityRegistry.getBuildOrder(requiredResources);
    this.logger.log(`Build order: ${buildOrder.join(' -> ')}`);

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { facilityId: true },
    });
    if (!patient) throw new Error(`Patient ${patientId} not found`);

    const bundle = {
      resourceType: 'Bundle',
      id: randomUUID(),
      type: 'transaction',
      timestamp: new Date().toISOString(),
      entry: [] as any[],
    };

    const context: BuilderContext = {
      patientId,
      encounterId,
      facilityId: patient.facilityId,
      resolvedReferences: new Map<string, string>(),
    };

    // 2. Execute builders in order
    for (const resourceType of buildOrder) {
      this.logger.debug(`Building ${resourceType}...`);

      try {
        const builder = this.builders.get(resourceType);
        if (!builder) {
          throw new Error(
            `No SHR builder registered for required ${resourceType}`,
          );
        }
        const resources = await builder.build(context);
        if (resources && resources.length > 0) {
          for (const res of resources) {
            // Track the UUID reference for downstream builders (e.g. Practitioner -> Encounter)
            const fullUrl = `urn:uuid:${res.id || randomUUID()}`;
            context.resolvedReferences.set(
              `${resourceType}/${res.id}`,
              fullUrl,
            );

            bundle.entry.push({
              fullUrl,
              resource: res,
              request: {
                method: 'PUT',
                url: `${resourceType}/${res.id}`,
              },
            });
          }
        }
      } catch (error) {
        this.logger.error(`Failed to build ${resourceType}: ${error.message}`);
        throw error;
      }
    }

    return bundle;
  }
}
