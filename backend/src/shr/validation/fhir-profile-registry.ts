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
      name: 'HMS_Minimum_Patient',
      url: 'urn:invinceible:hms:fhir:minimum-patient',
      version: '1.0.0',
      validate: (resource: any) => {
        const errors: string[] = [];
        if (resource.resourceType !== 'Patient') return errors;

        const hasApprovedIdentifier = resource.identifier?.some(
          (identifier: any) => identifier?.system && identifier?.value,
        );
        if (!hasApprovedIdentifier) {
          errors.push(
            'Patient requires at least one system-qualified identifier.',
          );
        }
        if (!resource.name?.some((name: any) => name?.family || name?.text)) {
          errors.push('Patient requires a name.');
        }
        if (!resource.birthDate) errors.push('Patient requires birthDate.');

        return errors;
      },
    });

    this.register({
      name: 'HMS_Minimum_Encounter',
      url: 'urn:invinceible:hms:fhir:minimum-encounter',
      version: '1.0.0',
      validate: (resource: any) => {
        const errors: string[] = [];
        if (resource.resourceType !== 'Encounter') return errors;

        if (!resource.class || !resource.class.code) {
          errors.push('Encounter requires a class code.');
        }

        return errors;
      },
    });
    // Additional profiles...
  }

  register(profile: FhirProfile) {
    this.profiles.set(profile.name, profile);
    this.logger.debug(
      `Registered FHIR Profile: ${profile.name} (v${profile.version})`,
    );
  }

  getProfile(name: string): FhirProfile | undefined {
    return this.profiles.get(name);
  }

  validateResourceAgainstProfiles(resource: any): string[] {
    const allErrors: string[] = [];

    // These checks enforce the locally supported minimum. Formal DHA profile
    // validation remains an external certification/UAT gate.
    for (const profile of this.profiles.values()) {
      const errors = profile.validate(resource);
      allErrors.push(...errors);
    }

    return allErrors;
  }
}
