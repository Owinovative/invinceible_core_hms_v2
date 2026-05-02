"use client";

import type { InvoiceRecord, InvoiceItemRecord } from "@/services/billing-service";
import { QrCodeImage } from "@/components/shared/qr-code-image";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  })
    .format(date)
    .replace(/ /g, "-");
}

function formatTime(value = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

function compactMoney(value?: number | null) {
  return `ksh${Number(value || 0).toFixed(1)}`;
}

function patientName(patient: InvoiceRecord["patient"]) {
  if (!patient) return "UNKNOWN PATIENT";
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function paymentLines(invoice: InvoiceRecord) {
  const paybill = invoice.branch?.mpesaPaybill || invoice.facility?.mpesaPaybill;
  const account =
    invoice.branch?.mpesaAccountNumber || invoice.facility?.mpesaAccountNumber;
  const till =
    invoice.branch?.mpesaTillNumber || invoice.facility?.mpesaTillNumber;
  const pochi =
    invoice.branch?.mpesaPochiNumber || invoice.facility?.mpesaPochiNumber;
  const lines = paybill || till || pochi ? ["Pay by Mpesa"] : [];

  if (paybill) {
    lines.push(`Paybill:${paybill}${account ? ` Account:${account}` : ""}`);
  }

  if (till) {
    lines.push(`Till:${till}`);
  }

  if (pochi) {
    lines.push(`Pochi La Biashara:${pochi}`);
  }

  lines.push("Thanks for visiting us!!");
  return lines;
}

function itemUnit(item: InvoiceItemRecord) {
  return (
    item.billingService?.category ||
    item.sourceModule ||
    (item.description.toLowerCase().includes("bed") ? "PER DIEM" : "EACH")
  ).toUpperCase();
}

export function PrintableInvoice({ invoice }: { invoice: InvoiceRecord }) {
  const items = (invoice.items ?? []).filter((item) => !item.isRemoved);
  const lines = paymentLines(invoice);
  const verificationCode =
    invoice.verificationCode ||
    `${invoice.invoiceNumber}-${String(invoice.id).padStart(6, "0")}`;
  const qrPayload = JSON.stringify({
    type: "invoice",
    invoiceNumber: invoice.invoiceNumber,
    verificationCode,
    facility: invoice.facility?.name,
    patient: {
      number: invoice.patient?.patientNumber,
      name: patientName(invoice.patient),
    },
    total: invoice.totalAmount,
    issuedAt: invoice.issuedAt,
    items: items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      amount: item.lineTotal,
      date: item.createdAt,
    })),
  });

  return (
    <div className="invoice-paper invoice-premium-paper">
      <header className="invoice-premium-head">
        <div className="invoice-premium-brand">
          <div className="invoice-premium-logo">
            {invoice.facility?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={invoice.facility.logoUrl} alt="" />
            ) : (
              <span>+</span>
            )}
          </div>
          <div>
            <h2>{(invoice.facility?.name || "Hospital Facility").toUpperCase()}</h2>
            <p>{[invoice.facility?.email, invoice.facility?.phone].filter(Boolean).join("  |  ")}</p>
            <p>{[invoice.facility?.address, invoice.facility?.town].filter(Boolean).join(", ")}</p>
          </div>
        </div>

        <div className="invoice-premium-title">
          <strong>INVOICE</strong>
          <QrCodeImage value={qrPayload} className="invoice-premium-qr" />
          <span>{verificationCode}</span>
        </div>
      </header>

      <section className="invoice-premium-meta">
        <div>
          <span>Patient</span>
          <b>{patientName(invoice.patient)}</b>
          <small>{invoice.patient?.patientNumber || invoice.invoiceNumber}</small>
        </div>
        <div>
          <span>Phone</span>
          <b>{invoice.patient?.phonePrimary || "-"}</b>
        </div>
        <div>
          <span>Invoice No.</span>
          <b>{invoice.invoiceNumber}</b>
        </div>
        <div>
          <span>Date</span>
          <b>{formatDate(invoice.issuedAt)}</b>
        </div>
      </section>

      <table className="invoice-premium-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th>Unit</th>
            <th>Qty</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatDate(item.createdAt)}</td>
              <td>{item.description}</td>
              <td>{itemUnit(item)}</td>
              <td>{item.quantity}</td>
              <td>{compactMoney(item.unitPrice)}</td>
              <td>{compactMoney(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-premium-bottom">
        <div className="invoice-premium-pay">
          <b>Payment</b>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <small>Served at {formatTime()}</small>
        </div>
        <div className="invoice-premium-totals">
          <p><span>Subtotal</span><b>{compactMoney(invoice.subtotal)}</b></p>
          <p><span>VAT</span><b>{compactMoney(invoice.taxAmount)}</b></p>
          <p><span>Discount</span><b>{compactMoney(invoice.discountAmount)}</b></p>
          <p className="grand"><span>Grand Total</span><b>{compactMoney(invoice.totalAmount)}</b></p>
        </div>
      </section>

      <footer className="invoice-premium-footer">
        <span>Items {items.length}</span>
        <span>Generated by Invinceible Core HMS</span>
      </footer>
    </div>
  );
}
