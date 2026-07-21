import { Injectable, Logger } from '@nestjs/common';
import { FhirProfileRegistry } from './fhir-profile-registry';

@Injectable()
export class ShrBundleValidator {
  private readonly logger = new Logger(ShrBundleValidator.name);

  constructor(private readonly profileRegistry: FhirProfileRegistry) {}

  validate(bundle: any): void {
    this.logger.log('Validating FHIR Bundle...');

    const errors: string[] = [];

    // 1. Basic Schema Validation (e.g. JSON schema / FHIR base validation)
    if (!bundle || bundle.resourceType !== 'Bundle') {
      errors.push('Payload is not a valid FHIR Bundle.');
    }

    if (bundle.type !== 'transaction') {
      errors.push('Bundle type must be transaction.');
    }

    if (!Array.isArray(bundle.entry) || bundle.entry.length === 0) {
      errors.push('Transaction Bundle must contain at least one entry.');
    }

    // 2. Size Validation
    const payloadSize = Buffer.byteLength(JSON.stringify(bundle), 'utf8');
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (payloadSize > maxSize) {
      errors.push(
        `Bundle size (${payloadSize} bytes) exceeds maximum limit (${maxSize} bytes).`,
      );
    }

    // 3. Circular Reference Validation
    if (this.hasCircularReferences(bundle)) {
      errors.push('Bundle contains circular references.');
    }

    // 4. Validate Profiles
    if (bundle.entry && Array.isArray(bundle.entry)) {
      const fullUrls = new Set<string>();
      for (const entry of bundle.entry) {
        if (!entry?.fullUrl || typeof entry.fullUrl !== 'string') {
          errors.push('Every Bundle entry requires fullUrl.');
          continue;
        }
        if (fullUrls.has(entry.fullUrl)) {
          errors.push(`Duplicate Bundle fullUrl: ${entry.fullUrl}.`);
        }
        fullUrls.add(entry.fullUrl);
        if (!entry.resource?.resourceType || !entry.resource?.id) {
          errors.push(
            `Bundle entry ${entry.fullUrl} requires resourceType and id.`,
          );
        }
        const expectedUrl = entry.resource
          ? `${entry.resource.resourceType}/${entry.resource.id}`
          : '';
        if (
          entry.request?.method !== 'PUT' ||
          entry.request?.url !== expectedUrl
        ) {
          errors.push(
            `Bundle entry ${entry.fullUrl} requires idempotent PUT ${expectedUrl}.`,
          );
        }
        if (entry.resource) {
          const profileErrors =
            this.profileRegistry.validateResourceAgainstProfiles(
              entry.resource,
            );
          errors.push(...profileErrors);
        }
      }
      for (const reference of this.collectUrnReferences(bundle)) {
        if (!fullUrls.has(reference)) {
          errors.push(`Unresolved internal Bundle reference: ${reference}.`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`FHIR Bundle Validation failed: \n${errors.join('\n')}`);
    }

    this.logger.log('FHIR Bundle validation passed.');
  }

  private collectUrnReferences(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.flatMap((entry) => this.collectUrnReferences(entry));
    }
    if (!value || typeof value !== 'object') return [];
    const object = value as Record<string, unknown>;
    const current =
      typeof object.reference === 'string' &&
      object.reference.startsWith('urn:uuid:')
        ? [object.reference]
        : [];
    return current.concat(
      Object.values(object).flatMap((entry) =>
        this.collectUrnReferences(entry),
      ),
    );
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
