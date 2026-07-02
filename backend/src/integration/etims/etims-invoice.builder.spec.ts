import {
  EtimsInvoiceBuilder,
  type BuilderInvoice,
} from './etims-invoice.builder';
import { EtimsValidationError } from './etims.types';

const TAX_OPTIONS = { defaultTaxCode: 'A' as const, vatRatePercent: 16 };

function makeInvoice(overrides: Partial<BuilderInvoice> = {}): BuilderInvoice {
  return {
    id: 7,
    invoiceNumber: 'INV-000007',
    totalAmount: 3500,
    issuedAt: new Date('2026-07-01T09:30:00'),
    patientName: 'Jane Wanjiku',
    patientPhone: '+254700000001',
    patientTaxPin: null,
    items: [
      {
        id: 11,
        description: 'General consultation',
        quantity: 1,
        unitPrice: 1500,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 1500,
        billingServiceCode: 'CONS-GEN',
      },
      {
        id: 12,
        description: 'Full haemogram',
        quantity: 2,
        unitPrice: 1000,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 2000,
        billingServiceCode: null,
      },
    ],
    ...overrides,
  };
}

describe('EtimsInvoiceBuilder', () => {
  const builder = new EtimsInvoiceBuilder();

  it('builds a SALE payload with exempt medical services', () => {
    const built = builder.buildSalePayload({
      etimsInvoiceId: 42,
      documentType: 'SALE',
      invoice: makeInvoice(),
      taxOptions: TAX_OPTIONS,
    });

    expect(built.payload.invcNo).toBe(42);
    expect(built.payload.orgInvcNo).toBe(0);
    expect(built.payload.rcptTyCd).toBe('S');
    expect(built.payload.salesTyCd).toBe('N');
    expect(built.payload.custNm).toBe('Jane Wanjiku');
    expect(built.payload.totItemCnt).toBe(2);
    expect(built.payload.taxblAmtA).toBe(3500);
    expect(built.payload.taxAmtA).toBe(0);
    expect(built.payload.totAmt).toBe(3500);
    expect(built.payload.totTaxAmt).toBe(0);
    expect(built.payload.salesDt).toBe('20260701');
    expect(built.totals.totalAmount).toBe(3500);
  });

  it('maps item-level fields including codes and sequence', () => {
    const built = builder.buildSalePayload({
      etimsInvoiceId: 42,
      documentType: 'SALE',
      invoice: makeInvoice(),
      taxOptions: TAX_OPTIONS,
    });

    expect(built.payload.itemList[0]).toMatchObject({
      itemSeq: 1,
      itemCd: 'CONS-GEN',
      itemNm: 'General consultation',
      qty: 1,
      prc: 1500,
      taxTyCd: 'A',
      taxblAmt: 1500,
      taxAmt: 0,
      totAmt: 1500,
    });
    // Items without a billing service code get a stable generated code.
    expect(built.payload.itemList[1].itemCd).toBe('HMS-ITEM-12');
    expect(built.payload.itemList[1].itemSeq).toBe(2);
  });

  it('builds a credit note referencing the original invoice number', () => {
    const built = builder.buildSalePayload({
      etimsInvoiceId: 43,
      documentType: 'CREDIT_NOTE',
      originalInvcNo: 42,
      invoice: makeInvoice(),
      taxOptions: TAX_OPTIONS,
      remark: 'Overcharged lab test',
    });

    expect(built.payload.rcptTyCd).toBe('R');
    expect(built.payload.orgInvcNo).toBe(42);
    expect(built.payload.remark).toBe('Overcharged lab test');
  });

  it('builds a debit note as an additional sale referencing the original', () => {
    const built = builder.buildSalePayload({
      etimsInvoiceId: 44,
      documentType: 'DEBIT_NOTE',
      originalInvcNo: 42,
      invoice: makeInvoice(),
      taxOptions: TAX_OPTIONS,
    });

    expect(built.payload.rcptTyCd).toBe('S');
    expect(built.payload.orgInvcNo).toBe(42);
  });

  it('rejects amendments without the original invoice number', () => {
    expect(() =>
      builder.buildSalePayload({
        etimsInvoiceId: 43,
        documentType: 'CREDIT_NOTE',
        invoice: makeInvoice(),
        taxOptions: TAX_OPTIONS,
      }),
    ).toThrow(EtimsValidationError);
  });

  it('rejects invoices with no items', () => {
    expect(() =>
      builder.buildSalePayload({
        etimsInvoiceId: 45,
        documentType: 'SALE',
        invoice: makeInvoice({ items: [] }),
        taxOptions: TAX_OPTIONS,
      }),
    ).toThrow(/no billable items/);
  });

  it('rejects items with non-positive quantities or negative amounts', () => {
    const badQty = makeInvoice();
    badQty.items[0] = { ...badQty.items[0], quantity: 0 };
    expect(() =>
      builder.buildSalePayload({
        etimsInvoiceId: 46,
        documentType: 'SALE',
        invoice: badQty,
        taxOptions: TAX_OPTIONS,
      }),
    ).toThrow(/non-positive quantity/);

    const negative = makeInvoice();
    negative.items[0] = { ...negative.items[0], lineTotal: -100 };
    expect(() =>
      builder.buildSalePayload({
        etimsInvoiceId: 47,
        documentType: 'SALE',
        invoice: negative,
        taxOptions: TAX_OPTIONS,
      }),
    ).toThrow(/negative amount/);
  });

  it('rejects items missing a description and invoices missing a number', () => {
    const blankDescription = makeInvoice();
    blankDescription.items[0] = {
      ...blankDescription.items[0],
      description: '  ',
    };
    expect(() =>
      builder.validate(blankDescription, blankDescription.items),
    ).toThrow(/missing a description/);

    expect(() =>
      builder.validate(makeInvoice({ invoiceNumber: '' }), []),
    ).toThrow(/missing an invoice number/);
  });

  it('rejects zero-total invoices', () => {
    const zero = makeInvoice();
    zero.items = [{ ...zero.items[0], lineTotal: 0 }];
    expect(() => builder.validate(zero, zero.items)).toThrow(
      /non-positive total/,
    );
  });

  it('supports partial amendments via itemsOverride', () => {
    const invoice = makeInvoice();
    const built = builder.buildSalePayload({
      etimsInvoiceId: 48,
      documentType: 'CREDIT_NOTE',
      originalInvcNo: 42,
      invoice,
      itemsOverride: [invoice.items[1]],
      taxOptions: TAX_OPTIONS,
    });
    expect(built.payload.totItemCnt).toBe(1);
    expect(built.payload.totAmt).toBe(2000);
  });
});
