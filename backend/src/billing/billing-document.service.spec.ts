import { BillingDocumentService } from './billing-document.service';

describe('BillingDocumentService', () => {
  const service = new BillingDocumentService();

  it('creates a stable, invoice-specific public verification code', () => {
    const invoice = {
      id: 42,
      invoiceNumber: 'INV-000042',
      patientId: 9,
      facilityId: 3,
      issuedAt: new Date('2026-07-16T08:00:00.000Z'),
    };

    const first = service.buildVerificationCode(invoice);
    const second = service.buildVerificationCode({ ...invoice });

    expect(first).toBe(second);
    expect(first).toMatch(/^VAR-000042-[A-Z0-9]{4}$/);
    expect(
      service.buildVerificationCode({ ...invoice, patientId: 10 }),
    ).not.toBe(first);
  });
});
