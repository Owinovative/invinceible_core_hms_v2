import { Injectable, Logger } from '@nestjs/common';
import { FhirProfileRegistry } from './fhir-profile-registry';

@Injectable()
export class ShrBundleValidator {
  private readonly logger = new Logger(ShrBundleValidator.name);

  constructor(private readonly profileRegistry: FhirProfileRegistry) {}

  async validate(bundle: any): Promise<void> {
    this.logger.log('Validating FHIR Bundle...');
    
    const errors: string[] = [];

    // 1. Basic Schema Validation (e.g. JSON schema / FHIR base validation)
    if (!bundle || bundle.resourceType !== 'Bundle') {
      errors.push('Payload is not a valid FHIR Bundle.');
    }

    if (bundle.type !== 'transaction') {
      errors.push('Bundle type must be transaction.');
    }

    // 2. Size Validation
    const payloadSize = Buffer.byteLength(JSON.stringify(bundle), 'utf8');
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (payloadSize > maxSize) {
      errors.push(`Bundle size (${payloadSize} bytes) exceeds maximum limit (${maxSize} bytes).`);
    }

    // 3. Circular Reference Validation
    if (this.hasCircularReferences(bundle)) {
      errors.push('Bundle contains circular references.');
    }

    // 4. Validate Profiles
    if (bundle.entry && Array.isArray(bundle.entry)) {
      for (const entry of bundle.entry) {
        if (entry.resource) {
          const profileErrors = this.profileRegistry.validateResourceAgainstProfiles(entry.resource);
          errors.push(...profileErrors);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`FHIR Bundle Validation failed: \n${errors.join('\n')}`);
    }

    this.logger.log('FHIR Bundle validation passed.');
  }

  private hasCircularReferences(obj: any): boolean {
    const seen = new WeakSet();
    const detect = (o: any) => {
      if (o !== null && typeof o === 'object') {
        if (seen.has(o)) return true;
        seen.add(o);
        for (const key in o) {
          if (detect(o[key])) return true;
        }
      }
      return false;
    };
    return detect(obj);
  }
}
