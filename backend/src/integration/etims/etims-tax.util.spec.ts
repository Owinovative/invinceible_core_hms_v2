import {
  computeTaxBreakdown,
  normalizeTaxCode,
  rateForCode,
  roundMoney,
  taxForLine,
} from './etims-tax.util';

const OPTIONS = { defaultTaxCode: 'A' as const, vatRatePercent: 16 };

function line(lineTotal: number, taxCode?: string) {
  return {
    description: 'Item',
    quantity: 1,
    unitPrice: lineTotal,
    discountPercent: 0,
    discountAmount: 0,
    lineTotal,
    taxCode,
  };
}

describe('normalizeTaxCode', () => {
  it('accepts valid codes case-insensitively', () => {
    expect(normalizeTaxCode('a', 'B')).toBe('A');
    expect(normalizeTaxCode('E', 'A')).toBe('E');
  });

  it('falls back for missing or invalid codes', () => {
    expect(normalizeTaxCode(undefined, 'A')).toBe('A');
    expect(normalizeTaxCode('', 'B')).toBe('B');
    expect(normalizeTaxCode('Z', 'A')).toBe('A');
  });
});

describe('rateForCode', () => {
  it('maps codes to VAT rates', () => {
    expect(rateForCode('A', 16)).toBe(0);
    expect(rateForCode('B', 16)).toBe(16);
    expect(rateForCode('C', 16)).toBe(0);
    expect(rateForCode('D', 16)).toBe(0);
    expect(rateForCode('E', 16)).toBe(8);
  });
});

describe('roundMoney', () => {
  it('rounds to two decimal places', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(3.14159)).toBe(3.14);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe('computeTaxBreakdown', () => {
  it('treats medical services as VAT exempt by default (code A)', () => {
    const breakdown = computeTaxBreakdown([line(1500), line(2000)], OPTIONS);
    expect(breakdown.taxableByCode.A).toBe(3500);
    expect(breakdown.taxByCode.A).toBe(0);
    expect(breakdown.totalTax).toBe(0);
    expect(breakdown.totalAmount).toBe(3500);
  });

  it('extracts VAT from vatable lines as tax-inclusive amounts', () => {
    const breakdown = computeTaxBreakdown([line(1160, 'B')], OPTIONS);
    expect(breakdown.taxByCode.B).toBe(160);
    expect(breakdown.taxableByCode.B).toBe(1000);
    expect(breakdown.totalAmount).toBe(1160);
  });

  it('splits mixed baskets across tax codes', () => {
    const breakdown = computeTaxBreakdown(
      [line(3500), line(1160, 'B'), line(540, 'E')],
      OPTIONS,
    );
    expect(breakdown.taxableByCode.A).toBe(3500);
    expect(breakdown.taxByCode.B).toBe(160);
    expect(breakdown.taxByCode.E).toBe(40);
    expect(breakdown.totalTax).toBe(200);
    expect(breakdown.totalTaxable).toBe(5000);
    expect(breakdown.totalAmount).toBe(5200);
  });

  it('reports zero-rated and non-VAT lines without tax', () => {
    const breakdown = computeTaxBreakdown(
      [line(100, 'C'), line(200, 'D')],
      OPTIONS,
    );
    expect(breakdown.taxByCode.C).toBe(0);
    expect(breakdown.taxByCode.D).toBe(0);
    expect(breakdown.totalTax).toBe(0);
    expect(breakdown.totalAmount).toBe(300);
  });
});

describe('taxForLine', () => {
  it('returns per-line code and amounts', () => {
    expect(taxForLine(line(1160, 'B'), OPTIONS)).toEqual({
      code: 'B',
      taxableAmount: 1000,
      taxAmount: 160,
    });
    expect(taxForLine(line(500), OPTIONS)).toEqual({
      code: 'A',
      taxableAmount: 500,
      taxAmount: 0,
    });
  });
});
