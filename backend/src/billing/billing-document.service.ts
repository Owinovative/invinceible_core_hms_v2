import { Injectable } from '@nestjs/common';
import {
  addCompactDefinitionList,
  addCompactParagraph,
  addCompactTable,
  addSectionTitle,
  addTotalsPanel,
  createHospitalPdfBuffer,
  formatPdfMoney,
  patientName,
  staffName,
} from '../common/pdf/hospital-pdf';

type VerifiableInvoice = {
  id: number;
  invoiceNumber: string;
  patientId: number;
  facilityId: number;
  issuedAt?: Date | string | null;
};

type InvoicePrintItem = {
  createdAt?: Date | string | null;
  description?: string | null;
  billingService?: { category?: string | null } | null;
  sourceModule?: string | null;
  quantity?: number | null;
  discountPercent?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  isRemoved?: boolean | null;
};

/** Builds invoice and receipt documents from already-authorized billing data. */
@Injectable()
export class BillingDocumentService {
  buildVerificationCode(invoice: VerifiableInvoice) {
    const seed = [
      invoice.invoiceNumber,
      invoice.id,
      invoice.patientId,
      invoice.facilityId,
      invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : '',
    ].join('|');

    let checksum = 17;
    for (const char of seed) {
      checksum = (checksum * 31 + char.charCodeAt(0)) % 1679616;
    }

    return `VAR-${String(invoice.id).padStart(6, '0')}-${checksum
      .toString(36)
      .toUpperCase()
      .padStart(4, '0')}`;
  }

