import { scorePatientDuplicate } from './patient.service';

describe('scorePatientDuplicate', () => {
  it('scores strong duplicate evidence', () => {
    const result = scorePatientDuplicate(
      {
        firstName: 'Ann',
        lastName: 'Otieno',
        phonePrimary: '+254711000000',
        dateOfBirth: '2000-01-01',
      },
      {
        firstName: 'ann',
        lastName: 'otieno',
        phonePrimary: '0711000000',
        dateOfBirth: new Date('2000-01-01'),
      },
    );

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasons).toEqual(
      expect.arrayContaining(['same phone number', 'same date of birth']),
    );
  });
});
