import { Injectable } from '@nestjs/common';
import {
  ETIMS_DOCUMENT_TYPE,
  type EtimsDocumentType,
} from '../integration.constants';
import {
  computeTaxBreakdown,
  roundMoney,
  taxForLine,
  type TaxOptions,
  type TaxableLine,
} from './etims-tax.util';
import {
  EtimsValidationError,
  type EtimsSaleItem,
  type EtimsSalesPayload,
} from './etims.types';

export interface BuilderInvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  sourceModule?: string | null;
  billingServiceCode?: string | null;
  taxCode?: string | null;
}

export interface BuilderInvoice {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  issuedAt: Date;
  patientName?: string | null;
  patientPhone?: string | null;
  patientTaxPin?: string | null;
  items: BuilderInvoiceItem[];
}

export interface BuildSaleParams {
  /** eTIMS document id, used as the numeric CU invoice number (invcNo). */
  etimsInvoiceId: number;
  documentType: EtimsDocumentType;
  /** invcNo of the original SALE when building credit/debit notes. */
  originalInvcNo?: number;
  invoice: BuilderInvoice;
  paymentTypeCode?: string;
  taxOptions: TaxOptions;
  remark?: string;
  /**
   * For partial credit notes: subset of invoice items (already snapshotted
   * with the amounts to reverse). Defaults to all invoice items.
   */
  itemsOverride?: BuilderInvoiceItem[];
}

export interface BuiltSale {
  payload: EtimsSalesPayload;
  totals: {
    totalTaxable: number;
    totalTax: number;
    totalAmount: number;
  };
  taxBreakdown: Record<string, unknown>;
}

function formatEtimsDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Maps an HMS invoice to the eTIMS sales payload. Pure transformation +
 * validation; it performs no I/O so it is fully unit-testable.
 */
@Injectable()
export class EtimsInvoiceBuilder {
  validate(invoice: BuilderInvoice, items: BuilderInvoiceItem[]): void {
    if (!invoice.invoiceNumber?.trim()) {
      throw new EtimsValidationError('Invoice is missing an invoice number');
    }
    if (items.length === 0) {
      throw new EtimsValidationError(
        `Invoice ${invoice.invoiceNumber} has no billable items to fiscalize`,
      );
    }
    for (const item of items) {
      if (!item.description?.trim()) {
        throw new EtimsValidationError(
          `Invoice ${invoice.invoiceNumber} item ${item.id} is missing a description`,
        );
      }
      if (item.quantity <= 0) {
        throw new EtimsValidationError(
          `Invoice ${invoice.invoiceNumber} item ${item.id} has a non-positive quantity`,
        );
      }
      if (item.lineTotal < 0 || item.unitPrice < 0) {
        throw new EtimsValidationError(
          `Invoice ${invoice.invoiceNumber} item ${item.id} has a negative amount`,
        );
      }
    }
    const total = roundMoney(
      items.reduce((sum, item) => sum + item.lineTotal, 0),
    );
    if (total <= 0) {
      throw new EtimsValidationError(
        `Invoice ${invoice.invoiceNumber} has a non-positive total and cannot be fiscalized`,
      );
    }
  }

  buildSalePayload(params: BuildSaleParams): BuiltSale {
    const items = params.itemsOverride ?? params.invoice.items;
    this.validate(params.invoice, items);

    if (
      params.documentType !== ETIMS_DOCUMENT_TYPE.SALE &&
      !params.originalInvcNo
    ) {
      throw new EtimsValidationError(
        `${params.documentType} requires the original eTIMS invoice number`,
      );
    }

    const lines: TaxableLine[] = items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
      taxCode: item.taxCode ?? undefined,
    }));

    const breakdown = computeTaxBreakdown(lines, params.taxOptions);
    const now = new Date();

    const itemList: EtimsSaleItem[] = items.map((item, index) => {
      const line = lines[index];
      const { code, taxableAmount, taxAmount } = taxForLine(
        line,
        params.taxOptions,
      );
      return {
        itemSeq: index + 1,
        itemCd: item.billingServiceCode?.trim() || `HMS-ITEM-${item.id}`,
        // UNSPSC-style class for healthcare services; refined per item in
        // a future item-catalog sync.
        itemClsCd: '85121800',
        itemNm: item.description.slice(0, 200),
        qty: item.quantity,
        prc: roundMoney(item.unitPrice),
        splyAmt: roundMoney(item.lineTotal),
        dcRt: roundMoney(item.discountPercent),
        dcAmt: roundMoney(item.discountAmount),
        taxTyCd: code,
        taxblAmt: taxableAmount,
        taxAmt: taxAmount,
        totAmt: roundMoney(item.lineTotal),
      };
    });

    const isCreditNote =
      params.documentType === ETIMS_DOCUMENT_TYPE.CREDIT_NOTE;

    const payload: EtimsSalesPayload = {
      invcNo: params.etimsInvoiceId,
      orgInvcNo: params.originalInvcNo ?? 0,
      custTin: params.invoice.patientTaxPin?.trim() || null,
      custNm: params.invoice.patientName?.trim() || null,
      salesTyCd: 'N',
      rcptTyCd: isCreditNote ? 'R' : 'S',
      pmtTyCd: params.paymentTypeCode ?? '01',
      salesSttsCd: '02',
      cfmDt: formatEtimsDate(now),
      salesDt: formatEtimsDate(params.invoice.issuedAt ?? now).slice(0, 8),
      totItemCnt: itemList.length,
      taxblAmtA: breakdown.taxableByCode.A,
      taxblAmtB: breakdown.taxableByCode.B,
      taxblAmtC: breakdown.taxableByCode.C,
      taxblAmtD: breakdown.taxableByCode.D,
      taxblAmtE: breakdown.taxableByCode.E,
      taxRtA: breakdown.rateByCode.A,
      taxRtB: breakdown.rateByCode.B,
      taxRtC: breakdown.rateByCode.C,
      taxRtD: breakdown.rateByCode.D,
      taxRtE: breakdown.rateByCode.E,
      taxAmtA: breakdown.taxByCode.A,
      taxAmtB: breakdown.taxByCode.B,
      taxAmtC: breakdown.taxByCode.C,
      taxAmtD: breakdown.taxByCode.D,
      taxAmtE: breakdown.taxByCode.E,
      totTaxblAmt: breakdown.totalTaxable,
      totTaxAmt: breakdown.totalTax,
      totAmt: breakdown.totalAmount,
      prchrAcptcYn: 'N',
      remark: params.remark?.slice(0, 400),
      receipt: {
        custMblNo: params.invoice.patientPhone?.trim() || null,
        rcptPbctDt: formatEtimsDate(now),
        prchrAcptcYn: 'N',
      },
      itemList,
    };

    return {
      payload,
      totals: {
        totalTaxable: breakdown.totalTaxable,
        totalTax: breakdown.totalTax,
        totalAmount: breakdown.totalAmount,
      },
      taxBreakdown: {
        taxableByCode: breakdown.taxableByCode,
        taxByCode: breakdown.taxByCode,
        rateByCode: breakdown.rateByCode,
      },
    };
  }
}
