import { FhirValidationService } from './fhir-validation.service';
import type { FhirBundle, FhirResource } from './fhir.types';

describe('FhirValidationService', () => {
  const validator = new FhirValidationService();
  const coding = {
    system: 'http://id.who.int/icd/release/11/mms',
    code: 'CA40.0',
    display: 'Bacterial pneumonia',
  };

  function bundle(resources: FhirResource[]): FhirBundle {
    return {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: resources.map((resource) => ({ resource })),
    };
  }

  function claim(diagnosisCodeableConcept?: Record<string, unknown>) {
    return {
      resourceType: 'Claim',
      diagnosis:
        diagnosisCodeableConcept === undefined
          ? []
          : [{ diagnosisCodeableConcept }],
    } as unknown as FhirResource;
  }

  it.each([
    [{}, 'at least one coding entry'],
    [{ coding: [{ ...coding, system: '' }] }, 'system is required'],
    [{ coding: [{ ...coding, code: '' }] }, 'code is required'],
    [{ coding: [{ ...coding, display: '' }] }, 'display is required'],
  ])('rejects incomplete codeable concepts', (concept, message) => {
    expect(() =>
      validator.validateCodeableConcept(concept, 'diagnosis'),
    ).toThrow(message);
  });

  it('accepts a complete codeable concept', () => {
    expect(() =>
      validator.validateCodeableConcept({ coding: [coding] }, 'diagnosis'),
    ).not.toThrow();
  });

  it('rejects malformed transaction bundle envelopes', () => {
    expect(() =>
      validator.validateBundle({
        resourceType: 'Patient',
      } as unknown as FhirBundle),
    ).toThrow('Root resource must be a Bundle');
    expect(() =>
      validator.validateBundle({
        resourceType: 'Bundle',
        type: 'collection',
        entry: [],
      } as FhirBundle),
    ).toThrow('Bundle type must be transaction');
    expect(() =>
      validator.validateBundle({
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [],
      }),
    ).toThrow('Bundle must contain at least one entry');
  });

  it('requires the complete claim resource set', () => {
    expect(() =>
      validator.validateBundle(
        bundle([{ resourceType: 'Organization' }, claim({ coding: [coding] })]),
      ),
    ).toThrow('Missing required resource type for claim submission: Patient');

    expect(() =>
      validator.validateBundle(
        bundle([
          { resourceType: 'Patient' },
          { resourceType: 'Organization' },
          {
            resourceType: 'Encounter',
            participant: [{}],
          } as FhirResource,
          claim({ coding: [coding] }),
        ]),
      ),
    ).toThrow(
      'Missing required resource type for claim submission: Practitioner',
    );
  });

  it('requires a diagnosis concept or diagnosis text on claims', () => {
    const resources = [
      { resourceType: 'Patient' },
      { resourceType: 'Organization' },
    ] as FhirResource[];
    expect(() =>
      validator.validateBundle(bundle([...resources, claim()])),
    ).toThrow('Claim must have at least one diagnosis');
    expect(() =>
      validator.validateBundle(
        bundle([
          ...resources,
          {
            resourceType: 'Claim',
            diagnosis: [{}],
          } as FhirResource,
        ]),
      ),
    ).toThrow('must have a diagnosisCodeableConcept');
    expect(() =>
      validator.validateBundle(bundle([...resources, claim({})])),
    ).toThrow('at minimum diagnosis text');
    expect(() =>
      validator.validateBundle(
        bundle([...resources, claim({ text: 'Pneumonia' })]),
      ),
    ).not.toThrow();
  });

  it('validates standalone encounter resource requirements', () => {
    expect(() =>
      validator.validateBundle(
        bundle([{ resourceType: 'Encounter' } as FhirResource]),
      ),
    ).toThrow(
      'Missing required resource type for encounter submission: Patient',
    );

    expect(() =>
      validator.validateBundle(
        bundle([
          { resourceType: 'Patient' },
          { resourceType: 'Organization' },
          { resourceType: 'Practitioner' },
          { resourceType: 'Encounter' },
        ] as FhirResource[]),
      ),
    ).not.toThrow();
  });
});
