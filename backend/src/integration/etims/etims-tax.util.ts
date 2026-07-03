import type { EtimsTaxCode } from './etims.types';

export interface TaxableLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  /** Optional explicit override, e.g. from a billing service category. */
  taxCode?: string;
}

export interface TaxOptions {
  /** Tax code applied when a line has no explicit override. */
  defaultTaxCode: EtimsTaxCode;
  /** Standard VAT rate percent for code B. */
  vatRatePercent: number;
}

export interface TaxBreakdown {
  taxableByCode: Record<EtimsTaxCode, number>;
  taxByCode: Record<EtimsTaxCode, number>;
  rateByCode: Record<EtimsTaxCode, number>;
  totalTaxable: number;
  totalTax: number;
  totalAmount: number;
}

export const REDUCED_VAT_RATE_PERCENT = 8;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeTaxCode(
  raw: string | undefined,
  fallback: EtimsTaxCode,
): EtimsTaxCode {
  const value = (raw ?? '').trim().toUpperCase();
  return value === 'A' ||
    value === 'B' ||
    value === 'C' ||
    value === 'D' ||
    value === 'E'
    ? (value as EtimsTaxCode)
    : fallback;
}

export function rateForCode(
  code: EtimsTaxCode,
  vatRatePercent: number,
): number {
  switch (code) {
    case 'B':
      return vatRatePercent;
    case 'E':
      return REDUCED_VAT_RATE_PERCENT;
    default:
      // A (exempt), C (zero rated), D (non-VAT) carry no VAT.
      return 0;
  }
}

/**
 * Computes the per-tax-code breakdown eTIMS requires. Line totals are
 * treated as VAT-inclusive for vatable codes (Kenyan retail convention), so
 * tax is extracted as total * r/(100+r).
 */
export function computeTaxBreakdown(
  lines: TaxableLine[],
  options: TaxOptions,
): TaxBreakdown {
  const taxableByCode: Record<EtimsTaxCode, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
  };
  const taxByCode: Record<EtimsTaxCode, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
  };

  for (const line of lines) {
    const code = normalizeTaxCode(line.taxCode, options.defaultTaxCode);
    const rate = rateForCode(code, options.vatRatePercent);
    const gross = roundMoney(line.lineTotal);
    const tax = rate > 0 ? roundMoney((gross * rate) / (100 + rate)) : 0;
    taxableByCode[code] = roundMoney(taxableByCode[code] + gross - tax);
    taxByCode[code] = roundMoney(taxByCode[code] + tax);
  }

  const rateByCode: Record<EtimsTaxCode, number> = {
    A: rateForCode('A', options.vatRatePercent),
    B: rateForCode('B', options.vatRatePercent),
    C: rateForCode('C', options.vatRatePercent),
    D: rateForCode('D', options.vatRatePercent),
    E: rateForCode('E', options.vatRatePercent),
  };

  const totalTaxable = roundMoney(
    Object.values(taxableByCode).reduce((sum, value) => sum + value, 0),
  );
  const totalTax = roundMoney(
    Object.values(taxByCode).reduce((sum, value) => sum + value, 0),
  );

  return {
    taxableByCode,
    taxByCode,
    rateByCode,
    totalTaxable,
    totalTax,
    totalAmount: roundMoney(totalTaxable + totalTax),
  };
}

export function taxForLine(
  line: TaxableLine,
  options: TaxOptions,
): { code: EtimsTaxCode; taxableAmount: number; taxAmount: number } {
  const code = normalizeTaxCode(line.taxCode, options.defaultTaxCode);
  const rate = rateForCode(code, options.vatRatePercent);
  const gross = roundMoney(line.lineTotal);
  const taxAmount = rate > 0 ? roundMoney((gross * rate) / (100 + rate)) : 0;
  return { code, taxableAmount: roundMoney(gross - taxAmount), taxAmount };
}
