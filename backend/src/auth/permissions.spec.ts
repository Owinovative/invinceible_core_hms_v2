import { roleHasPermission } from './permissions';

describe('role permissions', () => {
  it('allows super admin to manage platform settings', () => {
    expect(roleHasPermission('SUPER_ADMIN', 'facility.manage')).toBe(true);
    expect(roleHasPermission('SUPER_ADMIN', 'mpesa.settings.update')).toBe(
      true,
    );
  });

  it('prevents cashier from changing M-Pesa settings', () => {
    expect(roleHasPermission('CASHIER', 'payment.collect')).toBe(true);
    expect(roleHasPermission('CASHIER', 'mpesa.settings.update')).toBe(false);
  });

  it('prevents patient role from staff-only records', () => {
    expect(roleHasPermission('PATIENT', 'patient.portal.read')).toBe(true);
    expect(roleHasPermission('PATIENT', 'audit.read')).toBe(false);
  });
});
