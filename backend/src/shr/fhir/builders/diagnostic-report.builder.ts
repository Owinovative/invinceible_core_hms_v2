import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FhirBuilder, BuilderContext } from './fhir-builder.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Builds FHIR DiagnosticReport resources from HMS LabOrder data.
 */
@Injectable()
export class DiagnosticReportBuilder implements FhirBuilder {
  readonly resourceType = 'DiagnosticReport';
  private readonly prisma = new PrismaClient();

  async build(context: BuilderContext): Promise<any[]> {
    // Find lab orders for this patient (optionally scoped to encounter)
    const whereClause: any = { patientId: context.patientId };

    const labOrders = await this.prisma.labOrder.findMany({
      where: whereClause,
      include: {
        items: {
          include: { test: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Limit to recent orders
    });

    if (labOrders.length === 0) return [];

    const reports: any[] = [];
    const patientRef = context.resolvedReferences.get(`Patient/${context.patientId}`) || `Patient/${context.patientId}`;
    const encounterRef = context.encounterId
      ? context.resolvedReferences.get(`Encounter/${context.encounterId}`)
      : undefined;

    for (const order of labOrders) {
      const fullUrl = `urn:uuid:${uuidv4()}`;

      reports.push({
        resourceType: 'DiagnosticReport',
        id: fullUrl.replace('urn:uuid:', ''),
        status: order.status === 'COMPLETED' ? 'final' : 'preliminary',
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB', display: 'Laboratory' }]
        }],
        code: {
          text: order.items?.map((i: any) => i.test?.name || i.test?.code || 'Test').join(', ') || 'Lab Tests',
        },
        subject: { reference: patientRef },
        encounter: encounterRef ? { reference: encounterRef } : undefined,
        effectiveDateTime: order.updatedAt?.toISOString() || order.createdAt?.toISOString(),
        issued: order.updatedAt?.toISOString(),
      });

      context.resolvedReferences.set(`DiagnosticReport/${order.id}`, fullUrl);
    }

    return reports;
  }
}
