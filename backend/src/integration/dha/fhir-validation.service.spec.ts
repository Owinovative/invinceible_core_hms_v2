import { FhirValidationService } from './fhir-validation.service';
import type { FhirBundle, FhirResource } from './fhir.types';

describe('FhirValidationService', () => {
  const validator = new FhirValidationService();
  const coding = {
    system: 'https://qa.example/fhir/terminology/CodeSystem/icd-11',
    code: 'CA40.0',
    display: 'Bacterial pneumonia',
  };

  function bundle(resources: FhirResource[]): FhirBundle {
    return {
      resourceType: 'Bundle',
      id: 'bundle-1',
      meta: {
        profile: ['https://qa.example/fhir/StructureDefinition/bundle|1.0.0'],
      },
      timestamp: '2026-07-01T09:00:00Z',
      type: resources.some((resource) => resource.resourceType === 'Claim')
        ? 'message'
        : 'transaction',
      entry: resources.map((resource) => ({
        fullUrl: `https://qa.example/fhir/${resource.resourceType}/${resource.id ?? resource.resourceType}`,
        resource,
      })),
    };
  }

  function claim(diagnosisCodeableConcept?: Record<string, unknown>) {
    return {
      resourceType: 'Claim',
      id: 'Claim',
      diagnosis:
        diagnosisCodeableConcept === undefined
          ? []
          : [{ diagnosisCodeableConcept }],
      patient: { reference: 'https://qa.example/fhir/Patient/Patient' },
      provider: {
        reference: 'https://qa.example/fhir/Organization/Organization',
      },
      careTeam: [
        {
          provider: {
            reference: 'https://qa.example/fhir/Practitioner/Practitioner',
          },
        },
      ],
      insurance: [
        {
          coverage: {
            reference: 'https://qa.example/fhir/Coverage/Coverage',
          },
        },
      ],
      billablePeriod: {
        start: '2026-07-01T08:00:00Z',
        end: '2026-07-01T09:00:00Z',
      },
      item: [
        {
          sequence: 1,
          servicedPeriod: {
            start: '2026-07-01T08:00:00Z',
            end: '2026-07-01T09:00:00Z',
          },
          productOrService: {
            coding: [
              {
                system: 'https://qa.example/fhir/CodeSystem/intervention-codes',
                code: 'SHA-12-004',
                display: 'Service',
              },
            ],
          },
          net: { value: 100 },
        },
      ],
      total: { value: 100, currency: 'KES' },
    } as unknown as FhirResource;
  }

  const claimResources = () =>
    [
      { resourceType: 'Patient', id: 'Patient' },
      { resourceType: 'Organization', id: 'Organization' },
      { resourceType: 'Coverage', id: 'Coverage' },
      { resourceType: 'Practitioner', id: 'Practitioner' },
    ] as FhirResource[];

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
          { resourceType: 'Coverage' },
          claim({ coding: [coding] }),
        ]),
      ),
    ).toThrow(
      'Missing required resource type for claim submission: Practitioner',
    );
  });

  it('requires a diagnosis concept or diagnosis text on claims', () => {
    const resources = claimResources();
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
    ).toThrow('must have an ICD-11 diagnosis code');
    expect(() =>
      validator.validateBundle(
        bundle([...resources, claim({ text: 'Pneumonia' })]),
      ),
    ).toThrow('must have an ICD-11 diagnosis code');
  });

  it('accepts a complete documented SHA message bundle', () => {
    expect(() =>
      validator.validateBundle(
        bundle([...claimResources(), claim({ coding: [coding] })]),
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
