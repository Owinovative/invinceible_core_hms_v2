import { Injectable, Logger } from '@nestjs/common';

export interface FhirProfile {
  name: string;
  url: string;
  version: string;
  validate(resource: any): string[]; // Returns array of validation error messages
}

@Injectable()
export class FhirProfileRegistry {
  private readonly logger = new Logger(FhirProfileRegistry.name);
  private profiles = new Map<string, FhirProfile>();

  constructor() {
    this.registerKenyaProfiles();
  }

  private registerKenyaProfiles() {
    this.register({
      name: 'Kenya_Patient_Profile',
      url: 'http://dha.go.ke/fhir/StructureDefinition/kenya-patient',
      version: '1.0.0',
      validate: (resource: any) => {
        const errors: string[] = [];
        if (resource.resourceType !== 'Patient') return errors;
        
        // Ensure National ID extension exists
        const hasNationalId = resource.identifier?.some((id: any) => 
          id.system === 'http://dha.go.ke/identifiers/national-id'
        );
        if (!hasNationalId) {
          errors.push('Kenya_Patient_Profile requires a National ID identifier.');
        }

        return errors;
      }
    });

    this.register({
      name: 'Kenya_Encounter_Profile',
      url: 'http://dha.go.ke/fhir/StructureDefinition/kenya-encounter',
      version: '1.0.0',
      validate: (resource: any) => {
        const errors: string[] = [];
        if (resource.resourceType !== 'Encounter') return errors;
        
        if (!resource.class || !resource.class.code) {
          errors.push('Kenya_Encounter_Profile requires a class code.');
        }

        return errors;
      }
    });
    // Additional profiles...
  }

  register(profile: FhirProfile) {
    this.profiles.set(profile.name, profile);
    this.logger.debug(`Registered FHIR Profile: ${profile.name} (v${profile.version})`);
  }

  getProfile(name: string): FhirProfile | undefined {
    return this.profiles.get(name);
  }

  validateResourceAgainstProfiles(resource: any): string[] {
    const allErrors: string[] = [];
    
    // In a real FHIR validator, this would look at resource.meta.profile
    // and invoke the corresponding profile validators.
    
    // For now, run all registered profiles that match the resourceType
    for (const profile of this.profiles.values()) {
      const errors = profile.validate(resource);
      allErrors.push(...errors);
    }

    return allErrors;
  }
}
