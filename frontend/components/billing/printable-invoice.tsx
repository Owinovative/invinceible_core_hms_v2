"use client";

import type { InvoiceRecord, InvoiceItemRecord } from "@/services/billing-service";

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

function Barcode({ code }: { code: string }) {
  const bits = Array.from(code || "UNVERIFIED")
    .flatMap((char) =>
      char
        .charCodeAt(0)
        .toString(2)
        .padStart(7, "0")
        .split(""),
    )
    .slice(0, 74);

  return (
    <div className="invoice-barcode" aria-label={`VAR code ${code}`}>
      {bits.map((bit, index) => (
        <span
          key={`${bit}-${index}`}
          className={bit === "1" ? "bg-black" : "bg-transparent"}
        />
      ))}
    </div>
  );
}

function QrMark() {
  return (
    <div className="invoice-qr" aria-hidden="true">
      {Array.from({ length: 64 }).map((_, index) => (
        <span
          key={index}
          className={
            (index * 7 + Math.floor(index / 8) * 5) % 3 === 0
              ? "bg-white"
              : "bg-black"
          }
        />
      ))}
    </div>
  );
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

  return (
    <div className="invoice-paper">
      <header className="invoice-head">
        <div>
          <h2>{(invoice.facility?.name || "Hospital Facility").toUpperCase()}</h2>
          <div className="invoice-contact">
            {invoice.facility?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={invoice.facility.logoUrl} alt="" />
            ) : (
              <div className="invoice-logo-fallback">+</div>
            )}
            <div>
              <p>
                <span>Email:</span>{" "}
                <em>{invoice.facility?.email || "not recorded"}</em>
              </p>
              <p>
                <span>Tel:</span>{" "}
                <em>{invoice.facility?.phone || "not recorded"}</em>
              </p>
            </div>
          </div>

          <dl className="invoice-patient">
            <div>
              <dt>Patient&apos;s ID:</dt>
              <dd>{invoice.invoiceNumber}</dd>
            </div>
            <div>
              <dt>M/S:</dt>
              <dd>{patientName(invoice.patient)}</dd>
            </div>
            <div>
              <dt>Tel</dt>
              <dd>{invoice.patient?.phonePrimary || "+254-000-000-000"}</dd>
            </div>
            <div>
              <dt>DateOfAdmission</dt>
              <dd>{formatDate(invoice.issuedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="invoice-title-block">
          <p>INVOICE</p>
          <Barcode code={verificationCode} />
          <span>COLLECTION</span>
          <strong>Collection</strong>
        </div>
      </header>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Qty</th>
            <th>Unit</th>
            <th>Item</th>
            <th>Unitprice</th>
            <th>TotalPrice</th>
            <th>Vat%</th>
            <th>Disc</th>
            <th>V A T</th>
            <th>NetTotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <span>{`{${invoice.invoiceNumber};}`}</span>
                {item.quantity}
              </td>
              <td>{itemUnit(item)}</td>
              <td>{item.description}</td>
              <td>{compactMoney(item.unitPrice)}</td>
              <td>{Number(item.lineTotal || 0)}</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>
                <small>{formatDate(item.createdAt)}</small>
                <b>{Number(item.lineTotal || 0)}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-total-grid">
        <div className="invoice-payment-boxes">
          {["SHAPayable", "VAT", "Cash", "Paybill", "Amount"].map((label) => (
            <label key={label}>
              {label}
              <span>0</span>
            </label>
          ))}
        </div>
        <div className="invoice-totals">
          <label>
            This Invoice
            <span>{Number(invoice.totalAmount || 0)}</span>
          </label>
          <label>
            Subtotal
            <span>{Number(invoice.subtotal || 0)}</span>
          </label>
          <label>
            VAT
            <span>{Number(invoice.taxAmount || 0)}</span>
          </label>
          <label>
            Discount
            <span>{Number(invoice.discountAmount || 0)}</span>
          </label>
          <label>
            Grand Total
            <span>{Number(invoice.totalAmount || 0)}</span>
          </label>
        </div>
      </section>

      <footer className="invoice-footer">
        <div>
          <p>
            Note: Cold chain items cannot be returned for refund or any other
            reason
          </p>
          <div className="invoice-pay">
            <QrMark />
            <div>
              {lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <p className="invoice-served">
            <span>Served by</span>
            <b>{formatTime()}</b>
          </p>
        </div>
        <div className="invoice-system">
          <b>SYSTEM GENERATED BY INVINCEIBLE CORE HMS</b>
          <span>Official hospital invoice from approved billing lines.</span>
        </div>
      </footer>

      <div className="invoice-page-number">Page 1 of 1</div>
      <div className="invoice-item-count">Items&nbsp;&nbsp;&nbsp;{items.length}</div>
    </div>
  );
}
