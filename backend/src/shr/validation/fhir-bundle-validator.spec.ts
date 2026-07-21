import { FhirProfileRegistry } from './fhir-profile-registry';
import { ShrBundleValidator } from './fhir-bundle-validator';

describe('ShrBundleValidator', () => {
  const validator = new ShrBundleValidator(new FhirProfileRegistry());
  const patientId = 'f9ba5969-050f-4eaa-8e0a-648740b4306c';

  function validBundle() {
    return {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          fullUrl: `urn:uuid:${patientId}`,
          resource: {
            resourceType: 'Patient',
            id: patientId,
            identifier: [
              { system: 'urn:invinceible:hms:patient', value: 'PAT-1' },
            ],
            name: [{ family: 'Demo', given: ['Amina'] }],
            birthDate: '1990-05-15',
          },
          request: { method: 'PUT', url: `Patient/${patientId}` },
        },
      ],
    };
  }

  it('accepts a structurally valid idempotent transaction bundle', () => {
    expect(() => validator.validate(validBundle())).not.toThrow();
  });

  it('rejects empty bundles and non-idempotent entry requests', () => {
    expect(() =>
      validator.validate({
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [],
      }),
    ).toThrow('at least one entry');

    const bundle = validBundle();
    bundle.entry[0].request = { method: 'POST', url: 'Patient' };
    expect(() => validator.validate(bundle)).toThrow('idempotent PUT');
  });

  it('rejects unresolved internal references', () => {
    const bundle = validBundle();
    Object.assign(bundle.entry[0].resource, {
      managingOrganization: { reference: 'urn:uuid:missing' },
    });
    expect(() => validator.validate(bundle)).toThrow(
      'Unresolved internal Bundle reference',
    );
  });
});
