import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds FHIR Observation resources from HMS Triage vitals.
 */
@Injectable()
export class ObservationBuilder implements FhirBuilder {
  readonly resourceType = 'Observation';
  private readonly prisma = new PrismaClient();

  async build(context: BuilderContext): Promise<any[]> {
    // Fetch the triage associated with the patient's most recent visit
    // or a specific encounter if available.
    const whereClause: any = { patientId: context.patientId };
    if (context.encounterId) {
      // Link through appointment → consultation
    }

    const triages = await this.prisma.triage.findMany({
      where: whereClause,
      orderBy: { arrivedAt: 'desc' },
      take: 1,
    });

    if (triages.length === 0) return [];
    const triage = triages[0];

    const patientRef = context.resolvedReferences.get(`Patient/${context.patientId}`) || `Patient/${context.patientId}`;
    const encounterRef = context.encounterId
      ? context.resolvedReferences.get(`Encounter/${context.encounterId}`)
      : undefined;

    const observations: any[] = [];

    const addVital = (code: string, display: string, value: number | null | undefined, unit: string) => {
      if (value == null) return;
      const fullUrl = `urn:uuid:${uuidv4()}`;
      observations.push({
        resourceType: 'Observation',
        id: fullUrl.replace('urn:uuid:', ''),
        status: 'final',
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }]
        }],
        code: {
          coding: [{ system: 'http://loinc.org', code, display }],
          text: display,
        },
        subject: { reference: patientRef },
        encounter: encounterRef ? { reference: encounterRef } : undefined,
        effectiveDateTime: triage.arrivedAt?.toISOString(),
        valueQuantity: { value, unit, system: 'http://unitsofmeasure.org' },
      });
      context.resolvedReferences.set(`Observation/${code}-${triage.id}`, fullUrl);
    };

    addVital('8310-5', 'Body Temperature', triage.temperatureC, 'Cel');
    addVital('8867-4', 'Heart Rate', triage.pulseRate, '/min');
    addVital('9279-1', 'Respiratory Rate', triage.respiratoryRate, '/min');
    addVital('8480-6', 'Systolic Blood Pressure', triage.systolicBp, 'mmHg');
    addVital('8462-4', 'Diastolic Blood Pressure', triage.diastolicBp, 'mmHg');
    addVital('2708-6', 'Oxygen Saturation', triage.oxygenSaturation, '%');
    addVital('29463-7', 'Body Weight', triage.weightKg, 'kg');
    addVital('8302-2', 'Body Height', triage.heightCm, 'cm');

    return observations;
  }
}
