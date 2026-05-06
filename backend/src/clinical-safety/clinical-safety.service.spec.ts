import { evaluateClinicalSafety } from './clinical-safety.service';

describe('evaluateClinicalSafety', () => {
  it('flags critical oxygen saturation', () => {
    const result = evaluateClinicalSafety({ oxygenSaturation: 88 });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OXYGEN_CRITICAL',
          severity: 'CRITICAL',
          requiresOverrideReason: true,
        }),
      ]),
    );
  });

  it('flags duplicate prescription entries', () => {
    const result = evaluateClinicalSafety({
      medicines: ['Amoxicillin', 'Paracetamol', 'amoxicillin'],
    });

    expect(result.some((item) => item.code === 'DUPLICATE_PRESCRIPTION')).toBe(
      true,
    );
  });
});
