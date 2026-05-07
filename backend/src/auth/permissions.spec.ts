import { roleHasPermission } from './permissions';

describe('roleHasPermission', () => {
  it('allows super admin to perform every critical permission', () => {
    expect(roleHasPermission('SUPER_ADMIN', 'mpesa.settings.update')).toBe(
      true,
    );
    expect(roleHasPermission('SUPER_ADMIN', 'payment.manual_confirm')).toBe(
      true,
    );
  });

  it('does not allow doctors to manually confirm payments', () => {
    expect(roleHasPermission('DOCTOR', 'payment.manual_confirm')).toBe(false);
  });

  it('allows cashiers to collect payments but not change M-PESA settings', () => {
    expect(roleHasPermission('CASHIER', 'payment.collect')).toBe(true);
    expect(roleHasPermission('CASHIER', 'mpesa.settings.update')).toBe(false);
  });
});
