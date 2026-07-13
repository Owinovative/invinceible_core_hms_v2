import { Injectable, Logger } from '@nestjs/common';
import { ShrResourceCapabilityRegistry } from './shr-resource-registry';
// import { PatientBuilder } from './builders/patient.builder';
// etc...

@Injectable()
export class ShrBundleAssembler {
  private readonly logger = new Logger(ShrBundleAssembler.name);

  constructor(
    private readonly capabilityRegistry: ShrResourceCapabilityRegistry,
    // Inject all individual builders here
  ) {}

  async assemble(patientId: number, encounterId: number | undefined, requiredResources: string[]): Promise<any> {
    this.logger.log(`Assembling bundle for Patient ${patientId}`);
    
    // 1. Get the strict deterministic build order
    const buildOrder = this.capabilityRegistry.getBuildOrder(requiredResources);
    this.logger.log(`Build order: ${buildOrder.join(' -> ')}`);

    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [] as any[],
    };

    const context = { patientId, encounterId, resolvedReferences: new Map<string, string>() };

    // 2. Execute builders in order
    for (const resourceType of buildOrder) {
      this.logger.debug(`Building ${resourceType}...`);
      
      try {
        const resources = await this.executeBuilder(resourceType, context);
        if (resources && resources.length > 0) {
          for (const res of resources) {
            // Track the UUID reference for downstream builders (e.g. Practitioner -> Encounter)
            const fullUrl = `urn:uuid:${res.id || 'generated-uuid'}`;
            context.resolvedReferences.set(`${resourceType}/${res.id}`, fullUrl);

            bundle.entry.push({
              fullUrl,
              resource: res,
              request: {
                method: 'PUT', // Idempotent updates
                url: `${resourceType}?identifier=${res.identifier?.[0]?.value || res.id}`
              }
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

  private async executeBuilder(resourceType: string, context: any): Promise<any[]> {
    // In a real implementation, this delegates to the specific builder (e.g., PatientBuilder)
    // using a Strategy pattern or Dependency Injection lookup.
    
    // return this.builderFactory.getBuilder(resourceType).build(context);
    return []; // Mock return for architecture scaffolding
  }
}