  createInvoicePdf(invoice: any) {
    const printableItems = (invoice.items ?? []).filter(
      (item: InvoicePrintItem) => item.isRemoved !== true,
    ) as InvoicePrintItem[];
    const verificationCode =
      invoice.verificationCode ?? this.buildVerificationCode(invoice);
    const paymentLines = this.invoicePaymentLines(invoice);
    const admittedAt =
      invoice.admission?.admittedAt ||
      invoice.appointment?.scheduledAt ||
      invoice.issuedAt;

    return createHospitalPdfBuffer(
      {
        title: 'Invoice',
        subtitle: invoice.invoiceNumber,
        reference: invoice.statusCode,
        verificationCode,
        facility: invoice.facility,
        branch: invoice.branch,
        compact: true,
        qrPayload: this.invoiceVerificationUrl(invoice, verificationCode),
      },
      (doc) => {
        addSectionTitle(doc, 'Patient and invoice details');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Patient', value: patientName(invoice.patient) },
            { label: 'Patient No.', value: invoice.patient?.patientNumber },
            { label: 'Phone', value: invoice.patient?.phonePrimary },
            { label: 'Invoice No.', value: invoice.invoiceNumber },
            { label: 'Date', value: invoice.issuedAt },
            { label: 'Visit/Admission', value: admittedAt },
            { label: 'Status', value: invoice.statusCode },
            { label: 'Branch', value: invoice.branch?.name },
          ],
          4,
        );

        addSectionTitle(doc, 'Invoice items');
        addCompactTable<InvoicePrintItem>(
          doc,
          [
            {
              header: 'Date',
              width: 58,
              render: (item) => this.shortInvoiceDate(item.createdAt),
            },
            { header: 'Item', width: 206, render: (item) => item.description },
            {
              header: 'Unit',
              width: 50,
              render: (item) =>
                (
                  item.billingService?.category ||
                  item.sourceModule ||
                  'EACH'
                ).toUpperCase(),
            },
            {
              header: 'Qty',
              width: 34,
              render: (item) => Number(item.quantity || 0),
            },
            {
              header: 'Disc',
              width: 44,
              render: (item) => `${Number(item.discountPercent || 0)}%`,
            },
            {
              header: 'Price',
              width: 62,
              render: (item) => this.compactMoney(item.unitPrice),
            },
            {
              header: 'Total',
              width: 72,
              render: (item) => this.compactMoney(item.lineTotal),
            },
          ],
          printableItems,
          'No active invoice items recorded.',
        );

        addSectionTitle(doc, 'Payment instructions and totals');
        addTotalsPanel(
          doc,
          [
            { label: 'Subtotal', value: this.compactMoney(invoice.subtotal) },
            { label: 'VAT', value: this.compactMoney(invoice.taxAmount) },
            {
              label: 'Discount',
              value: this.compactMoney(invoice.discountAmount),
            },
            {
              label: 'Grand Total',
              value: this.compactMoney(invoice.totalAmount),
            },
            { label: 'Paid', value: this.compactMoney(invoice.amountPaid) },
            {
              label: 'Balance',
              value: this.compactMoney(invoice.balanceAmount),
            },
          ],
          'Invoice totals',
        );
        addCompactParagraph(
          doc,
          'Payment',
          paymentLines.length
            ? paymentLines.join('\n')
            : 'Payment is received at the cashier desk. Thank you for visiting.',
        );
        addCompactParagraph(
          doc,
          'Invoice note',
          `Items: ${printableItems.length}. Served at ${this.timeOnly(new Date())}.`,
        );
      },
    );
  }

  createPaymentReceiptPdf(payment: any) {
    const currency =
      payment.facility?.currency || payment.branch?.currency || 'KES';
    const verificationCode = this.buildVerificationCode(payment.invoice);

    return createHospitalPdfBuffer(
      {
        title: 'Payment Receipt',
        subtitle: payment.receiptNumber,
        reference: payment.invoice?.invoiceNumber,
        verificationCode,
        facility: payment.facility ?? payment.invoice?.facility,
        branch: payment.branch ?? payment.invoice?.branch,
        compact: true,
        qrPayload: this.invoiceVerificationUrl(
          payment.invoice,
          verificationCode,
        ),
      },
      (doc) => {
        addSectionTitle(doc, 'Receipt details');
        addCompactDefinitionList(
          doc,
          [
            { label: 'Receipt No.', value: payment.receiptNumber },
            { label: 'Invoice No.', value: payment.invoice?.invoiceNumber },
            { label: 'Patient', value: patientName(payment.invoice?.patient) },
            { label: 'Method', value: payment.paymentMethod },
            {
              label: 'Reference',
              value: payment.mpesaReceiptNumber || payment.transactionRef,
            },
            { label: 'Paid At', value: payment.paidAt },
            { label: 'Received By', value: staffName(payment.receivedBy) },
            { label: 'Status', value: payment.statusCode },
          ],
          2,
        );
        addTotalsPanel(
          doc,
          [
            {
              label: 'Amount',
              value: formatPdfMoney(Number(payment.amount), currency),
            },
            {
              label: 'Invoice Balance',
              value: formatPdfMoney(
                Number(payment.invoice?.balanceAmount ?? 0),
                currency,
              ),
            },
          ],
          'Amount received',
        );
        addCompactParagraph(
          doc,
          'Receipt note',
          'This receipt confirms a payment recorded against the invoice above. Keep this copy for reconciliation.',
        );
      },
    );
  }

  private invoiceVerificationUrl(invoice: any, verificationCode: string) {
    const baseUrl =
      process.env.FRONTEND_PUBLIC_URL ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3001';
    const url = new URL('/invoice-verify', baseUrl);
    url.searchParams.set('invoice', invoice.invoiceNumber);
    url.searchParams.set('code', verificationCode);
    url.searchParams.set('facility', invoice.facility?.name ?? '');
    url.searchParams.set('patient', patientName(invoice.patient));
    url.searchParams.set('total', String(Number(invoice.totalAmount ?? 0)));
    return url.toString();
  }

  private invoicePaymentLines(invoice: any) {
    const facility = invoice.facility ?? {};
    const branch = invoice.branch ?? {};
    const paybill = branch.mpesaPaybill || facility.mpesaPaybill;
    const account = branch.mpesaAccountNumber || facility.mpesaAccountNumber;
    const till = branch.mpesaTillNumber || facility.mpesaTillNumber;
    const pochi = branch.mpesaPochiNumber || facility.mpesaPochiNumber;
    const lines =
      (facility.showPaybillOnInvoice !== false && paybill) ||
      (facility.showTillOnInvoice !== false && till) ||
      (facility.showPochiOnInvoice !== false && pochi)
        ? ['Pay by M-PESA']
        : [];

    if (facility.showPaybillOnInvoice !== false && paybill) {
      lines.push(`Paybill:${paybill}${account ? ` Account:${account}` : ''}`);
    }
    if (facility.showTillOnInvoice !== false && till)
      lines.push(`Till:${till}`);
    if (facility.showPochiOnInvoice !== false && pochi) {
      lines.push(`Pochi La Biashara:${pochi}`);
    }
    if (facility.showCashOnInvoice !== false) {
      lines.push('Cash payments are receipted at the cashier desk.');
    }
    lines.push('Thank you for visiting.');
    return lines;
  }

  private shortInvoiceDate(value?: string | Date | null) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    })
      .format(date)
      .replace(/ /g, '-');
  }

  private timeOnly(value: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(value);
  }

  private compactMoney(value?: number | null) {
    return `ksh${Number(value || 0).toFixed(1)}`;
  }
}
