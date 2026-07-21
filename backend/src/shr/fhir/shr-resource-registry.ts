export enum FhirOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface ResourceCapability {
  resourceType: string;
  supportedOperations: FhirOperation[];
  supportsVersioning: boolean;
  supportsIncrementalPublish: boolean;
  requiresTerminologyValidation: boolean;
  dependencies: string[]; // Upstream resources that must be built first
}

export class ShrResourceCapabilityRegistry {
  private capabilities = new Map<string, ResourceCapability>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // Foundation
    this.register({
      resourceType: 'Organization',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: false,
      requiresTerminologyValidation: true,
      dependencies: [],
    });

    this.register({
      resourceType: 'Location',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: false,
      requiresTerminologyValidation: true,
      dependencies: ['Organization'],
    });

    this.register({
      resourceType: 'Practitioner',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: false,
      requiresTerminologyValidation: true,
      dependencies: [],
    });

    this.register({
      resourceType: 'PractitionerRole',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: false,
      requiresTerminologyValidation: true,
      dependencies: ['Practitioner', 'Organization', 'Location'],
    });

    this.register({
      resourceType: 'Patient',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: false,
      requiresTerminologyValidation: true,
      dependencies: ['Organization'],
    });

    // Context
    this.register({
      resourceType: 'Coverage',
      supportedOperations: [FhirOperation.CREATE],
      supportsVersioning: false,
      supportsIncrementalPublish: false,
      requiresTerminologyValidation: true,
      dependencies: ['Patient', 'Organization'],
    });

    this.register({
      resourceType: 'Consent',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: false,
      requiresTerminologyValidation: true,
      dependencies: ['Patient', 'Organization'],
    });

    this.register({
      resourceType: 'Encounter',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: true,
      requiresTerminologyValidation: true,
      dependencies: ['Patient', 'Organization', 'Location', 'PractitionerRole'],
    });

    // Core Clinical
    this.register({
      resourceType: 'Condition',
      supportedOperations: [
        FhirOperation.CREATE,
        FhirOperation.UPDATE,
        FhirOperation.DELETE,
      ],
      supportsVersioning: true,
      supportsIncrementalPublish: true,
      requiresTerminologyValidation: true,
      dependencies: ['Patient', 'Encounter'],
    });

    this.register({
      resourceType: 'Observation',
      supportedOperations: [FhirOperation.CREATE, FhirOperation.UPDATE],
      supportsVersioning: true,
      supportsIncrementalPublish: true,
      requiresTerminologyValidation: true,
      dependencies: ['Patient', 'Encounter'],
    });

    // Additional resources would be registered similarly:
    // Procedure, ServiceRequest, DiagnosticReport, Specimen, MedicationRequest,
    // MedicationDispense, AllergyIntolerance, CarePlan, Immunization, Claim
  }

  register(capability: ResourceCapability) {
    this.capabilities.set(capability.resourceType, capability);
  }

  getCapability(resourceType: string): ResourceCapability | undefined {
    return this.capabilities.get(resourceType);
  }

  getAllCapabilities(): ResourceCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Sorts an array of resource types based on their registered dependencies.
   * Ensures that dependencies are built before the resources that depend on them.
   */
  getBuildOrder(resources: string[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (type: string) => {
      if (visited.has(type)) return;
      if (visiting.has(type)) {
        throw new Error(`Circular dependency detected involving ${type}`);
      }

      visiting.add(type);
      const cap = this.getCapability(type);
      if (cap) {
        for (const dep of cap.dependencies) {
          if (resources.includes(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(type);
      visited.add(type);
      sorted.push(type);
    };

    for (const res of resources) {
      visit(res);
    }

    return sorted;
  }
}
