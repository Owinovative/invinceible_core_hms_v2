import {
  calculateOtcPaymentSummary,
  stockStatus,
} from './otc-sales.service';
import { ROLE_PERMISSIONS } from '../auth/permissions';

describe('OTC sales helpers', () => {
  it('does not count pending insurance as paid', () => {
    const summary = calculateOtcPaymentSummary(1000, [
      {
        paymentMethod: 'INSURANCE',
        statusCode: 'PENDING',
        insuranceCoveredAmount: 1000,
        insuranceClaimStatus: 'PENDING_APPROVAL',
      },
    ]);

    expect(summary).toEqual({
      paidAmount: 0,
      balanceAmount: 1000,
      paymentStatus: 'PENDING_INSURANCE',
    });
  });

  it('supports mixed approved insurance and cash payment totals', () => {
    const summary = calculateOtcPaymentSummary(1000, [
      {
        paymentMethod: 'INSURANCE',
        statusCode: 'COMPLETED',
        insuranceCoveredAmount: 700,
        insuranceClaimStatus: 'APPROVED',
      },
      {
        paymentMethod: 'CASH',
        statusCode: 'COMPLETED',
        amount: 300,
      },
    ]);

    expect(summary).toEqual({
      paidAmount: 1000,
      balanceAmount: 0,
      paymentStatus: 'PAID',
    });
  });

  it('does not count rejected insurance as paid', () => {
    const summary = calculateOtcPaymentSummary(1200, [
      {
        paymentMethod: 'INSURANCE',
        statusCode: 'COMPLETED',
        insuranceCoveredAmount: 1200,
        insuranceClaimStatus: 'REJECTED',
      },
    ]);

    expect(summary).toEqual({
      paidAmount: 0,
      balanceAmount: 1200,
      paymentStatus: 'UNPAID',
    });
  });

  it('grants OTC sale permission only to operational billing and pharmacy roles', () => {
    for (const role of [
      'SUPER_ADMIN',
      'ADMIN',
      'FACILITY_ADMIN',
      'BRANCH_ADMIN',
      'PHARMACIST',
      'PHARMACY_MANAGER',
      'CASHIER',
      'BILLING_OFFICER',
    ]) {
      expect(ROLE_PERMISSIONS[role]).toContain('otc.sale');
    }

    expect(ROLE_PERMISSIONS.DOCTOR).not.toContain('otc.sale');
    expect(ROLE_PERMISSIONS.PATIENT).not.toContain('otc.sale');
  });

  it('reports branch stock status consistently', () => {
    expect(stockStatus(0, 10)).toBe('OUT_OF_STOCK');
    expect(stockStatus(5, 10)).toBe('LOW_STOCK');
    expect(stockStatus(20, 10)).toBe('IN_STOCK');
  });
});
