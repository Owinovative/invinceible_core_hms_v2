import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds FHIR MedicationRequest resources from HMS Prescription data.
 */
@Injectable()
export class MedicationRequestBuilder implements FhirBuilder {
  readonly resourceType = 'MedicationRequest';
  constructor(private readonly prisma: PrismaService) {}

  async build(context: BuilderContext): Promise<any[]> {
    if (!context.encounterId) return [];

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: context.encounterId },
      include: {
        prescriptions: {
          include: {
            items: {
              include: {
                medicine: { include: { terminologyConcept: true } },
              },
            },
          },
        },
      },
    });

    if (!consultation) return [];

    const requests: any[] = [];
    const patientRef =
      context.resolvedReferences.get(`Patient/${context.patientId}`) ||
      `Patient/${context.patientId}`;
    const encounterRef =
      context.resolvedReferences.get(`Encounter/${context.encounterId}`) ||
      `Encounter/${context.encounterId}`;
    const practitionerRef = consultation.doctorId
      ? context.resolvedReferences.get(`Practitioner/${consultation.doctorId}`)
      : undefined;

    for (const prescription of consultation.prescriptions || []) {
      for (const item of prescription.items || []) {
        const fullUrl = `urn:uuid:${uuidv4()}`;

        requests.push({
          resourceType: 'MedicationRequest',
          id: fullUrl.replace('urn:uuid:', ''),
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            coding: item.medicine?.terminologyConcept
              ? [
                  {
                    system: item.medicine.terminologyConcept.system,
                    code: item.medicine.terminologyConcept.code,
                    display: item.medicine.terminologyConcept.display,
                  },
                ]
              : undefined,
            text: item.medicine?.name || item.medicineNameSnapshot || 'Unknown',
          },
          subject: { reference: patientRef },
          encounter: { reference: encounterRef },
          requester: practitionerRef
            ? { reference: practitionerRef }
            : undefined,
          dosageInstruction: item.dosage
            ? [
                {
                  text: item.dosage,
                  timing: item.frequency
                    ? { code: { text: item.frequency } }
                    : undefined,
                  route: item.route ? { text: item.route } : undefined,
                },
              ]
            : undefined,
          dispenseRequest: {
            quantity: { value: item.quantity || 1 },
            numberOfRepeatsAllowed: 0,
          },
          authoredOn: prescription.createdAt?.toISOString(),
        });

        context.resolvedReferences.set(`MedicationRequest/${item.id}`, fullUrl);
      }
    }

    return requests;
  }
}
